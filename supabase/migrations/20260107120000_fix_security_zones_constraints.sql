-- Fix security_zones schema issues
--
-- Issues fixed:
-- 1. polygon_geojson is NOT NULL but app uses polygon_coords (causes insert failures)
-- 2. Profile query bug in application code (fixed separately)
-- 3. RLS policy too restrictive for zone management

-- 1. Make polygon_geojson nullable since polygon_coords is now the standard column
ALTER TABLE public.security_zones
ALTER COLUMN polygon_geojson DROP NOT NULL;

-- 2. Set default for polygon_geojson to maintain compatibility
ALTER TABLE public.security_zones
ALTER COLUMN polygon_geojson SET DEFAULT '{}'::jsonb;

-- 3. Update existing NULL polygon_geojson to empty object
UPDATE public.security_zones
SET polygon_geojson = '{}'::jsonb
WHERE polygon_geojson IS NULL;

-- 4. Fix RLS policies - separate DELETE policy from INSERT/UPDATE
-- Drop the overly restrictive ALL policy
DROP POLICY IF EXISTS "Admins can manage security zones" ON public.security_zones;

-- Create separate policies for better control
CREATE POLICY "Admins and security can insert zones"
  ON public.security_zones FOR INSERT
  WITH CHECK (
    tenant_id = get_auth_tenant_id()
    AND (
      has_role(auth.uid(), 'admin'::app_role)
      OR has_security_access(auth.uid())
    )
  );

CREATE POLICY "Admins and security can update zones"
  ON public.security_zones FOR UPDATE
  USING (
    tenant_id = get_auth_tenant_id()
    AND deleted_at IS NULL
    AND (
      has_role(auth.uid(), 'admin'::app_role)
      OR has_security_access(auth.uid())
    )
  )
  WITH CHECK (
    tenant_id = get_auth_tenant_id()
    AND (
      has_role(auth.uid(), 'admin'::app_role)
      OR has_security_access(auth.uid())
    )
  );

CREATE POLICY "Admins and security can soft-delete zones"
  ON public.security_zones FOR UPDATE
  USING (
    tenant_id = get_auth_tenant_id()
    AND (
      has_role(auth.uid(), 'admin'::app_role)
      OR has_security_access(auth.uid())
    )
  )
  WITH CHECK (
    tenant_id = get_auth_tenant_id()
    AND (
      has_role(auth.uid(), 'admin'::app_role)
      OR has_security_access(auth.uid())
    )
  );

-- Add comment documenting the column migration
COMMENT ON COLUMN public.security_zones.polygon_geojson IS 'Legacy GeoJSON column - use polygon_coords instead (nullable for backwards compatibility)';
COMMENT ON COLUMN public.security_zones.polygon_coords IS 'Current column: Array of [lat, lng] coordinate pairs defining zone boundary polygon';
