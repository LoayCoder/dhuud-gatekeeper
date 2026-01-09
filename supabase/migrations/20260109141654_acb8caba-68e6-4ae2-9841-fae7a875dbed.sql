-- Fix race condition in reference ID generation using advisory lock
CREATE OR REPLACE FUNCTION public.generate_incident_reference_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  year_suffix text;
  sequence_num integer;
  ref_prefix text;
  lock_key bigint;
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
  
  -- Generate a unique lock key based on tenant, prefix, and year
  -- This prevents race conditions when multiple users submit simultaneously
  lock_key := hashtext(NEW.tenant_id::text || ref_prefix || year_suffix);
  
  -- Acquire advisory lock (released automatically at end of transaction)
  PERFORM pg_advisory_xact_lock(lock_key);
  
  -- Now safely increment and get sequence
  INSERT INTO incident_reference_sequences (tenant_id, prefix, year, current_value)
  VALUES (NEW.tenant_id, ref_prefix, year_suffix, 1)
  ON CONFLICT (tenant_id, prefix, year)
  DO UPDATE SET 
    current_value = incident_reference_sequences.current_value + 1,
    updated_at = NOW()
  RETURNING current_value INTO sequence_num;
  
  NEW.reference_id := ref_prefix || '-' || year_suffix || '-' || LPAD(sequence_num::text, 4, '0');
  
  RETURN NEW;
END;
$$;