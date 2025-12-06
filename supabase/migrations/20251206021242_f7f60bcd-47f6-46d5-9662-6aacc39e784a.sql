-- Add site_id, branch_id, department_id, latitude, longitude to incidents table
ALTER TABLE public.incidents
ADD COLUMN IF NOT EXISTS site_id uuid REFERENCES public.sites(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS latitude double precision,
ADD COLUMN IF NOT EXISTS longitude double precision;

-- Create indexes for the new foreign keys
CREATE INDEX IF NOT EXISTS idx_incidents_site_id ON public.incidents(site_id);
CREATE INDEX IF NOT EXISTS idx_incidents_branch_id ON public.incidents(branch_id);
CREATE INDEX IF NOT EXISTS idx_incidents_department_id ON public.incidents(department_id);

-- Add comments for documentation
COMMENT ON COLUMN public.incidents.site_id IS 'Reference to the site where the incident occurred';
COMMENT ON COLUMN public.incidents.branch_id IS 'Reference to the branch where the incident occurred';
COMMENT ON COLUMN public.incidents.department_id IS 'Reference to the responsible department';
COMMENT ON COLUMN public.incidents.latitude IS 'GPS latitude coordinate of incident location';
COMMENT ON COLUMN public.incidents.longitude IS 'GPS longitude coordinate of incident location';