-- EDGORIA 2.0: commercial layer. Run AFTER schema.sql on a fresh project.
-- The user's existing production database already has this migration applied.
create table if not exists public.edgoria_plans (
 code text primary key,name text not null,currency text not null default 'USD' check(currency='USD'),
 price_cents integer not null check(price_cents>0),billing_period text not null check(billing_period='month'),
 trial_days integer not null default 0 check(trial_days between 0 and 30),active boolean not null default true,created_at timestamptz not null default now()
);
insert into public.edgoria_plans(code,name,currency,price_cents,billing_period,trial_days) values
 ('edgoria_monthly','EDGORIA','USD',1490,'month',7) on conflict (code) do nothing;
create table if not exists public.edgoria_subscriptions (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id),
 plan_code text not null references public.edgoria_plans(code),
 provider text not null check(provider in ('paddle','lemonsqueezy')),
 provider_customer_id text,provider_subscription_id text unique,
 status text not null default 'incomplete' check(status in ('incomplete','trialing','active','past_due','paused','canceled','expired')),
 trial_ends_at timestamptz,current_period_ends_at timestamptz,cancel_at_period_end boolean not null default false,
 last_provider_event_at timestamptz,created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create index if not exists edgoria_subscriptions_user_idx on public.edgoria_subscriptions(user_id);
create table if not exists public.edgoria_invoices (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id),
 subscription_id uuid references public.edgoria_subscriptions(id),provider text not null check(provider in ('paddle','lemonsqueezy')),
 provider_transaction_id text not null,amount_cents integer not null check(amount_cents>=0),
 currency text not null default 'USD' check(currency='USD'),
 status text not null check(status in ('paid','refunded','partially_refunded','void')),
 paid_at timestamptz,created_at timestamptz not null default now(),unique(provider,provider_transaction_id)
);
create index if not exists edgoria_invoices_user_idx on public.edgoria_invoices(user_id);
create table if not exists public.edgoria_affiliates (
 id uuid primary key default gen_random_uuid(),user_id uuid not null unique references auth.users(id),
 code text not null unique check(code ~ '^[a-z0-9_-]{4,32}$'),
 status text not null default 'pending' check(status in ('pending','active','suspended')),
 rate_basis_points integer not null default 1500 check(rate_basis_points between 0 and 1500),created_at timestamptz not null default now()
);
create table if not exists public.edgoria_affiliate_commissions (
 id uuid primary key default gen_random_uuid(),affiliate_id uuid not null references public.edgoria_affiliates(id),
 invoice_id uuid not null unique references public.edgoria_invoices(id),commission_cents integer not null check(commission_cents>=0),
 currency text not null default 'USD' check(currency='USD'),
 status text not null default 'pending' check(status in ('pending','approved','paid','reversed')),
 eligible_payment_number integer not null check(eligible_payment_number between 1 and 12),
 created_at timestamptz not null default now(),approved_at timestamptz,paid_at timestamptz
);
create index if not exists edgoria_commissions_affiliate_idx on public.edgoria_affiliate_commissions(affiliate_id);
create table if not exists public.edgoria_risk_rules (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id),
 account_id uuid not null unique references public.accounts(id) on delete cascade,
 max_risk_per_trade_pct numeric(6,3) check(max_risk_per_trade_pct between 0 and 100),
 max_risk_per_idea_pct numeric(6,3) check(max_risk_per_idea_pct between 0 and 100),
 daily_loss_pct numeric(6,3) check(daily_loss_pct between 0 and 100),
 max_drawdown_pct numeric(6,3) check(max_drawdown_pct between 0 and 100),
 daily_trade_limit integer check(daily_trade_limit>0),cooldown_minutes integer not null default 0 check(cooldown_minutes between 0 and 1440),
 extra_rules jsonb not null default '{}'::jsonb,created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create index if not exists edgoria_risk_rules_user_idx on public.edgoria_risk_rules(user_id);
