-- EDGORIA 5.9: access entitlements independent of payment records.
-- RUN IN A TEST PROJECT FIRST. Does not modify or delete existing members or payments.
-- All access writes happen through service-role-only RPCs; frontend never writes entitlements.

create table if not exists public.edgoria_access_periods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check(kind in ('trial','monthly')),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'active' check(status in ('active','revoked')),
  granted_by uuid not null references auth.users(id),
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  check(ends_at>starts_at)
);
create index if not exists edgoria_access_user on public.edgoria_access_periods(user_id,starts_at desc);
create index if not exists edgoria_access_calendar on public.edgoria_access_periods(starts_at,ends_at);
create unique index if not exists edgoria_one_trial_per_user on public.edgoria_access_periods(user_id) where kind='trial';
alter table public.edgoria_access_periods enable row level security;
revoke all on public.edgoria_access_periods from public,anon,authenticated;
grant select on public.edgoria_access_periods to authenticated;
grant select,insert,update on public.edgoria_access_periods to service_role;
drop policy if exists edgoria_access_owner_select on public.edgoria_access_periods;
create policy edgoria_access_owner_select on public.edgoria_access_periods for select to authenticated
  using(user_id=(select auth.uid()));

create table if not exists public.edgoria_archived_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  archived_by uuid not null references auth.users(id),
  archived_at timestamptz not null default now(),
  reason text not null default 'Retirado desde el panel administrativo'
);
alter table public.edgoria_archived_users enable row level security;
revoke all on public.edgoria_archived_users from public,anon,authenticated;
grant select,insert,delete on public.edgoria_archived_users to service_role;

create table if not exists public.edgoria_admin_access_audit (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  admin_id uuid not null,
  action text not null check(action in ('trial','monthly','suspend','archive','restore')),
  access_period_id uuid,
  occurred_at timestamptz not null default now()
);
alter table public.edgoria_admin_access_audit enable row level security;
revoke all on public.edgoria_admin_access_audit from public,anon,authenticated;
grant select,insert on public.edgoria_admin_access_audit to service_role;

-- Use timestamptz/UTC for authoritative expiry, calendar converts to local zone for display.
-- A month starts immediately at activation time (not at a verified USDT payment).
create or replace function public.edgoria_grant_manual_access(p_user_id uuid,p_admin_id uuid,p_kind text)
returns uuid language plpgsql security invoker set search_path='' as $$
declare v_now timestamptz; v_end timestamptz; v_id uuid;
begin
  if p_user_id=p_admin_id then raise exception 'Cannot edit own admin access'; end if;
  if p_kind not in ('trial','monthly') then raise exception 'Invalid grant kind'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_user_id::text)::bigint);
  if exists(select 1 from public.edgoria_archived_users where user_id=p_user_id) then
    raise exception 'Restore archived user before granting access';
  end if;
  if p_kind='trial' and exists(select 1 from public.edgoria_access_periods where user_id=p_user_id and kind='trial') then
    raise exception 'This user has already received a trial';
  end if;
  v_now:=pg_catalog.now();
  v_end:=case when p_kind='trial' then v_now+interval '7 days'
              else v_now+interval '1 month' end;
  -- Previous current period is closed; new access always starts from activation time.
  update public.edgoria_access_periods set status='revoked',revoked_at=v_now
    where user_id=p_user_id and status='active' and ends_at>v_now;
  insert into public.edgoria_access_periods(user_id,kind,starts_at,ends_at,granted_by)
    values(p_user_id,p_kind,v_now,v_end,p_admin_id) returning id into v_id;
  insert into public.edgoria_v4_access_grants(user_id,access_status,updated_by,updated_at)
    values(p_user_id,'active',p_admin_id,v_now)
    on conflict(user_id) do update set access_status='active',updated_by=excluded.updated_by,updated_at=excluded.updated_at;
  insert into public.edgoria_admin_access_audit(user_id,admin_id,action,access_period_id)
    values(p_user_id,p_admin_id,p_kind,v_id);
  return v_id;
end $$;
revoke all on function public.edgoria_grant_manual_access(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.edgoria_grant_manual_access(uuid,uuid,text) to service_role;

create or replace function public.edgoria_suspend_manual_access(p_user_id uuid,p_admin_id uuid)
returns boolean language plpgsql security invoker set search_path='' as $$
begin
 if p_user_id=p_admin_id then raise exception 'Cannot suspend admin'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_user_id::text)::bigint);
 update public.edgoria_access_periods set status='revoked',revoked_at=pg_catalog.now()
   where user_id=p_user_id and status='active';
 insert into public.edgoria_v4_access_grants(user_id,access_status,updated_by,updated_at)
   values(p_user_id,'suspended',p_admin_id,pg_catalog.now())
   on conflict(user_id) do update set access_status='suspended',updated_by=excluded.updated_by,updated_at=excluded.updated_at;
 insert into public.edgoria_admin_access_audit(user_id,admin_id,action) values(p_user_id,p_admin_id,'suspend');
 return true;
end $$;
revoke all on function public.edgoria_suspend_manual_access(uuid,uuid) from public,anon,authenticated;
grant execute on function public.edgoria_suspend_manual_access(uuid,uuid) to service_role;

-- Safer than hard-deleting users with trading/payout history. Removed from active list,
-- login disabled, and can be restored. Permanent erasure must be a separate audited procedure.
create or replace function public.edgoria_archive_user(p_user_id uuid,p_admin_id uuid)
returns boolean language plpgsql security invoker set search_path='' as $$
begin
 if p_user_id=p_admin_id then raise exception 'Cannot archive admin'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_user_id::text)::bigint);
 update public.edgoria_access_periods set status='revoked',revoked_at=pg_catalog.now()
   where user_id=p_user_id and status='active';
 insert into public.edgoria_archived_users(user_id,archived_by)
   values(p_user_id,p_admin_id) on conflict(user_id) do nothing;
 insert into public.edgoria_v4_access_grants(user_id,access_status,updated_by,updated_at)
   values(p_user_id,'suspended',p_admin_id,pg_catalog.now())
   on conflict(user_id) do update set access_status='suspended',updated_by=excluded.updated_by,updated_at=excluded.updated_at;
 insert into public.edgoria_admin_access_audit(user_id,admin_id,action) values(p_user_id,p_admin_id,'archive');
 return true;
end $$;
revoke all on function public.edgoria_archive_user(uuid,uuid) from public,anon,authenticated;
grant execute on function public.edgoria_archive_user(uuid,uuid) to service_role;

create or replace function public.edgoria_restore_user(p_user_id uuid,p_admin_id uuid)
returns boolean language plpgsql security invoker set search_path='' as $$
begin
 if p_user_id=p_admin_id then raise exception 'Cannot restore admin'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_user_id::text)::bigint);
 delete from public.edgoria_archived_users where user_id=p_user_id;
 insert into public.edgoria_v4_access_grants(user_id,access_status,updated_by,updated_at)
   values(p_user_id,'suspended',p_admin_id,pg_catalog.now())
   on conflict(user_id) do update set access_status='suspended',updated_by=excluded.updated_by,updated_at=excluded.updated_at;
 insert into public.edgoria_admin_access_audit(user_id,admin_id,action) values(p_user_id,p_admin_id,'restore');
 return true;
end $$;
revoke all on function public.edgoria_restore_user(uuid,uuid) from public,anon,authenticated;
grant execute on function public.edgoria_restore_user(uuid,uuid) to service_role;
