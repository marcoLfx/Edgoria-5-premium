-- EDGORIA 5.6 / manual payment verification. Run only after DB backup, in Preview project first.
-- Does NOT create wallets, move funds or grant access from a browser request.
create table if not exists public.edgoria_manual_subscriptions (
 user_id uuid primary key references auth.users(id) on delete cascade,
 status text not null default 'active' check(status in ('active','revoked')),
 plan_code text not null default 'edgoria_pro_monthly' check(plan_code='edgoria_pro_monthly'),
 price_usd_cents integer not null check(price_usd_cents in (1099,1499)),
 payment_method text not null default 'USDT' check(payment_method='USDT'),
 payment_reference text not null unique check(char_length(payment_reference) between 8 and 160),
 starts_at timestamptz not null,
 expires_at timestamptz not null,
 verified_by uuid not null references auth.users(id),
 verified_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 check(expires_at > starts_at)
);
create index if not exists edgoria_manual_subscription_expiry on public.edgoria_manual_subscriptions(expires_at);
alter table public.edgoria_manual_subscriptions enable row level security;
revoke all on public.edgoria_manual_subscriptions from anon,authenticated;
grant select on public.edgoria_manual_subscriptions to authenticated;
drop policy if exists edgoria_manual_subscriptions_owner_read on public.edgoria_manual_subscriptions;
create policy edgoria_manual_subscriptions_owner_read on public.edgoria_manual_subscriptions for select to authenticated using (user_id=(select auth.uid()));

-- Immutable audit of verified receipt and revocation, service-role writes only.
create table if not exists public.edgoria_manual_payment_audit (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id),
 admin_id uuid not null references auth.users(id),
 action text not null check(action in ('verify','revoke')),
 reference text unique,
 amount_usd_cents integer,
 period_end timestamptz,
 occurred_at timestamptz not null default now()
);
alter table public.edgoria_manual_payment_audit enable row level security;
revoke all on public.edgoria_manual_payment_audit from anon,authenticated;

-- Transaction-level guard against simultaneous fifth/sixth MT5 link requests.
create schema if not exists edgoria_internal;
create or replace function edgoria_internal.enforce_five_mt5_links() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(new.user_id::text)::bigint);
 if (select count(*) from public.edgoria_mt5_connections where user_id=new.user_id)>=5 then
   raise exception 'Maximum 5 MT5 connections per user';
 end if;
 return new;
end $$;
drop trigger if exists edgoria_five_mt5_links on public.edgoria_mt5_connections;
create trigger edgoria_five_mt5_links before insert on public.edgoria_mt5_connections
for each row execute function edgoria_internal.enforce_five_mt5_links();

-- Service-only atomic payment verification and access activation.
create or replace function public.edgoria_record_usdt_payment(
 p_user_id uuid,p_admin_id uuid,p_reference text,p_amount_cents integer
) returns timestamptz language plpgsql security invoker set search_path = '' as $$
declare v_start timestamptz;v_end timestamptz;
begin
 if p_user_id=p_admin_id then raise exception 'Cannot self-authorize'; end if;
 if p_amount_cents not in (1099,1499) then raise exception 'Invalid price'; end if;
 if p_reference is null or char_length(p_reference) not between 8 and 160 then raise exception 'Reference invalid'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_user_id::text)::bigint);
 select greatest(pg_catalog.now(),expires_at) into v_start
 from public.edgoria_manual_subscriptions where user_id=p_user_id and status='active';
 v_start:=coalesce(v_start,pg_catalog.now());
 v_end:=v_start+interval '1 month';
 insert into public.edgoria_manual_payment_audit(user_id,admin_id,action,reference,amount_usd_cents,period_end)
 values(p_user_id,p_admin_id,'verify',p_reference,p_amount_cents,v_end);
 insert into public.edgoria_manual_subscriptions(user_id,status,price_usd_cents,payment_reference,starts_at,expires_at,verified_by,verified_at)
 values(p_user_id,'active',p_amount_cents,p_reference,v_start,v_end,p_admin_id,pg_catalog.now())
 on conflict(user_id) do update set status='active',price_usd_cents=excluded.price_usd_cents,payment_reference=excluded.payment_reference,
 starts_at=excluded.starts_at,expires_at=excluded.expires_at,verified_by=excluded.verified_by,verified_at=excluded.verified_at,updated_at=pg_catalog.now();
 insert into public.edgoria_v4_access_grants(user_id,access_status,updated_by,updated_at)
 values(p_user_id,'active',p_admin_id,pg_catalog.now())
 on conflict(user_id) do update set access_status='active',updated_by=excluded.updated_by,updated_at=excluded.updated_at;
 return v_end;
end $$;
revoke all on function public.edgoria_record_usdt_payment(uuid,uuid,text,integer) from public,anon,authenticated;
grant execute on function public.edgoria_record_usdt_payment(uuid,uuid,text,integer) to service_role;

create or replace function public.edgoria_revoke_usdt_payment(p_user_id uuid,p_admin_id uuid)
returns boolean language plpgsql security invoker set search_path = '' as $$
begin
 if p_user_id=p_admin_id then raise exception 'Cannot self-revoke'; end if;
 update public.edgoria_manual_subscriptions set status='revoked',updated_at=pg_catalog.now() where user_id=p_user_id;
 if not found then raise exception 'No manual subscription'; end if;
 insert into public.edgoria_manual_payment_audit(user_id,admin_id,action)
 values(p_user_id,p_admin_id,'revoke');
 update public.edgoria_v4_access_grants set access_status='suspended',updated_by=p_admin_id,updated_at=pg_catalog.now() where user_id=p_user_id;
 return true;
end $$;
revoke all on function public.edgoria_revoke_usdt_payment(uuid,uuid) from public,anon,authenticated;
grant execute on function public.edgoria_revoke_usdt_payment(uuid,uuid) to service_role;
