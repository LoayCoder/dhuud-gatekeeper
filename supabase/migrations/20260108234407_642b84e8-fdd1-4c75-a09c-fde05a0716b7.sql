-- Add columns to link tags to contractor or department
ALTER TABLE public.incidents ADD COLUMN IF NOT EXISTS tag_contractor_id UUID REFERENCES public.contractor_companies(id);
ALTER TABLE public.incidents ADD COLUMN IF NOT EXISTS tag_department_id UUID REFERENCES public.departments(id);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_incidents_tag_contractor_id ON public.incidents(tag_contractor_id) WHERE tag_contractor_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_incidents_tag_department_id ON public.incidents(tag_department_id) WHERE tag_department_id IS NOT NULL;