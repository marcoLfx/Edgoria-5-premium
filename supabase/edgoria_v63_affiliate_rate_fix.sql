-- EDGORIA 6.3: conserva afiliados existentes y elimina el tope de 15 % heredado.
-- Ejecutar primero en Supabase de pruebas. No concede permisos, no toca trades
-- ni solicitudes, ni crea ventas o comisiones.
BEGIN;
DO $migration$
DECLARE old_rule RECORD;
BEGIN
  IF to_regclass('public.edgoria_affiliates') IS NULL THEN
    RAISE EXCEPTION 'Falta public.edgoria_affiliates; instala la base comercial primero';
  END IF;
  -- El esquema original incluía CHECK(rate_basis_points BETWEEN 0 AND 1500).
  -- Solo retiramos CHECKs antiguos que involucren esta columna y el límite 1500.
  FOR old_rule IN
    SELECT conname, pg_get_constraintdef(oid) AS definition
    FROM pg_constraint
    WHERE conrelid='public.edgoria_affiliates'::regclass
      AND contype='c'
      AND pg_get_constraintdef(oid) LIKE '%rate_basis_points%'
      AND pg_get_constraintdef(oid) LIKE '%1500%'
  LOOP
    EXECUTE format('ALTER TABLE public.edgoria_affiliates DROP CONSTRAINT %I', old_rule.conname);
  END LOOP;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid='public.edgoria_affiliates'::regclass
      AND conname='edgoria_affiliates_rate_v63_check'
  ) THEN
    ALTER TABLE public.edgoria_affiliates
      ADD CONSTRAINT edgoria_affiliates_rate_v63_check
      CHECK (rate_basis_points BETWEEN 0 AND 3000);
  END IF;
  ALTER TABLE public.edgoria_affiliates ALTER COLUMN rate_basis_points SET DEFAULT 2500;
END
$migration$;
COMMIT;

-- Comprobación opcional (solo lectura):
SELECT conname,pg_get_constraintdef(oid) AS regla
FROM pg_constraint
WHERE conrelid='public.edgoria_affiliates'::regclass
  AND contype='c'
  AND pg_get_constraintdef(oid) LIKE '%rate_basis_points%';
