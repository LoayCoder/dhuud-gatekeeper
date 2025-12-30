-- Add related contractor company column to incidents table
ALTER TABLE public.incidents
ADD COLUMN related_contractor_company_id UUID REFERENCES contractor_companies(id);

-- Add index for performance
CREATE INDEX idx_incidents_related_contractor_company_id 
ON public.incidents(related_contractor_company_id) 
WHERE deleted_at IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.incidents.related_contractor_company_id IS 
'Links to contractor company responsible for the incident/observation (for violations/issues)';