-- 1. Drop existing complex constraints (they allow cross-branch duplicates)
DROP INDEX IF EXISTS idx_departments_unique_composite;
DROP INDEX IF EXISTS idx_sections_unique_composite;

-- 2. Add simple tenant-wide unique constraints for divisions
CREATE UNIQUE INDEX idx_divisions_unique_tenant_name
ON public.divisions (tenant_id, LOWER(name))
WHERE deleted_at IS NULL;

-- 3. Add simple tenant-wide unique constraints for departments
CREATE UNIQUE INDEX idx_departments_unique_tenant_name
ON public.departments (tenant_id, LOWER(name))
WHERE deleted_at IS NULL;

-- 4. Add simple tenant-wide unique constraints for sections
CREATE UNIQUE INDEX idx_sections_unique_tenant_name
ON public.sections (tenant_id, LOWER(name))
WHERE deleted_at IS NULL;

-- 5. Add unique constraint for branches
CREATE UNIQUE INDEX idx_branches_unique_tenant_name
ON public.branches (tenant_id, LOWER(name))
WHERE deleted_at IS NULL;

-- 6. Add unique constraint for sites
CREATE UNIQUE INDEX idx_sites_unique_tenant_name
ON public.sites (tenant_id, LOWER(name))
WHERE deleted_at IS NULL;

-- 7. Add helpful comments
COMMENT ON INDEX idx_divisions_unique_tenant_name IS 
  'Enforces unique division names within a tenant (case-insensitive, active records only)';
COMMENT ON INDEX idx_departments_unique_tenant_name IS 
  'Enforces unique department names within a tenant (case-insensitive, active records only)';
COMMENT ON INDEX idx_sections_unique_tenant_name IS 
  'Enforces unique section names within a tenant (case-insensitive, active records only)';
COMMENT ON INDEX idx_branches_unique_tenant_name IS 
  'Enforces unique branch names within a tenant (case-insensitive, active records only)';
COMMENT ON INDEX idx_sites_unique_tenant_name IS 
  'Enforces unique site names within a tenant (case-insensitive, active records only)';