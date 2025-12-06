-- Phase 1: Add risk_rating column for observations and update reference_id trigger

-- Add risk_rating column to incidents table (only used for observations)
ALTER TABLE public.incidents 
ADD COLUMN IF NOT EXISTS risk_rating TEXT CHECK (risk_rating IN ('low', 'medium', 'high'));

-- Add requires_investigation computed helper (observations don't require investigation)
-- This is handled in code logic, but we add a comment for clarity

-- Update the reference ID generation function to use OBS- prefix for observations
CREATE OR REPLACE FUNCTION public.generate_incident_reference_id()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  year_suffix text;
  sequence_num integer;
  prefix text;
BEGIN
  year_suffix := TO_CHAR(NOW(), 'YYYY');
  
  -- Use different prefix based on event_type
  IF NEW.event_type = 'observation' THEN
    prefix := 'OBS';
  ELSE
    prefix := 'INC';
  END IF;
  
  -- Get next sequence number for this prefix and year within tenant
  SELECT COALESCE(MAX(
    CAST(NULLIF(SPLIT_PART(reference_id, '-', 3), '') AS INTEGER)
  ), 0) + 1
  INTO sequence_num
  FROM incidents
  WHERE tenant_id = NEW.tenant_id
    AND reference_id LIKE prefix || '-' || year_suffix || '-%';
  
  NEW.reference_id := prefix || '-' || year_suffix || '-' || LPAD(sequence_num::text, 4, '0');
  
  RETURN NEW;
END;
$function$;

-- Add index for risk_rating for analytics queries
CREATE INDEX IF NOT EXISTS idx_incidents_risk_rating ON public.incidents(risk_rating) WHERE risk_rating IS NOT NULL;

-- Add index for event_type for filtering
CREATE INDEX IF NOT EXISTS idx_incidents_event_type ON public.incidents(event_type);

COMMENT ON COLUMN public.incidents.risk_rating IS 'Risk rating for observations only (low/medium/high). NULL for incidents.';
COMMENT ON FUNCTION public.generate_incident_reference_id() IS 'Auto-generates reference IDs: OBS-YYYY-NNNN for observations, INC-YYYY-NNNN for incidents.';