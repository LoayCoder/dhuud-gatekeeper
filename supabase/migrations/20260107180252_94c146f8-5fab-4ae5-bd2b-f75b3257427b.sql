-- Phase 1: Fix polygon_geojson column - make it nullable and set default
ALTER TABLE security_zones ALTER COLUMN polygon_geojson DROP NOT NULL;
ALTER TABLE security_zones ALTER COLUMN polygon_geojson 
  SET DEFAULT '{"type": "Polygon", "coordinates": []}'::jsonb;

-- Phase 2: Create auto-generation trigger for polygon_geojson from polygon_coords
CREATE OR REPLACE FUNCTION generate_polygon_geojson()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only generate if polygon_coords is provided and polygon_geojson is not explicitly set
  IF NEW.polygon_coords IS NOT NULL AND jsonb_array_length(NEW.polygon_coords) >= 3 THEN
    NEW.polygon_geojson := jsonb_build_object(
      'type', 'Polygon',
      'coordinates', jsonb_build_array(
        (SELECT jsonb_agg(jsonb_build_array(elem->1, elem->0))
         FROM jsonb_array_elements(NEW.polygon_coords) AS elem)
      )
    );
  ELSIF NEW.polygon_geojson IS NULL THEN
    NEW.polygon_geojson := '{"type": "Polygon", "coordinates": []}'::jsonb;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_generate_polygon_geojson ON security_zones;
CREATE TRIGGER trg_generate_polygon_geojson
BEFORE INSERT OR UPDATE ON security_zones
FOR EACH ROW EXECUTE FUNCTION generate_polygon_geojson();

-- Phase 3: Fix authorization functions for RLS with SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.is_admin(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_role_assignments ura
    JOIN roles r ON ura.role_id = r.id
    WHERE ura.user_id = p_user_id AND r.code = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.has_security_access(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_role_assignments ura
    JOIN roles r ON ura.role_id = r.id
    WHERE ura.user_id = _user_id
      AND r.code IN ('admin', 'security_manager', 'security_supervisor')
  );
$$;