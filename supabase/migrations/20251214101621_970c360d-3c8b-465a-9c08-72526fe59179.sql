-- Add radius_meters to patrol_checkpoints for configurable GPS validation radius
ALTER TABLE public.patrol_checkpoints 
ADD COLUMN IF NOT EXISTS radius_meters integer DEFAULT 20;

-- Add comment for clarity
COMMENT ON COLUMN public.patrol_checkpoints.radius_meters IS 'GPS validation radius in meters. Guard must be within this distance to log checkpoint.';