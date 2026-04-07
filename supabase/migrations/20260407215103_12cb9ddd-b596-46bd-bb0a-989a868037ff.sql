
-- Add project_type column
ALTER TABLE public.contractor_projects
ADD COLUMN IF NOT EXISTS project_type text NOT NULL DEFAULT 'contractor';

-- Add check constraint for project_type
ALTER TABLE public.contractor_projects
ADD CONSTRAINT contractor_projects_project_type_check
CHECK (project_type IN ('internal', 'contractor'));

-- Make company_id nullable
ALTER TABLE public.contractor_projects
ALTER COLUMN company_id DROP NOT NULL;

-- Fix status constraint: drop old and recreate with 'planned' included
ALTER TABLE public.contractor_projects
DROP CONSTRAINT IF EXISTS contractor_projects_status_check;

ALTER TABLE public.contractor_projects
ADD CONSTRAINT contractor_projects_status_check
CHECK (status IN ('planned', 'active', 'completed', 'suspended', 'cancelled'));
