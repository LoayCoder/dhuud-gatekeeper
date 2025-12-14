-- Add polygon_coords column to security_zones for geofence boundaries
ALTER TABLE public.security_zones 
ADD COLUMN IF NOT EXISTS polygon_coords JSONB DEFAULT '[]'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN public.security_zones.polygon_coords IS 'Array of [lat, lng] coordinate pairs defining zone boundary polygon';

-- Create index for spatial queries
CREATE INDEX IF NOT EXISTS idx_security_zones_polygon ON public.security_zones USING GIN (polygon_coords);

-- Enable realtime for guard tracking and alerts
ALTER PUBLICATION supabase_realtime ADD TABLE public.guard_tracking_history;
ALTER PUBLICATION supabase_realtime ADD TABLE public.geofence_alerts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.shift_roster;