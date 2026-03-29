
-- 1. Add execution_mode to inspection_sessions
ALTER TABLE public.inspection_sessions 
  ADD COLUMN IF NOT EXISTS execution_mode text DEFAULT NULL;

-- Add check constraint
ALTER TABLE public.inspection_sessions 
  ADD CONSTRAINT chk_execution_mode CHECK (execution_mode IN ('asset', 'area') OR execution_mode IS NULL);

-- 2. Add snapshot columns to inspection_session_assets
ALTER TABLE public.inspection_session_assets
  ADD COLUMN IF NOT EXISTS asset_name_snapshot text,
  ADD COLUMN IF NOT EXISTS asset_code_snapshot text,
  ADD COLUMN IF NOT EXISTS asset_location_snapshot text,
  ADD COLUMN IF NOT EXISTS asset_type_snapshot text;

-- 3. Add unique constraint for idempotency
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_session_asset'
  ) THEN
    ALTER TABLE public.inspection_session_assets
      ADD CONSTRAINT uq_session_asset UNIQUE (session_id, asset_id);
  END IF;
END$$;
