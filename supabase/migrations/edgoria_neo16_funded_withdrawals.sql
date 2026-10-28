-- EDGORIA NEO 16 · registros de retiros explícitos del historial MT5.
-- Solo se crea una tabla nueva; no se alteran P&L, trades, cuentas ni retiros manuales.
create table if not exists public.edgoria_v4_cash_movements (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 account_id uuid not null references public.accounts(id) on delete cascade,
 batch_id uuid not null references public.edgoria_v4_import_batches(id) on delete cascade,
 source_reference text not null check(length(source_reference) between 5 and 80),
 event_time timestamptz not null,
 amount numeric(18,2) not null check(amount>0),
 event_type text not null check(event_type='withdrawal'),
 description text not null default '',
 created_at timestamptz not null default now(),
 unique(user_id,account_id,source_reference)
);
create index if not exists idx_edgoria_v4_cash_events_user_account_time
 on public.edgoria_v4_cash_movements(user_id, account_id, event_time desc);
alter table public.edgoria_v4_cash_movements enable row level security;
drop policy if exists "cash_events_select_own_funded" on public.edgoria_v4_cash_movements;
create policy "cash_events_select_own_funded" on public.edgoria_v4_cash_movements
 for select to authenticated using (
  user_id=(select auth.uid()) and exists(select 1 from public.accounts a where a.id=account_id and a.user_id=(select auth.uid()) and a.account_type='funded')
 );
drop policy if exists "cash_events_insert_own_funded" on public.edgoria_v4_cash_movements;
create policy "cash_events_insert_own_funded" on public.edgoria_v4_cash_movements
 for insert to authenticated with check (
  user_id=(select auth.uid())
  and exists(select 1 from public.accounts a where a.id=account_id and a.user_id=(select auth.uid()) and a.account_type='funded')
  and exists(select 1 from public.edgoria_v4_import_batches b where b.id=batch_id and b.user_id=(select auth.uid()) and b.account_id=account_id)
 );
