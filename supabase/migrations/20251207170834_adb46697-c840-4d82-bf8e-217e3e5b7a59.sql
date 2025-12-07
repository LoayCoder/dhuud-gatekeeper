-- Add source tracking columns to corrective_actions for inspection findings
ALTER TABLE public.corrective_actions 
ADD COLUMN IF NOT EXISTS source_type TEXT DEFAULT 'incident',
ADD COLUMN IF NOT EXISTS source_finding_id UUID REFERENCES public.area_inspection_findings(id) ON DELETE SET NULL;

-- Add index for finding lookups
CREATE INDEX IF NOT EXISTS idx_corrective_actions_source_finding 
ON public.corrective_actions(source_finding_id) 
WHERE source_finding_id IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.corrective_actions.source_type IS 'Source of action: incident, inspection_finding, observation';
COMMENT ON COLUMN public.corrective_actions.source_finding_id IS 'Reference to area_inspection_findings if created from inspection';