

# Fix: GBR Representative Data Missing After Migration

## Root Cause

The previous changes updated the code to read/write from `contractor_representatives` instead of `contractor_site_representatives`. However, the existing data for islam@gbrksa.com was never migrated. The record exists only in `contractor_site_representatives` (company_id `4f28d657-...`), so the UI now shows "Not assigned".

## Solution

### Step 1: Database migration — copy existing site reps to contractor_representatives

Create a migration that copies all records from `contractor_site_representatives` (where `deleted_at IS NULL`) into `contractor_representatives` with `is_primary = true`, skipping any company that already has a primary rep. This is a one-time data migration to preserve existing data.

```sql
INSERT INTO contractor_representatives (tenant_id, company_id, full_name, national_id, mobile_number, email, is_primary)
SELECT tenant_id, company_id, full_name, national_id, mobile_number, email, true
FROM contractor_site_representatives
WHERE deleted_at IS NULL
  AND company_id NOT IN (
    SELECT company_id FROM contractor_representatives WHERE is_primary = true AND deleted_at IS NULL
  );
```

### Step 2: Fix label in CompanyDetailDialog.tsx

Line 309: Change `"Contractor's Site Representative"` → `"Contractor's Representative"`.

## Files Changed

| File | Change |
|------|--------|
| Database migration | One-time data copy from `contractor_site_representatives` → `contractor_representatives` |
| `CompanyDetailDialog.tsx` line 309 | Update label to "Contractor's Representative" |

## After Fix
- islam@gbrksa.com will appear in the Personnel tab for GBR
- All other companies with site reps in the old table will also be migrated
- "Send Portal Invitation" will find the correct record

