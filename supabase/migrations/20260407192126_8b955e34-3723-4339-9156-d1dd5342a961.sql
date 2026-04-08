ALTER TABLE public.contractor_workers 
  ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.contractor_projects(id);