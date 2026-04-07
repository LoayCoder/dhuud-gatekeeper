ALTER TABLE public.risk_assessments
  DROP CONSTRAINT risk_assessments_project_id_fkey;

ALTER TABLE public.risk_assessments
  ADD CONSTRAINT risk_assessments_project_id_fkey
  FOREIGN KEY (project_id) REFERENCES public.contractor_projects(id);