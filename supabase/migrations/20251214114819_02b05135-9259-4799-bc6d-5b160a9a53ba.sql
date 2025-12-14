-- Add geofence radius column to security_zones table
ALTER TABLE public.security_zones 
ADD COLUMN IF NOT EXISTS geofence_radius_meters INTEGER DEFAULT 50;

-- Add comment explaining the column
COMMENT ON COLUMN public.security_zones.geofence_radius_meters IS 'Breach detection tolerance radius in meters (default 50m)';