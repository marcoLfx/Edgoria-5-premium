-- EDGORIA 6.0 -- Affiliate commercialization, kept entirely separate from access grants.
-- Apply in a STAGING project first. This migration does NOT grant/revoke access,
-- charge a wallet, create subscriptions, or process blockchain payments.
-- All privileged writes must come from a server route that authenticates an admin.

alter table public.edgoria_affiliates
  alter column rate_basis_points set default 2500;
-- Preserve previously negotiated rates for existing partners; admin can update them.

create table if not exists public.edgoria_manual_sales (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references auth.users(id),
  amount_cents integer not null check(amount_cents in (1099,1499)),
  currency text not null default 'USD' check(currency='USD'),
  payment_channel text not null default 'USDT_TRC20_MANUAL' check(payment_channel='USDT_TRC20_MANUAL'),
  external_reference text not null unique check(length(external_reference) between 10 and 128),
  verified_by uuid not null references auth.users(id),
  verified_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.edgoria_partner_commissions (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null unique references public.edgoria_manual_sales(id),
  affiliate_id uuid not null references public.edgoria_affiliates(id),
  rate_basis_points integer not null check(rate_basis_points in (2500,3000)),
  commission_cents integer not null check(commission_cents>=0),
  status text not null default 'pending' check(status in ('pending','approved','paid','rejected')),
  created_at timestamptz not null default now(),
  approved_at timestamptz,
  paid_at timestamptz,
  approved_by uuid references auth.users(id),
  paid_by uuid references auth.users(id)
);
create index if not exists edgoria_partner_commissions_affiliate_idx
  on public.edgoria_partner_commissions(affiliate_id,created_at desc);

create table if not exists public.edgoria_commercial_audit (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references auth.users(id),
  event text not null check(event in ('affiliate_approved','affiliate_suspended','rate_changed','sale_verified','commission_approved','commission_paid','commission_rejected')),
  target_id uuid not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.edgoria_manual_sales enable row level security;
alter table public.edgoria_partner_commissions enable row level security;
alter table public.edgoria_commercial_audit enable row level security;
revoke all on public.edgoria_manual_sales,public.edgoria_partner_commissions,public.edgoria_commercial_audit from public,anon,authenticated;
grant select,insert,update on public.edgoria_manual_sales,public.edgoria_partner_commissions to service_role;
grant select,insert on public.edgoria_commercial_audit to service_role;
-- Partners may see only their own commission rows; never the sale ledger or other people's accounts.
grant select on public.edgoria_partner_commissions to authenticated;
drop policy if exists edgoria_partner_commission_self on public.edgoria_partner_commissions;
create policy edgoria_partner_commission_self on public.edgoria_partner_commissions for select to authenticated
 using (exists(select 1 from public.edgoria_affiliates a
               where a.id=affiliate_id and a.user_id=(select auth.uid())));

-- Atomic verified-sale write. Does NOT modify access periods or subscriptions.
create or replace function public.edgoria_verify_manual_sale(
 p_buyer_id uuid,p_admin_id uuid,p_amount_cents integer,p_reference text
) returns uuid language plpgsql security invoker set search_path='' as $$
declare v_sale uuid; v_affiliate uuid; v_rate integer; v_amount integer;
begin
 if p_buyer_id=p_admin_id then raise exception 'Self-referral cannot earn commission'; end if;
 if p_amount_cents not in (1099,1499) then raise exception 'Unexpected plan price'; end if;
 if length(trim(coalesce(p_reference,'')))<10 then raise exception 'Reference required'; end if;
 -- The buyer FK is enforced by edgoria_manual_sales; no direct auth.users SELECT required.
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_reference)::bigint);
 insert into public.edgoria_manual_sales(buyer_id,amount_cents,external_reference,verified_by)
 values(p_buyer_id,p_amount_cents,trim(p_reference),p_admin_id) returning id into v_sale;
 select a.id,a.rate_basis_points into v_affiliate,v_rate
   from public.edgoria_referral_attributions r
   join public.edgoria_affiliates a on a.id=r.affiliate_id
   where r.referred_user_id=p_buyer_id and a.status='active' and a.user_id<>p_buyer_id
   limit 1;
 -- Only the FIRST verified paid month of a referred customer earns a commission.
 if v_affiliate is not null and not exists (
   select 1 from public.edgoria_partner_commissions c
     join public.edgoria_manual_sales s on s.id=c.sale_id
    where s.buyer_id=p_buyer_id and c.sale_id<>v_sale
 ) then
   if v_rate not in (2500,3000) then raise exception 'Affiliate rate must be configured first'; end if;
   v_amount:=pg_catalog.round(p_amount_cents::numeric*v_rate/10000)::integer;
   insert into public.edgoria_partner_commissions(sale_id,affiliate_id,rate_basis_points,commission_cents)
   values(v_sale,v_affiliate,v_rate,v_amount);
 end if;
 insert into public.edgoria_commercial_audit(actor_id,event,target_id,details)
 values(p_admin_id,'sale_verified',v_sale,pg_catalog.jsonb_build_object('amount_cents',p_amount_cents,'affiliate_attributed',v_affiliate is not null));
 return v_sale;
end $$;
revoke all on function public.edgoria_verify_manual_sale(uuid,uuid,integer,text) from public,anon,authenticated;
grant execute on function public.edgoria_verify_manual_sale(uuid,uuid,integer,text) to service_role;
