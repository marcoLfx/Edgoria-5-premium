-- EDGORIA 4.0.3, safe additive RLS migration.
-- Allow signed-in customers to import *their own* MT5 XLSX/CSV history using
-- their Supabase JWT. No service_role or secret key required for this feature.
-- Uploaded history is user-provided / unverified, not broker-confirmed.
-- Existing Bridge, admin-only tables and subscription policies unchanged.

alter table public.edgoria_v4_import_batches enable row level security;
alter table public.edgoria_v4_file_positions enable row level security;

grant select, insert, delete on public.edgoria_v4_import_batches to authenticated;
grant select, insert on public.edgoria_v4_file_positions to authenticated;

-- No UPDATE grant, and position rows have no DELETE grant. A user may delete
-- only their complete batch (which cascades only that batch's positions).
drop policy if exists edgoria_mt5_import_batch_own_insert on public.edgoria_v4_import_batches;
create policy edgoria_mt5_import_batch_own_insert
on public.edgoria_v4_import_batches for insert to authenticated
with check (
  user_id = (select auth.uid())
  and exists (
    select 1 from public.accounts a
    where a.id = account_id and a.user_id = (select auth.uid())
  )
);

drop policy if exists edgoria_mt5_import_batch_own_delete on public.edgoria_v4_import_batches;
create policy edgoria_mt5_import_batch_own_delete
on public.edgoria_v4_import_batches for delete to authenticated
using (
  user_id = (select auth.uid())
  and exists (
    select 1 from public.accounts a
    where a.id = account_id and a.user_id = (select auth.uid())
  )
);

drop policy if exists edgoria_mt5_import_positions_own_insert on public.edgoria_v4_file_positions;
create policy edgoria_mt5_import_positions_own_insert
on public.edgoria_v4_file_positions for insert to authenticated
with check (
  user_id = (select auth.uid())
  and exists (
    select 1 from public.edgoria_v4_import_batches b
    where b.id = batch_id and b.user_id = (select auth.uid())
      and b.account_id = account_id
  )
);
