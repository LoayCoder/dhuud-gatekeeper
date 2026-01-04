-- Add nc_category and objective_evidence columns to area_inspection_responses
-- These columns are needed for proper audit session NC classification and evidence tracking

ALTER TABLE public.area_inspection_responses 
ADD COLUMN IF NOT EXISTS nc_category text CHECK (nc_category IN ('minor', 'major', 'critical')),
ADD COLUMN IF NOT EXISTS objective_evidence text;

-- Add comment for documentation
COMMENT ON COLUMN public.area_inspection_responses.nc_category IS 'Non-conformance category: minor, major, or critical';
COMMENT ON COLUMN public.area_inspection_responses.objective_evidence IS 'Objective evidence supporting the audit finding';

-- Create index for filtering by nc_category
CREATE INDEX IF NOT EXISTS idx_area_inspection_responses_nc_category 
ON public.area_inspection_responses(nc_category) 
WHERE nc_category IS NOT NULL AND deleted_at IS NULL;