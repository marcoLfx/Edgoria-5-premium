-- EXECUTE ONLY AFTER V3 Preview is validated. Client trades become READ ONLY.
-- Preserve all old manual trade rows for export/audit; client V3 excludes them from stats.
-- Server API (/api/mt5-ingest) must be working with service-role secret before enabling.
revoke insert,update,delete on table public.trades from anon,authenticated;
-- Make future changes to trade P&L impossible through browser, including direct REST requests.
drop policy if exists trades_insert_own on public.trades;
drop policy if exists trades_update_own on public.trades;
drop policy if exists trades_delete_own on public.trades;
-- Keep select policy trades_select_own for own history and annotation owner checks.
