

# Fix Duplicate Validation Logic: Branch-Scoped Uniqueness (Updated)

## Problem
Currently, all organizational entities enforce **tenant-wide** name uniqueness. This blocks creating entities like a Site called "Main Campus" under Branch B if one already exists under Branch A.

## Updated Rule
- **Sites, Buildings, Floors, Zones, Departments, Sections**: Uniqueness is scoped to the **same branch** -- duplicates across different branches are allowed.
- **Divisions**: Remain **tenant-wide unique** -- no duplicate Division names allowed, even across branches.
- **Branches**: Remain **tenant-wide unique** (unchanged).

## What Changes

### 1. Database Migration

Drop and recreate unique indexes for branch-scoped entities only. Divisions index stays as-is.

```text
| Entity          | Constraint                                              |
|-----------------|---------------------------------------------------------|
| Sites           | (tenant_id, branch_id, LOWER(name))          -- NEW    |
| Departments     | (tenant_id, COALESCE(branch_id, nil), LOWER(name)) NEW |
| Sections        | (tenant_id, COALESCE(branch_id, nil), LOWER(name)) NEW |
| Divisions       | (tenant_id, LOWER(name))                -- UNCHANGED   |
| Branches        | (tenant_id, LOWER(name))                -- UNCHANGED   |
```

Migration SQL:

```sql
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

-- Divisions index is NOT changed -- stays tenant-wide
```

### 2. Frontend: Update Duplicate Checks in OrgStructure.tsx

Update in-memory duplicate checks for **Sites, Departments, and Sections only** to compare within the same branch:

- **Sites**: Filter by `branch_id === parentId`
- **Departments**: Filter by `branch_id === selectedBranch` (or both null for hybrid)
- **Sections**: Filter by `branch_id === selectedBranch` (or both null for hybrid)
- **Divisions**: No change -- keep tenant-wide duplicate check

### 3. Translation Messages

Update error messages for Sites, Departments, and Sections to say "already exists **in this branch**."

Divisions message stays as "already exists" (tenant-wide).

Updates in both `en/translation.json` and `ar/translation.json`.

## Files Modified

1. **New migration file** -- Drop old indexes for Sites/Departments/Sections, create branch-scoped replacements
2. **`src/pages/admin/OrgStructure.tsx`** -- Update 3 duplicate check blocks (Sites, Departments, Sections)
3. **`src/locales/en/translation.json`** -- Update duplicate error messages for Sites/Departments/Sections
4. **`src/locales/ar/translation.json`** -- Update Arabic duplicate error messages for Sites/Departments/Sections

