-- Add linked_contractor_project_id column to ptw_projects table
ALTER TABLE public.ptw_projects 
ADD COLUMN linked_contractor_project_id UUID REFERENCES public.contractor_projects(id);

-- Add index for better query performance
CREATE INDEX idx_ptw_projects_linked_contractor_project 
ON public.ptw_projects(linked_contractor_project_id) 
WHERE linked_contractor_project_id IS NOT NULL;