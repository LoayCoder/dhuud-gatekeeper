

# Fix: User Management "No data available" — Root Cause Found

## Root Cause

The `get_users_with_roles_paginated` RPC function crashes with:

```
ERROR 42703: column uba.is_active does not exist
```

The `branch_agg` CTE inside the RPC references `uba.is_active` on the `user_branch_assignments` table, but that column does not exist. The table only has: `id, user_id, branch_id, access_level, is_primary, created_at, created_by, updated_at, deleted_at, tenant_id`.

This was introduced in the recent migration that added multi-branch name aggregation. The RPC silently fails on every call, returning zero rows, which the frontend renders as "No data available."

## Fix

### Step 1: Database migration — fix the RPC function

Replace `uba.is_active = true` with `uba.deleted_at IS NULL` in the `branch_agg` CTE:

```sql
-- Before (broken):
WHERE uba.is_active = true
  AND uba.deleted_at IS NULL

-- After (fixed):
WHERE uba.deleted_at IS NULL
```

This is a single-line change inside the `CREATE OR REPLACE FUNCTION get_users_with_roles_paginated` migration.

No frontend changes needed — the data layer and UI are correct; the RPC just needs to stop crashing.

## Impact
- All 29 users in the tenant will appear immediately
- Branch name aggregation will work using `deleted_at` for soft-delete filtering
- No security changes — same RLS enforcement

