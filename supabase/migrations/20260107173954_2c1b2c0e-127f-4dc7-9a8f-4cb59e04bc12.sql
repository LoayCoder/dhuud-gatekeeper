-- Fix 1: Update trigger to only regenerate zone_code when zone_name actually changes
CREATE OR REPLACE FUNCTION set_zone_code()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only regenerate on INSERT or when zone_name actually changes
  IF TG_OP = 'INSERT' THEN
    NEW.zone_code := generate_zone_code(NEW.zone_name);
  ELSIF TG_OP = 'UPDATE' AND NEW.zone_name IS DISTINCT FROM OLD.zone_name THEN
    NEW.zone_code := generate_zone_code(NEW.zone_name);
  END IF;
  RETURN NEW;
END;
$$;

-- Fix 2: Drop non-partial unique constraint (keep only the partial index that excludes deleted rows)
ALTER TABLE security_zones 
DROP CONSTRAINT IF EXISTS security_zones_tenant_id_zone_code_key;