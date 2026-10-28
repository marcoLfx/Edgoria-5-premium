-- EDGORIA NEO 14: add nullable MT5 volume in LOTS. Existing history remains unchanged.
ALTER TABLE public.edgoria_v4_file_positions
  ADD COLUMN IF NOT EXISTS volume_lots numeric;
ALTER TABLE public.trades
  ADD COLUMN IF NOT EXISTS volume_lots numeric;
-- Old records are NULL, never silently backfilled with fictitious volumes.
-- RLS policies are unchanged. Re-import a previously uploaded history if lotage is required.
