-- Additive EDGORIA bridge schema. Run after the core and v2 billing migration.
-- These data tables are not writable by client roles; only trusted server functions with secret credentials.
create table if not exists public.edgoria_mt5_connections (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 account_id uuid not null unique references public.accounts(id) on delete cascade,
 mt5_login text not null check (mt5_login ~ '^[0-9]{1,24}$'),
 server text not null check (length(server) between 1 and 150),
 status text not null default 'active' check (status in ('active','revoked')),
 last_sync_at timestamptz,
 created_at timestamptz not null default now()
);
create index if not exists edgoria_mt5_connections_user_idx on public.edgoria_mt5_connections(user_id);
alter table public.edgoria_mt5_connections enable row level security;
revoke all on public.edgoria_mt5_connections from anon,authenticated;
grant select on public.edgoria_mt5_connections to authenticated;
create policy mt5_connection_read_own on public.edgoria_mt5_connections for select to authenticated using (user_id=(select auth.uid()));

create table if not exists public.edgoria_mt5_tokens (
 connection_id uuid primary key references public.edgoria_mt5_connections(id) on delete cascade,
 token_sha256 text not null unique check (length(token_sha256)=64),
 created_at timestamptz not null default now()
);
alter table public.edgoria_mt5_tokens enable row level security;
revoke all on public.edgoria_mt5_tokens from anon,authenticated;

create table if not exists public.edgoria_mt5_deals (
 connection_id uuid not null references public.edgoria_mt5_connections(id) on delete cascade,
 deal_ticket text not null check (deal_ticket ~ '^[0-9]{1,24}$'),
 position_id text not null check (position_id ~ '^[0-9]{1,24}$'),
 event_time timestamptz not null,
 symbol text not null check (length(symbol) between 1 and 30),
 deal_type text not null check (deal_type in ('BUY','SELL')),
 entry_code integer not null check (entry_code between 0 and 3),
 volume numeric(18,4) not null check (volume>0),
 profit numeric(18,4) not null default 0,
 commission numeric(18,4) not null default 0,
 swap numeric(18,4) not null default 0,
 fee numeric(18,4) not null default 0,
 imported_at timestamptz not null default now(),
 primary key(connection_id,deal_ticket)
);
create index if not exists edgoria_mt5_deals_position_idx on public.edgoria_mt5_deals(connection_id,position_id,event_time);
alter table public.edgoria_mt5_deals enable row level security;
revoke all on public.edgoria_mt5_deals from anon,authenticated;
