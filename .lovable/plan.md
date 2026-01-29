
# Comprehensive Reporting Health Check - Complete Fix Plan

## Remove Duplicate Contractor Company Records

### Objective
Soft-delete two duplicate "P50 4" contractor company entries that were identified as causing filtering issues.

### Records to Remove
| ID | Created At |
|:---|:-----------|
| `c0c43902-9c0d-4efd-bab7-e5cce795f6f0` | 10:59:57 |
| `089ba2c3-ea47-439a-9e00-844cd9044888` | 10:58:21 |

### Implementation Approach

Following HSSA data privacy standards, we will perform a **soft delete** (setting `deleted_at` timestamp) rather than a hard delete.

### Technical Details

**SQL Operation:**
```sql
UPDATE contractor_companies
SET deleted_at = NOW(),
    updated_at = NOW()
WHERE id IN (
  'c0c43902-9c0d-4efd-bab7-e5cce795f6f0',
  '089ba2c3-ea47-439a-9e00-844cd9044888'
)
AND deleted_at IS NULL;
```

### Safety Checks
- Both records already have `assigned_branch_id = NULL` (not in active use)
- Existing queries filter by `deleted_at IS NULL`, so soft-deleted records will be excluded automatically
- No foreign key dependencies will be broken (records remain in database)

### Verification
After execution, the dropdown will no longer show these duplicate entries, and the properly configured "P54" company (with correct branch assignment) can be added.

| Change | Risk | Impact |
|--------|------|--------|
| Fix `ura.created_at` → `ura.assigned_at` | Low | Fixes submission blocking error |
| Add enum values | Low | Enables contractor violation workflow |
| Remove witness_statements.status filter | Low | Removes dead code reference |
