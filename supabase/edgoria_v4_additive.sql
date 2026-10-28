-- EDGORIA 4.0 additive migration. No data deletion; safe alongside V3.
-- Run only once; every user-facing table has ownership RLS.
create table if not exists public.edgoria_v4_profiles (
 user_id uuid primary key references auth.users(id) on delete cascade,
 full_name text not null check(length(trim(full_name)) between 2 and 120),
 country text not null check(length(trim(country)) between 2 and 100),
 phone text check(phone is null or (length(phone) between 7 and 24 and phone ~ '^[+0-9 ()-]+$')),
 experience text not null default 'prefiero_no_decir' check(experience in ('principiante','intermedio','avanzado','prefiero_no_decir')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.edgoria_v4_profiles enable row level security;
revoke all on public.edgoria_v4_profiles from anon, authenticated;
grant select,insert,update on public.edgoria_v4_profiles to authenticated;
drop policy if exists v4_profiles_read on public.edgoria_v4_profiles;
create policy v4_profiles_read on public.edgoria_v4_profiles for select to authenticated using(user_id=(select auth.uid()));
drop policy if exists v4_profiles_insert on public.edgoria_v4_profiles;
create policy v4_profiles_insert on public.edgoria_v4_profiles for insert to authenticated with check(user_id=(select auth.uid()));
drop policy if exists v4_profiles_update on public.edgoria_v4_profiles;
create policy v4_profiles_update on public.edgoria_v4_profiles for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));

-- Roles can only be assigned by trusted server/API. Never trust user_metadata for authorization.
create table if not exists public.edgoria_v4_roles (
 user_id uuid primary key references auth.users(id) on delete cascade,
 role text not null check(role in ('trader','partner','admin')) default 'trader',
 assigned_at timestamptz not null default now()
);
alter table public.edgoria_v4_roles enable row level security;
revoke all on public.edgoria_v4_roles from anon,authenticated;
grant select on public.edgoria_v4_roles to authenticated;
drop policy if exists v4_roles_read_own on public.edgoria_v4_roles;
create policy v4_roles_read_own on public.edgoria_v4_roles for select to authenticated using(user_id=(select auth.uid()));

create table if not exists public.edgoria_v4_partner_applications (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null unique references auth.users(id) on delete cascade,
 message text not null default '' check(length(message)<=1000),
 status text not null default 'pending' check(status in ('pending','approved','rejected')),
 created_at timestamptz not null default now(), reviewed_at timestamptz
);
alter table public.edgoria_v4_partner_applications enable row level security;
revoke all on public.edgoria_v4_partner_applications from anon,authenticated;
grant select,insert on public.edgoria_v4_partner_applications to authenticated;
drop policy if exists v4_partner_app_read on public.edgoria_v4_partner_applications;
create policy v4_partner_app_read on public.edgoria_v4_partner_applications for select to authenticated using(user_id=(select auth.uid()));
drop policy if exists v4_partner_app_insert on public.edgoria_v4_partner_applications;
create policy v4_partner_app_insert on public.edgoria_v4_partner_applications for insert to authenticated with check(user_id=(select auth.uid()) and status='pending' and reviewed_at is null);

-- File batches are deleted only by authenticated server after validating ownership.
-- On delete cascade, derived positions disappear and dashboards recompute. Bridge positions remain untouched.
create table if not exists public.edgoria_v4_import_batches (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 account_id uuid not null references public.accounts(id) on delete cascade,
 filename text not null check(length(filename) between 1 and 180),
 sha256 text not null check(sha256 ~ '^[a-f0-9]{64}$'),
 total_rows integer not null check(total_rows between 0 and 20000),
 positions_imported integer not null check(positions_imported between 0 and 20000),
 uploaded_at timestamptz not null default now(),
 unique(user_id,account_id,sha256)
);
create index if not exists v4_batch_owner_account_idx on public.edgoria_v4_import_batches(user_id,account_id);
alter table public.edgoria_v4_import_batches enable row level security;
revoke all on public.edgoria_v4_import_batches from anon,authenticated;
grant select on public.edgoria_v4_import_batches to authenticated;
drop policy if exists v4_batch_read on public.edgoria_v4_import_batches;
create policy v4_batch_read on public.edgoria_v4_import_batches for select to authenticated using(user_id=(select auth.uid()));

create table if not exists public.edgoria_v4_file_positions (
 id uuid primary key default gen_random_uuid(),
 batch_id uuid not null references public.edgoria_v4_import_batches(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 account_id uuid not null references public.accounts(id) on delete cascade,
 position_id text not null check(length(position_id) between 1 and 60),
 symbol text not null check(length(symbol) between 1 and 30),
 direction text not null check(direction in ('BUY','SELL')),
 opened_at timestamptz not null,
 closed_at timestamptz not null,
 pnl numeric not null,
 commission numeric not null default 0,
 swap numeric not null default 0,
 created_at timestamptz not null default now(),
 unique(batch_id,position_id)
);
create index if not exists v4_file_positions_user_account_idx on public.edgoria_v4_file_positions(user_id,account_id);
alter table public.edgoria_v4_file_positions enable row level security;
revoke all on public.edgoria_v4_file_positions from anon,authenticated;
grant select on public.edgoria_v4_file_positions to authenticated;
drop policy if exists v4_file_positions_read on public.edgoria_v4_file_positions;
create policy v4_file_positions_read on public.edgoria_v4_file_positions for select to authenticated using(user_id=(select auth.uid()));
