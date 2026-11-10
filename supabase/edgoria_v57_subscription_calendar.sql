-- EDGORIA 5.7 | Calendario de suscripciones verificado en el servidor.
-- Requisito: aplicar antes supabase/edgoria_v56_manual_usdt.sql.
-- Aplicar primero en Supabase de pruebas y respaldar la base de producción.
-- No crea pagos, billeteras ni transacciones en criptomonedas.

create table if not exists public.edgoria_subscription_periods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  starts_at timestamptz not null,
  expires_at timestamptz not null,
  amount_usd_cents integer not null check(amount_usd_cents in (1099,1499)),
  currency text not null default 'USD' check(currency='USD'),
  payment_method text not null default 'USDT' check(payment_method='USDT'),
  payment_reference text not null unique check(char_length(payment_reference) between 8 and 160),
  verified_by uuid not null references auth.users(id),
  verified_at timestamptz not null default now(),
  status text not null default 'active' check(status in ('active','revoked')),
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  check(expires_at>starts_at)
);
create index if not exists edgoria_subscription_periods_by_user on public.edgoria_subscription_periods(user_id,starts_at desc);
create index if not exists edgoria_subscription_periods_calendar on public.edgoria_subscription_periods(starts_at,expires_at);
alter table public.edgoria_subscription_periods enable row level security;
revoke all on public.edgoria_subscription_periods from public,anon,authenticated;
grant select,insert,update on public.edgoria_subscription_periods to service_role;

-- Preserve any current active/revoked subscription on first migration.
-- Earlier audit versions didn't persist every start date, so historical periods
-- before this migration cannot be fully reconstructed and are not fabricated.
insert into public.edgoria_subscription_periods
 (user_id,starts_at,expires_at,amount_usd_cents,payment_reference,verified_by,verified_at,status)
select user_id,starts_at,expires_at,price_usd_cents,payment_reference,verified_by,verified_at,status
from public.edgoria_manual_subscriptions
where starts_at<expires_at and payment_reference is not null
on conflict(payment_reference) do nothing;

create schema if not exists edgoria_internal;
-- The existing 5.6 server-only payment RPC writes an immutable audit row first.
-- This trigger records the new subscription period atomically in that same
-- transaction, guaranteeing that admin Calendar and actual activation agree.
create or replace function edgoria_internal.record_subscription_period()
returns trigger language plpgsql security invoker set search_path='' as $$
declare old_end timestamptz; effective_start timestamptz;
begin
  if new.action='verify' then
    select expires_at into old_end
      from public.edgoria_manual_subscriptions
      where user_id=new.user_id and status='active';
    effective_start:=greatest(new.occurred_at,coalesce(old_end,new.occurred_at));
    insert into public.edgoria_subscription_periods
      (user_id,starts_at,expires_at,amount_usd_cents,payment_reference,verified_by,verified_at,status)
    values (new.user_id,effective_start,new.period_end,new.amount_usd_cents,new.reference,new.admin_id,new.occurred_at,'active')
    on conflict(payment_reference) do nothing;
  elsif new.action='revoke' then
    update public.edgoria_subscription_periods
      set status='revoked',revoked_at=new.occurred_at
      where user_id=new.user_id and status='active' and expires_at>new.occurred_at;
  end if;
  return new;
end $$;
revoke all on function edgoria_internal.record_subscription_period() from public,anon,authenticated;
grant usage on schema edgoria_internal to service_role;
grant execute on function edgoria_internal.record_subscription_period() to service_role;
drop trigger if exists edgoria_calendar_from_verified_payment on public.edgoria_manual_payment_audit;
create trigger edgoria_calendar_from_verified_payment
  after insert on public.edgoria_manual_payment_audit
  for each row execute function edgoria_internal.record_subscription_period();
