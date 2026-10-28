-- EDGORIA 4.0.4 – app-level access administration, without deleting historical trades.
-- Role assignment remains privileged; this table is writable ONLY by server credentials.
create table if not exists public.edgoria_v4_access_grants (
 user_id uuid primary key references auth.users(id) on delete cascade,
 access_status text not null default 'active' check(access_status in ('active','suspended')),
 trial_ends_at timestamptz,
 trial_granted_at timestamptz,
 updated_by uuid references auth.users(id) on delete set null,
 updated_at timestamptz not null default now(),
 constraint edgoria_trial_dates check(trial_ends_at is null or trial_granted_at is not null)
);
create index if not exists edgoria_v404_trial_idx on public.edgoria_v4_access_grants(trial_ends_at) where trial_ends_at is not null;
alter table public.edgoria_v4_access_grants enable row level security;
revoke all on public.edgoria_v4_access_grants from anon,authenticated;
grant select on public.edgoria_v4_access_grants to authenticated;
drop policy if exists edgoria_v404_grants_read_own on public.edgoria_v4_access_grants;
create policy edgoria_v404_grants_read_own on public.edgoria_v4_access_grants for select to authenticated using(user_id=(select auth.uid()));
-- Denying app access is enforced on server requests and app bootstrap; table RLS still protects ownership.
