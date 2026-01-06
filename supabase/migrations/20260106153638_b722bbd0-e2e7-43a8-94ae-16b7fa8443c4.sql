-- Add HSSE classification columns to asset_categories
ALTER TABLE public.asset_categories 
ADD COLUMN IF NOT EXISTS hsse_category text;

ALTER TABLE public.asset_categories 
ADD COLUMN IF NOT EXISTS hsse_type text;

-- Add comments for documentation
COMMENT ON COLUMN public.asset_categories.hsse_category IS 'HSSE classification category (fire_safety, ppe, emergency_equipment, etc.)';
COMMENT ON COLUMN public.asset_categories.hsse_type IS 'HSSE type classification (critical, standard, auxiliary)';