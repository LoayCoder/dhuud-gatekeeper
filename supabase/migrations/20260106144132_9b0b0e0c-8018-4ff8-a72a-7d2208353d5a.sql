-- Update the validate_incident_required_fields function 
-- Remove the incident_type required check as it's optional for observations
CREATE OR REPLACE FUNCTION public.validate_incident_required_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Title is required
  IF NEW.title IS NULL OR NEW.title = '' THEN
    RAISE EXCEPTION 'Title is required';
  END IF;
  
  -- Description is required
  IF NEW.description IS NULL OR NEW.description = '' THEN
    RAISE EXCEPTION 'Description is required';
  END IF;
  
  -- occurred_at is required
  IF NEW.occurred_at IS NULL THEN
    RAISE EXCEPTION 'Occurred date is required';
  END IF;
  
  -- reporter_id is required
  IF NEW.reporter_id IS NULL THEN
    RAISE EXCEPTION 'Reporter ID is required';
  END IF;
  
  -- tenant_id is required
  IF NEW.tenant_id IS NULL THEN
    RAISE EXCEPTION 'Tenant ID is required';
  END IF;
  
  -- Note: incident_type is optional - observations use subtype instead
  
  RETURN NEW;
END;
$$;