-- Private-to-server support for affiliate attribution and webhook idempotency.
-- Apply after commercial tables have been installed.
create table if not exists public.edgoria_referral_attributions (
 id uuid primary key default gen_random_uuid(),
 affiliate_id uuid not null references public.edgoria_affiliates(id),
 referred_user_id uuid not null unique references auth.users(id),
 attributed_at timestamptz not null default now(),
 first_paid_at timestamptz,
 check (affiliate_id is not null)
);
create index if not exists edgoria_referrals_by_affiliate on public.edgoria_referral_attributions(affiliate_id);
alter table public.edgoria_referral_attributions enable row level security;
revoke all on public.edgoria_referral_attributions from anon,authenticated;

create table if not exists public.edgoria_webhook_receipts (
 event_id text primary key,
 provider text not null default 'lemonsqueezy',
 event_type text not null,
 received_at timestamptz not null default now(),
 processed_at timestamptz
);
alter table public.edgoria_webhook_receipts enable row level security;
revoke all on public.edgoria_webhook_receipts from anon,authenticated;
