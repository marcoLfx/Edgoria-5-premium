-- EDGORIA 6.2: partner applications and five-account ceiling.
-- Additive. No changes to existing users' grants, trades, or subscriptions.

create table if not exists public.edgoria_partner_requests (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null unique references auth.users(id) on delete cascade,
 display_name text not null check (length(btrim(display_name)) between 3 and 120),
 channel text not null check (channel in ('youtube','tiktok','instagram','community','education','website','other')),
 channel_url text check (channel_url is null or length(channel_url)<=220),
 audience_size integer not null default 0 check (audience_size between 0 and 100000000),
 motivation text not null check (length(btrim(motivation)) between 40 and 1500),
 status text not null default 'pending' check (status in ('pending','approved','rejected')),
 created_at timestamptz not null default now(),
 reviewed_at timestamptz,
 reviewed_by uuid references auth.users(id),
 constraint eg62_pending_review check (status<>'pending' or reviewed_at is null)
);
create index if not exists eg62_partner_requests_queue on public.edgoria_partner_requests(status,created_at desc);
alter table public.edgoria_partner_requests enable row level security;
revoke all on public.edgoria_partner_requests from public,anon,authenticated;
grant select,insert on public.edgoria_partner_requests to authenticated;
grant select,insert,update on public.edgoria_partner_requests to service_role;
drop policy if exists eg62_partner_requests_read_own on public.edgoria_partner_requests;
create policy eg62_partner_requests_read_own on public.edgoria_partner_requests for select to authenticated using (user_id=(select auth.uid()));
drop policy if exists eg62_partner_requests_insert_own on public.edgoria_partner_requests;
create policy eg62_partner_requests_insert_own on public.edgoria_partner_requests for insert to authenticated
 with check (user_id=(select auth.uid()) and status='pending' and reviewed_at is null and reviewed_by is null);

-- Only the authenticated administrator's server-side endpoint may call this RPC
-- using the server-only service_role key, after verifying admin permissions.
create or replace function public.edgoria_review_partner_request(
 p_request_id uuid,p_admin_id uuid,p_decision text,p_rate_basis_points integer default 2500
) returns text language plpgsql security invoker set search_path='' as $$
declare v_req public.edgoria_partner_requests%rowtype; v_code text; v_affiliate_id uuid;
begin
 if p_decision not in ('approved','rejected') then raise exception 'Invalid review decision'; end if;
 if p_rate_basis_points not in (2500,3000) then raise exception 'Invalid affiliate rate'; end if;
 select * into v_req from public.edgoria_partner_requests where id=p_request_id for update;
 if not found then raise exception 'Partner request not found'; end if;
 if v_req.status<>'pending' then raise exception 'Partner request already reviewed'; end if;
 if v_req.user_id=p_admin_id then raise exception 'Cannot review your own partner request'; end if;
 if p_decision='approved' then
  -- Deterministic unique code, created *only* after approval.
  v_code:='edg-'||left(replace(v_req.user_id::text,'-',''),12);
  insert into public.edgoria_affiliates(user_id,code,status,rate_basis_points)
   values(v_req.user_id,v_code,'active',p_rate_basis_points)
   on conflict(user_id) do update set status='active',rate_basis_points=excluded.rate_basis_points
   returning id,code into v_affiliate_id,v_code;
  insert into public.edgoria_commercial_audit(actor_id,event,target_id,details)
   values(p_admin_id,'affiliate_approved',v_affiliate_id,
    pg_catalog.jsonb_build_object('application_id',p_request_id,'rate_basis_points',p_rate_basis_points));
 end if;
 update public.edgoria_partner_requests
 set status=p_decision,reviewed_at=pg_catalog.now(),reviewed_by=p_admin_id where id=p_request_id;
 return coalesce(v_code,'');
end $$;
revoke all on function public.edgoria_review_partner_request(uuid,uuid,text,integer) from public,anon,authenticated;
grant execute on function public.edgoria_review_partner_request(uuid,uuid,text,integer) to service_role;

-- Atomic per-user check; catches direct REST calls and simultaneous browser tabs.
-- Existing users with >5 legacy accounts keep their records, but cannot create new ones.
create or replace function public.eg62_limit_user_accounts()
returns trigger language plpgsql security invoker set search_path='' as $$
declare v_total integer;
begin
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(new.user_id::text)::bigint);
 select count(*) into v_total from public.accounts where user_id=new.user_id;
 if v_total>=5 then
  raise exception 'EDGORIA: máximo 5 cuentas MT5 por usuario'
   using errcode='23514',constraint='edgoria_max_five_accounts';
 end if;
 return new;
end $$;
revoke all on function public.eg62_limit_user_accounts() from public,anon,authenticated;
-- The function is used as a row trigger and cannot be invoked as a normal RPC.
drop trigger if exists eg62_max_five_accounts on public.accounts;
create trigger eg62_max_five_accounts before insert on public.accounts
 for each row execute function public.eg62_limit_user_accounts();
