-- Fix the validate_incident_required_fields function by removing the invalid 'draft' status check
CREATE OR REPLACE FUNCTION validate_incident_required_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- Note: 'draft' status was removed as it's not a valid incident_status enum value
  -- All incidents start with 'submitted' status, so site_id is always required
  
  -- Require site_id for all incidents
  IF NEW.site_id IS NULL THEN
    RAISE EXCEPTION 'site_id is required for incidents';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;