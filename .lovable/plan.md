
# Add Database-Level Unique Constraints for Organizational Structure

## Current State Analysis

| Table | Current Constraint | Issue |
|:------|:-------------------|:------|
| **divisions** | None | Duplicates possible |
| **departments** | `(tenant_id, branch_id, division_id, name)` | Allows duplicates across branches (e.g., "Corporate Affairs" in both RGC and DGC) |
| **sections** | `(tenant_id, branch_id, department_id, name)` | Same issue - allows cross-branch duplicates |
| **branches** | None | Duplicates possible |
| **sites** | None | Duplicates possible |

## Proposed Solution

Create simple `(tenant_id, name)` unique constraints that:
- Apply only to active records (`WHERE deleted_at IS NULL`)
- Replace the complex multi-column constraints for departments/sections
- Add new constraints for divisions, branches, and sites

---

## Migration SQL

```sql
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
```

---

## Key Design Decisions

| Decision | Rationale |
|:---------|:----------|
| **Use `LOWER(name)`** | Case-insensitive matching prevents "Corporate Affairs" vs "corporate affairs" duplicates |
| **Partial index with `WHERE deleted_at IS NULL`** | Soft-deleted records don't block new items with same name |
| **Drop old complex constraints** | The branch_id+division_id constraints defeated the hybrid model purpose |
| **Include branches and sites** | Full protection for all organizational structure items |

---

## Pre-Migration Check Required

Before running the migration, we need to verify there are no existing duplicates that would violate the new constraints. If duplicates exist (besides the ones we already cleaned up), the migration will fail.

**Verification query to run first:**
```sql
-- Check for duplicate divisions within tenant
SELECT tenant_id, LOWER(name), COUNT(*) 
FROM divisions 
WHERE deleted_at IS NULL 
GROUP BY tenant_id, LOWER(name) 
HAVING COUNT(*) > 1;

-- Check for duplicate departments within tenant
SELECT tenant_id, LOWER(name), COUNT(*) 
FROM departments 
WHERE deleted_at IS NULL 
GROUP BY tenant_id, LOWER(name) 
HAVING COUNT(*) > 1;

-- Check for duplicate sections within tenant
SELECT tenant_id, LOWER(name), COUNT(*) 
FROM sections 
WHERE deleted_at IS NULL 
GROUP BY tenant_id, LOWER(name) 
HAVING COUNT(*) > 1;

-- Check for duplicate branches within tenant
SELECT tenant_id, LOWER(name), COUNT(*) 
FROM branches 
WHERE deleted_at IS NULL 
GROUP BY tenant_id, LOWER(name) 
HAVING COUNT(*) > 1;

-- Check for duplicate sites within tenant
SELECT tenant_id, LOWER(name), COUNT(*) 
FROM sites 
WHERE deleted_at IS NULL 
GROUP BY tenant_id, LOWER(name) 
HAVING COUNT(*) > 1;
```

---

## Expected Outcome

After this migration:
- No two divisions, departments, sections, branches, or sites can have the same name within a tenant
- The database itself enforces this rule (defense in depth with UI validation)
- Soft-deleted items can be recreated with the same name
- Case differences like "HR" vs "hr" are treated as duplicates
