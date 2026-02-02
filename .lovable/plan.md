
# Fix Organizational Structure: Divisions Display & Department Deduplication

## Problem Summary

### 1. Divisions Tab Shows Empty
When LUAY (RGC branch) views the Divisions tab, it shows "No items" despite 8 valid hybrid divisions existing.

**Root Cause**: The `applyBranchFilter` in the divisions query uses exact `branch_id` match:
```sql
WHERE branch_id = 'RGC-uuid'  -- But hybrid divisions have branch_id = NULL
```

All 8 active divisions in Golf Saudi are **hybrid** (branch_id = NULL), designed to be shared across both RGC and DGC branches.

### 2. Duplicate Departments (8 pairs)
Each department name exists twice - once for RGC and once for DGC:

| Department Name | RGC ID | DGC ID |
|:----------------|:-------|:-------|
| BCM | eb8f90b3... | 7565fc24... |
| Compliance Management | d778dd93... | 9597bc1c... |
| Corporate Affairs | 1976160f... | 44e35522... |
| Development | 5b571578... | 5e598d82... |
| Golf Club Management | e1a211c8... | c1f11b84... |
| Governance Management | ac86a5eb... | 9277cb4d... |
| PMO | f6db3de8... | 839f4195... |
| Risk Management | 6015c7cd... | 919fd52f... |

### 3. Cross-Tenant Reference (Critical Data Issue)
The **Safety** department (Golf Saudi) references an HSSE division from the **Dhuud Platform** tenant - this is a data integrity violation.

---

## Solution Plan

### Step 1: Fix Divisions Query (UI Bug)

**File**: `src/pages/admin/OrgStructure.tsx`

Modify the divisions query to include hybrid divisions (branch_id IS NULL) when filtering by branch:

```sql
-- Before (excludes hybrids)
WHERE branch_id = 'RGC-uuid'

-- After (includes hybrids)
WHERE (branch_id = 'RGC-uuid' OR branch_id IS NULL)
```

**Implementation**: Update the `applyBranchFilter` call for divisions to use an OR filter that includes NULL branch_ids.

### Step 2: Create Missing HSSE Division in Golf Saudi

Create a new hybrid HSSE division in Golf Saudi tenant to fix the cross-tenant reference:

```sql
INSERT INTO divisions (id, name, tenant_id, branch_id)
VALUES (
  gen_random_uuid(),
  'HSSE',
  'e30ae1a5-7eab-4776-bd0b-bb0b391e68e8',  -- Golf Saudi
  NULL  -- Hybrid
);
```

### Step 3: Fix Safety Department Reference

Update the Safety department to reference the new Golf Saudi HSSE division:

```sql
UPDATE departments
SET division_id = [new_hsse_id]
WHERE id = '507d35dd-4d4c-4bec-ba7a-0f5ea7bd63e0';  -- Safety dept
```

### Step 4: Consolidate Duplicate Departments

For each duplicate pair, we need to:
1. Pick one department as the "survivor" (preferably the one with more assignments)
2. Migrate all user profile assignments (`assigned_department_id`)
3. Migrate all site_departments mappings
4. Soft-delete the duplicate

**Migration Script** (example for Corporate Affairs):
```sql
-- 1. Check which Corporate Affairs has users assigned
SELECT assigned_department_id, COUNT(*) 
FROM profiles 
WHERE assigned_department_id IN ('1976160f...', '44e35522...')
GROUP BY assigned_department_id;

-- 2. Migrate users from duplicate to survivor
UPDATE profiles 
SET assigned_department_id = 'survivor_id'
WHERE assigned_department_id = 'duplicate_id';

-- 3. Migrate site_departments if any
UPDATE site_departments
SET department_id = 'survivor_id'
WHERE department_id = 'duplicate_id';

-- 4. Soft-delete the duplicate
UPDATE departments
SET deleted_at = NOW()
WHERE id = 'duplicate_id';
```

### Step 5: Make Surviving Departments Hybrid

After consolidation, update each surviving department to be hybrid (accessible from both branches):

```sql
UPDATE departments
SET branch_id = NULL
WHERE id IN ('survivor_ids...');
```

---

## Technical Details

### Files to Modify

| File | Change |
|:-----|:-------|
| `src/pages/admin/OrgStructure.tsx` | Fix divisions query to include NULL branch_ids |
| Database Migration | Create HSSE division, fix Safety reference, consolidate duplicates |

### Query Fix for Divisions

In `OrgStructure.tsx`, replace the divisions query filter (around line 189):

```typescript
// Current (broken)
divisionsQuery = applyBranchFilter(divisionsQuery);

// Fixed - Include hybrid divisions
if (!isAllBranchesMode && branchIds && branchIds.length > 0) {
  if (branchIds.length === 1) {
    divisionsQuery = divisionsQuery.or(`branch_id.eq.${branchIds[0]},branch_id.is.null`);
  } else {
    divisionsQuery = divisionsQuery.or(`branch_id.in.(${branchIds.join(',')}),branch_id.is.null`);
  }
}
```

---

## Migration Steps Summary

1. **Create HSSE Division** in Golf Saudi tenant (hybrid)
2. **Fix Safety Department** → point to new Golf Saudi HSSE
3. **For each duplicate department pair**:
   - Identify which has user assignments
   - Migrate users and site_departments to survivor
   - Soft-delete the duplicate
4. **Convert survivors to hybrid** (branch_id = NULL)
5. **Update UI query** to show hybrid divisions

---

## Expected Result After Fix

- Divisions tab shows all 9 divisions (8 existing + new HSSE)
- Each department appears only once in the list
- Both RGC and DGC users see the same departments
- Safety department correctly references Golf Saudi HSSE division
- LUAY's `assigned_department_id` remains valid (Corporate Affairs becomes hybrid)

---

## Rollback Safety

All department deletions use soft-delete (setting `deleted_at` timestamp), so data can be recovered if needed.
