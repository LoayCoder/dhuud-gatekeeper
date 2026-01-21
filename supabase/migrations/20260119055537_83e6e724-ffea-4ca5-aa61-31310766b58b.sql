
-- Add composite unique constraint for departments
-- Rule: (tenant_id + branch_id + division_id + name) must be unique for active records
-- Uses COALESCE to handle NULL branch_id (hybrid departments)
CREATE UNIQUE INDEX IF NOT EXISTS idx_departments_unique_composite
ON departments (tenant_id, COALESCE(branch_id, '00000000-0000-0000-0000-000000000000'::uuid), division_id, name)
WHERE deleted_at IS NULL;

-- Add composite unique constraint for sections
-- Rule: (tenant_id + branch_id + department_id + name) must be unique for active records
CREATE UNIQUE INDEX IF NOT EXISTS idx_sections_unique_composite
ON sections (tenant_id, COALESCE(branch_id, '00000000-0000-0000-0000-000000000000'::uuid), department_id, name)
WHERE deleted_at IS NULL;

-- Add comment explaining the uniqueness rule
COMMENT ON INDEX idx_departments_unique_composite IS 'Enforces unique department names within the same tenant, branch, and division. Same department name CAN exist across different branches.';
COMMENT ON INDEX idx_sections_unique_composite IS 'Enforces unique section names within the same tenant, branch, and department.';
