
-- Drop old tenant-wide indexes (Sites, Departments, Sections only)
DROP INDEX IF EXISTS idx_sites_unique_tenant_name;
DROP INDEX IF EXISTS idx_departments_unique_tenant_name;
DROP INDEX IF EXISTS idx_sections_unique_tenant_name;

-- Recreate as branch-scoped
CREATE UNIQUE INDEX idx_sites_unique_branch_name
  ON public.sites (tenant_id, branch_id, LOWER(name))
  WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX idx_departments_unique_branch_name
  ON public.departments (tenant_id, COALESCE(branch_id, '00000000-0000-0000-0000-000000000000'::uuid), LOWER(name))
  WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX idx_sections_unique_branch_name
  ON public.sections (tenant_id, COALESCE(branch_id, '00000000-0000-0000-0000-000000000000'::uuid), LOWER(name))
  WHERE deleted_at IS NULL;
