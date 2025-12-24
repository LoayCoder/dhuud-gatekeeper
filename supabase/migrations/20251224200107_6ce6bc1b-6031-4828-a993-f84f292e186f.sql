-- Add descriptive location fields to incidents table
ALTER TABLE public.incidents ADD COLUMN IF NOT EXISTS location_country TEXT;
ALTER TABLE public.incidents ADD COLUMN IF NOT EXISTS location_city TEXT;
ALTER TABLE public.incidents ADD COLUMN IF NOT EXISTS location_district TEXT;
ALTER TABLE public.incidents ADD COLUMN IF NOT EXISTS location_street TEXT;
ALTER TABLE public.incidents ADD COLUMN IF NOT EXISTS location_formatted TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.incidents.location_country IS 'Country name from reverse geocoding';
COMMENT ON COLUMN public.incidents.location_city IS 'City name from reverse geocoding';
COMMENT ON COLUMN public.incidents.location_district IS 'Neighborhood/District from reverse geocoding';
COMMENT ON COLUMN public.incidents.location_street IS 'Street name from reverse geocoding';
COMMENT ON COLUMN public.incidents.location_formatted IS 'Full formatted address from reverse geocoding';