-- EDGORIA SaaS MVP — Execute in your OWN Supabase SQL Editor.
-- Uses Supabase Auth, PostgreSQL, and Row Level Security. No destructive DROP statements.
-- Re-running is idempotent. Only own-account rows can be accessed with anon/publishable key.

create extension if not exists pgcrypto;

create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (length(name) between 1 and 100),
  firm text not null default 'Personal',
  account_type text not null default 'personal' check (account_type in ('personal','demo','challenge','funded')),
  account_size numeric(18,2) not null default 0 check (account_size >= 0),
  daily_loss_limit numeric(18,2) not null default 0 check (daily_loss_limit >= 0),
  max_loss_limit numeric(18,2) not null default 0 check (max_loss_limit >= 0),
  target numeric(18,2) not null default 0 check (target >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.trades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid not null references public.accounts(id) on delete cascade,
  external_id text,
  symbol text not null check (length(symbol) between 1 and 30),
  direction text not null check (direction in ('BUY','SELL')),
  opened_at timestamptz,
  closed_at timestamptz not null,
  pnl numeric(18,2) not null,
  risk numeric(18,2) not null default 0 check (risk >= 0),
  commission numeric(18,2) not null default 0,
  swap numeric(18,2) not null default 0,
  strategy text not null default 'Sin clasificar',
  session text not null default 'Otra',
  emotion text not null default '',
  notes text not null default '',
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  constraint unique_ticket_per_account unique (account_id, external_id)
);

create table if not exists public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_date date not null,
  mood text not null default 'Concentrado',
  discipline boolean not null default true,
  note text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.payouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid not null references public.accounts(id) on delete cascade,
  paid_at date not null,
  amount numeric(18,2) not null check (amount > 0),
  note text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists idx_accounts_user on public.accounts(user_id);
create index if not exists idx_trades_user_closed on public.trades(user_id, closed_at desc);
create index if not exists idx_trades_account on public.trades(account_id);
create index if not exists idx_entries_user_date on public.journal_entries(user_id, entry_date desc);
create index if not exists idx_payouts_user on public.payouts(user_id);

alter table public.accounts enable row level security;
alter table public.trades enable row level security;
alter table public.journal_entries enable row level security;
alter table public.payouts enable row level security;

-- For accounts, ownership is defined exclusively by auth.uid().
drop policy if exists "accounts_select_own" on public.accounts;
create policy "accounts_select_own" on public.accounts for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "accounts_insert_own" on public.accounts;
create policy "accounts_insert_own" on public.accounts for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "accounts_update_own" on public.accounts;
create policy "accounts_update_own" on public.accounts for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "accounts_delete_own" on public.accounts;
create policy "accounts_delete_own" on public.accounts for delete to authenticated using ((select auth.uid()) = user_id);

-- Trades must ALSO reference an account belonging to the same authenticated owner.
drop policy if exists "trades_select_own" on public.trades;
create policy "trades_select_own" on public.trades for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "trades_insert_own" on public.trades;
create policy "trades_insert_own" on public.trades for insert to authenticated with check (
  (select auth.uid()) = user_id and exists (
    select 1 from public.accounts a where a.id = account_id and a.user_id = (select auth.uid())
  )
);
drop policy if exists "trades_update_own" on public.trades;
create policy "trades_update_own" on public.trades for update to authenticated using ((select auth.uid()) = user_id) with check (
  (select auth.uid()) = user_id and exists (
    select 1 from public.accounts a where a.id = account_id and a.user_id = (select auth.uid())
  )
);
drop policy if exists "trades_delete_own" on public.trades;
create policy "trades_delete_own" on public.trades for delete to authenticated using ((select auth.uid()) = user_id);

-- Private mindset journal.
drop policy if exists "journal_select_own" on public.journal_entries;
create policy "journal_select_own" on public.journal_entries for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "journal_insert_own" on public.journal_entries;
create policy "journal_insert_own" on public.journal_entries for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "journal_update_own" on public.journal_entries;
create policy "journal_update_own" on public.journal_entries for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "journal_delete_own" on public.journal_entries;
create policy "journal_delete_own" on public.journal_entries for delete to authenticated using ((select auth.uid()) = user_id);

-- Payout accounts must also belong to the same authenticated owner.
drop policy if exists "payouts_select_own" on public.payouts;
create policy "payouts_select_own" on public.payouts for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "payouts_insert_own" on public.payouts;
create policy "payouts_insert_own" on public.payouts for insert to authenticated with check (
  (select auth.uid()) = user_id and exists (
    select 1 from public.accounts a where a.id = account_id and a.user_id = (select auth.uid())
  )
);
drop policy if exists "payouts_update_own" on public.payouts;
create policy "payouts_update_own" on public.payouts for update to authenticated using ((select auth.uid()) = user_id) with check (
  (select auth.uid()) = user_id and exists (
    select 1 from public.accounts a where a.id = account_id and a.user_id = (select auth.uid())
  )
);
drop policy if exists "payouts_delete_own" on public.payouts;
create policy "payouts_delete_own" on public.payouts for delete to authenticated using ((select auth.uid()) = user_id);

-- Prevent unrestricted grants to the anon role; authenticated access is governed by RLS.
revoke all on public.accounts, public.trades, public.journal_entries, public.payouts from anon;
grant select, insert, update, delete on public.accounts, public.trades, public.journal_entries, public.payouts to authenticated;
