-- Fix the ambiguous 'prefix' column reference by using qualified names
CREATE OR REPLACE FUNCTION public.generate_incident_reference_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  year_suffix text;
  sequence_num integer;
  ref_prefix text;  -- Renamed to avoid conflict with column name
BEGIN
  -- Only generate if reference_id is not already set
  IF NEW.reference_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  year_suffix := TO_CHAR(NOW(), 'YYYY');
  
  -- Determine prefix based on event_type
  IF NEW.event_type = 'observation' THEN
    ref_prefix := 'OBS';
  ELSE
    ref_prefix := 'INC';
  END IF;
  
  -- Atomic upsert with increment - guarantees unique sequence
  INSERT INTO incident_reference_sequences (tenant_id, prefix, year, current_value)
  VALUES (NEW.tenant_id, ref_prefix, year_suffix, 1)
  ON CONFLICT (tenant_id, prefix, year)
  DO UPDATE SET current_value = incident_reference_sequences.current_value + 1
  RETURNING current_value INTO sequence_num;
  
  NEW.reference_id := ref_prefix || '-' || year_suffix || '-' || LPAD(sequence_num::text, 4, '0');
  
  RETURN NEW;
END;
$$;