create table if not exists public.edgoria_weekly_reviews (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id),
 week_start date not null,score integer check(score between 0 and 100),
 methodology_version text not null default 'v1',components jsonb not null default '{}'::jsonb,
 evidence jsonb not null default '{}'::jsonb,narrative text,created_at timestamptz not null default now(),
 unique(user_id,week_start,methodology_version)
);
create index if not exists edgoria_reviews_user_idx on public.edgoria_weekly_reviews(user_id);
create schema if not exists edgoria_internal;
revoke all on schema edgoria_internal from public,anon,authenticated;
create table if not exists edgoria_internal.referrals (
 id uuid primary key default gen_random_uuid(),affiliate_id uuid not null references public.edgoria_affiliates(id),
 referred_user_id uuid not null unique references auth.users(id),attributed_at timestamptz not null default now(),
 attribution_expires_at timestamptz not null,first_paid_at timestamptz,
 check (attribution_expires_at<=attributed_at+interval '30 days')
);
create table if not exists edgoria_internal.ai_usage (
 user_id uuid not null references auth.users(id),period_month date not null,
 report_count integer not null default 0 check(report_count>=0),tokens_used integer not null default 0 check(tokens_used>=0),
 updated_at timestamptz not null default now(),primary key(user_id,period_month)
);
create table if not exists edgoria_internal.webhook_events (
 provider text not null check(provider in ('paddle','lemonsqueezy')),event_id text not null,
 event_type text not null,occurred_at timestamptz,processed_at timestamptz,payload_sha256 text,
 created_at timestamptz not null default now(),primary key(provider,event_id)
);
-- Keep internal tables entirely outside the browser-facing Data API.
alter table edgoria_internal.referrals enable row level security;
alter table edgoria_internal.ai_usage enable row level security;
alter table edgoria_internal.webhook_events enable row level security;

-- All public tables have RLS; server-controlled billing data is read-only for clients.
do $$ declare t text;begin
 foreach t in array array['edgoria_plans','edgoria_subscriptions','edgoria_invoices','edgoria_affiliates','edgoria_affiliate_commissions','edgoria_risk_rules','edgoria_weekly_reviews'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from anon,authenticated',t);
 end loop;
end $$;
grant select on public.edgoria_plans to anon,authenticated;
grant select on public.edgoria_subscriptions,public.edgoria_invoices,public.edgoria_affiliates,public.edgoria_affiliate_commissions,public.edgoria_weekly_reviews to authenticated;
grant select,insert,update,delete on public.edgoria_risk_rules to authenticated;
-- DROP POLICY IF EXISTS here allows repeated installation without deleting business data.
drop policy if exists edgoria_plans_read_active on public.edgoria_plans;
create policy edgoria_plans_read_active on public.edgoria_plans for select to anon,authenticated using(active=true);
drop policy if exists edgoria_subscriptions_read_own on public.edgoria_subscriptions;
create policy edgoria_subscriptions_read_own on public.edgoria_subscriptions for select to authenticated using(user_id=(select auth.uid()));
drop policy if exists edgoria_invoices_read_own on public.edgoria_invoices;
create policy edgoria_invoices_read_own on public.edgoria_invoices for select to authenticated using(user_id=(select auth.uid()));
drop policy if exists edgoria_affiliates_read_own on public.edgoria_affiliates;
create policy edgoria_affiliates_read_own on public.edgoria_affiliates for select to authenticated using(user_id=(select auth.uid()));
drop policy if exists edgoria_commissions_read_own on public.edgoria_affiliate_commissions;
create policy edgoria_commissions_read_own on public.edgoria_affiliate_commissions for select to authenticated using(exists(select 1 from public.edgoria_affiliates a where a.id=affiliate_id and a.user_id=(select auth.uid())));
drop policy if exists edgoria_weekly_reviews_read_own on public.edgoria_weekly_reviews;
create policy edgoria_weekly_reviews_read_own on public.edgoria_weekly_reviews for select to authenticated using(user_id=(select auth.uid()));
drop policy if exists edgoria_risk_rules_select_own on public.edgoria_risk_rules;
create policy edgoria_risk_rules_select_own on public.edgoria_risk_rules for select to authenticated using(user_id=(select auth.uid()));
drop policy if exists edgoria_risk_rules_insert_own on public.edgoria_risk_rules;
create policy edgoria_risk_rules_insert_own on public.edgoria_risk_rules for insert to authenticated with check(user_id=(select auth.uid()) and exists(select 1 from public.accounts a where a.id=account_id and a.user_id=(select auth.uid())));
drop policy if exists edgoria_risk_rules_update_own on public.edgoria_risk_rules;
create policy edgoria_risk_rules_update_own on public.edgoria_risk_rules for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()) and exists(select 1 from public.accounts a where a.id=account_id and a.user_id=(select auth.uid())));
drop policy if exists edgoria_risk_rules_delete_own on public.edgoria_risk_rules;
create policy edgoria_risk_rules_delete_own on public.edgoria_risk_rules for delete to authenticated using(user_id=(select auth.uid()));
