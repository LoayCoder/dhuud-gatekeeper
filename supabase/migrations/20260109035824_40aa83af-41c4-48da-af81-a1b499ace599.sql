-- =====================================================
-- PERMANENT FIX: Atomic Reference ID Generation
-- Prevents duplicate reference_id errors via atomic UPSERT
-- =====================================================

-- Step 1: Create sequence tracking table
CREATE TABLE IF NOT EXISTS public.incident_reference_sequences (
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  prefix text NOT NULL,
  year text NOT NULL,
  current_value integer NOT NULL DEFAULT 0,
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (tenant_id, prefix, year)
);

-- Enable RLS (SECURITY DEFINER trigger bypasses it)
ALTER TABLE public.incident_reference_sequences ENABLE ROW LEVEL SECURITY;

-- Step 2: Populate from existing incidents
INSERT INTO incident_reference_sequences (tenant_id, prefix, year, current_value)
SELECT 
  tenant_id,
  SPLIT_PART(reference_id, '-', 1) as prefix,
  SPLIT_PART(reference_id, '-', 2) as year,
  MAX(CAST(NULLIF(SPLIT_PART(reference_id, '-', 3), '') AS INTEGER)) as current_value
FROM incidents
WHERE reference_id IS NOT NULL
  AND reference_id LIKE '%-%-%'
  AND deleted_at IS NULL
  AND tenant_id IS NOT NULL
GROUP BY tenant_id, SPLIT_PART(reference_id, '-', 1), SPLIT_PART(reference_id, '-', 2)
ON CONFLICT (tenant_id, prefix, year)
DO UPDATE SET current_value = GREATEST(
  incident_reference_sequences.current_value, 
  EXCLUDED.current_value
);

-- Step 3: Replace trigger function with atomic version
CREATE OR REPLACE FUNCTION public.generate_incident_reference_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  year_suffix text;
  sequence_num integer;
  prefix text;
BEGIN
  -- Skip if reference_id already set (shouldn't happen, but safety check)
  IF NEW.reference_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  year_suffix := TO_CHAR(NOW(), 'YYYY');
  
  -- Determine prefix based on event_type
  IF NEW.event_type = 'observation' THEN
    prefix := 'OBS';
  ELSE
    prefix := 'INC';
  END IF;
  
  -- ATOMIC: Upsert with increment - guaranteed unique sequence per transaction
  INSERT INTO incident_reference_sequences (tenant_id, prefix, year, current_value)
  VALUES (NEW.tenant_id, prefix, year_suffix, 1)
  ON CONFLICT (tenant_id, prefix, year)
  DO UPDATE SET 
    current_value = incident_reference_sequences.current_value + 1,
    updated_at = now()
  RETURNING current_value INTO sequence_num;
  
  NEW.reference_id := prefix || '-' || year_suffix || '-' || LPAD(sequence_num::text, 4, '0');
  
  RETURN NEW;
END;
$$;

-- Ensure trigger exists (recreate to use updated function)
DROP TRIGGER IF EXISTS set_incident_reference_id ON incidents;
CREATE TRIGGER set_incident_reference_id
  BEFORE INSERT ON incidents
  FOR EACH ROW
  EXECUTE FUNCTION generate_incident_reference_id();