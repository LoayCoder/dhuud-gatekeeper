-- Add geofence_radius_meters to sites table
ALTER TABLE public.sites 
ADD COLUMN IF NOT EXISTS geofence_radius_meters integer DEFAULT 100;

-- Add location columns to ptw_projects table
ALTER TABLE public.ptw_projects
ADD COLUMN IF NOT EXISTS latitude double precision,
ADD COLUMN IF NOT EXISTS longitude double precision,
ADD COLUMN IF NOT EXISTS boundary_polygon jsonb,
ADD COLUMN IF NOT EXISTS geofence_radius_meters integer DEFAULT 100;

-- Add location columns to contractor_projects table
ALTER TABLE public.contractor_projects
ADD COLUMN IF NOT EXISTS latitude double precision,
ADD COLUMN IF NOT EXISTS longitude double precision,
ADD COLUMN IF NOT EXISTS boundary_polygon jsonb,
ADD COLUMN IF NOT EXISTS geofence_radius_meters integer DEFAULT 100;

-- Add comment for documentation
COMMENT ON COLUMN public.sites.geofence_radius_meters IS 'Geofence alert trigger radius in meters (10-500m)';
COMMENT ON COLUMN public.ptw_projects.latitude IS 'Project center latitude coordinate';
COMMENT ON COLUMN public.ptw_projects.longitude IS 'Project center longitude coordinate';
COMMENT ON COLUMN public.ptw_projects.boundary_polygon IS 'Project boundary polygon as array of {lat, lng} coordinates';
COMMENT ON COLUMN public.ptw_projects.geofence_radius_meters IS 'Geofence alert trigger radius in meters (10-500m)';
COMMENT ON COLUMN public.contractor_projects.latitude IS 'Project center latitude coordinate';
COMMENT ON COLUMN public.contractor_projects.longitude IS 'Project center longitude coordinate';
COMMENT ON COLUMN public.contractor_projects.boundary_polygon IS 'Project boundary polygon as array of {lat, lng} coordinates';
COMMENT ON COLUMN public.contractor_projects.geofence_radius_meters IS 'Geofence alert trigger radius in meters (10-500m)';