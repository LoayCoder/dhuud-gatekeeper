

# Fix: Remove `ura.deleted_at` References in Gate Pass Approval Functions

## Problem Summary

When a Department Representative tries to approve a gate pass, the system throws an error:
```
Failed: column ura.deleted_at does not exist
```

## Root Cause

The `user_role_assignments` table does NOT have a `deleted_at` column. The table schema shows:
- `id`, `user_id`, `role_id`, `tenant_id`, `assigned_at`, `assigned_by`, `branch_id`, `site_id`

However, two database functions still reference `ura.deleted_at`:

1. **`can_approve_gate_pass`** (line 38):
   ```sql
   WHERE ura.user_id = p_user_id AND ura.deleted_at IS NULL;
   ```

2. **`get_user_pending_gate_passes`** (line 168):
   ```sql
   WHERE ura.user_id = p_user_id AND ura.deleted_at IS NULL;
   ```

## Solution

Create a migration to update both functions, removing the invalid `ura.deleted_at` filter.

---

## Database Migration

A single migration file will update both functions:

### Changes to `can_approve_gate_pass` function:
```sql
-- Line 38: Change FROM
WHERE ura.user_id = p_user_id AND ura.deleted_at IS NULL;
-- TO
WHERE ura.user_id = p_user_id;
```

### Changes to `get_user_pending_gate_passes` function:
```sql
-- Line 168: Change FROM
WHERE ura.user_id = p_user_id AND ura.deleted_at IS NULL;
-- TO
WHERE ura.user_id = p_user_id;
```

---

## Files to Modify

| File | Action | Description |
|:-----|:-------|:------------|
| New migration SQL file | **Create** | Fix both RPC functions by removing `ura.deleted_at` references |

---

## Technical Notes

- The `roles` table has an `is_active` column that's already being checked (`r.is_active = true`)
- This provides the necessary filtering for inactive roles without needing a `deleted_at` column on role assignments
- The memory from the project confirms this fix was supposed to be applied but was missed in these specific functions

---

## Expected Result

After the migration runs:
1. Department Representatives can approve gate passes without errors
2. The approval workflow proceeds correctly through all stages
3. No more `ura.deleted_at does not exist` errors in postgres logs

