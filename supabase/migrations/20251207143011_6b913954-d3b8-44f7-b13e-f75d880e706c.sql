-- Add branch_id and site_id columns to inspection_templates table
ALTER TABLE public.inspection_templates
ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS site_id uuid REFERENCES public.sites(id) ON DELETE SET NULL;

-- Add indexes for query performance
CREATE INDEX IF NOT EXISTS idx_inspection_templates_branch_id ON public.inspection_templates(branch_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_inspection_templates_site_id ON public.inspection_templates(site_id) WHERE deleted_at IS NULL;