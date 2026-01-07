-- Fix has_security_access() to use same authorization system as is_admin()
CREATE OR REPLACE FUNCTION has_security_access(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_role_assignments ura
    JOIN roles r ON ura.role_id = r.id
    WHERE ura.user_id = _user_id
      AND r.code IN ('admin', 'security_manager', 'security_supervisor')
  );
$$;

-- Update set_zone_code trigger to ALWAYS regenerate zone_code from zone_name
CREATE OR REPLACE FUNCTION set_zone_code()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Always regenerate zone_code from zone_name to keep them in sync
  NEW.zone_code := generate_zone_code(NEW.zone_name);
  RETURN NEW;
END;
$$;

-- Clean up existing zones with legacy/wrong format codes
UPDATE security_zones 
SET zone_code = generate_zone_code(zone_name)
WHERE zone_code NOT LIKE 'ZONE-%' 
   OR zone_code IS NULL
   OR zone_code = '';