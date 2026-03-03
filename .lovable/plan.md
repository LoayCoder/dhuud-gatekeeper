

# Fix "column ur.role_id does not exist" Error on Observation Submit

## Root Cause

The `auto_route_observation_on_submit()` trigger function and `consultant_complete_screening()` function (last updated in migration `20260224033822`) reference the **wrong table**. They query `user_roles ur` and join on `ur.role_id`, but the `user_roles` table only has columns `(id, user_id, role, created_at)` — there is no `role_id` column.

The correct table is `user_role_assignments`, which has `role_id`, `tenant_id`, `branch_id`, etc.

## Fix

A single database migration that recreates both functions, replacing all `user_roles ur` references with `user_role_assignments ur`:

### Functions to fix:
1. **`auto_route_observation_on_submit()`** — 2 queries referencing `user_roles ur` (lines 44, 65)
2. **`consultant_complete_screening()`** — 3 queries referencing `user_roles ur` (lines 148, 164, 179)

### Change pattern (applied 5 times):
```sql
-- Before (broken)
FROM user_roles ur
JOIN profiles p ON p.id = ur.user_id
JOIN roles r ON r.id = ur.role_id

-- After (correct)
FROM user_role_assignments ur
JOIN profiles p ON p.id = ur.user_id
JOIN roles r ON r.id = ur.role_id
```

Additionally, `user_role_assignments` does not have a `deleted_at` column, so the `ur.deleted_at IS NULL` filter must be removed from all 5 queries.

The `auto_route_observation_on_submit` function also uses `p.branch_id` for profile matching, but the profiles table uses `assigned_branch_id`. This will also be corrected to use `ur.branch_id` from `user_role_assignments` (which has branch-level assignment data) or fall back properly.

### File
- **New migration** — Recreate both functions with corrected table references

