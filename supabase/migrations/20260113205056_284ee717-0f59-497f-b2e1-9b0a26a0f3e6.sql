-- Fix Function Search Path Security Vulnerabilities
-- Update 3 functions to set immutable search_path

-- 1. Fix generate_polygon_geojson trigger function
CREATE OR REPLACE FUNCTION public.generate_polygon_geojson()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
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
$function$;

-- 2. Fix generate_zone_code function  
CREATE OR REPLACE FUNCTION public.generate_zone_code(zone_name text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $function$
BEGIN
  RETURN 'ZONE-' || UPPER(REGEXP_REPLACE(TRIM(COALESCE(zone_name, '')), '[^A-Za-z0-9]+', '-', 'g'));
END;
$function$;

-- 3. Fix set_zone_code trigger function
CREATE OR REPLACE FUNCTION public.set_zone_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- Only regenerate on INSERT or when zone_name actually changes
  IF TG_OP = 'INSERT' THEN
    NEW.zone_code := generate_zone_code(NEW.zone_name);
  ELSIF TG_OP = 'UPDATE' AND NEW.zone_name IS DISTINCT FROM OLD.zone_name THEN
    NEW.zone_code := generate_zone_code(NEW.zone_name);
  END IF;
  RETURN NEW;
END;
$function$;

-- Add RLS policy to incident_reference_sequences (INFO 1 from linter)
-- This table tracks reference ID sequences per tenant
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'incident_reference_sequences'
  ) THEN
    CREATE POLICY "Tenant isolation for incident_reference_sequences"
      ON incident_reference_sequences
      FOR ALL
      USING (tenant_id = get_auth_tenant_id());
  END IF;
END $$;