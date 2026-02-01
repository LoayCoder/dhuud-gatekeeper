

# Fix: Remove `ura.deleted_at` Reference in `can_approve_gate_pass` Function

## Problem Confirmed

The error **"column ura.deleted_at does not exist"** is still occurring because the `can_approve_gate_pass` function was NOT fixed in the previous migration.

| Function | Status |
|:---------|:-------|
| `get_user_pending_gate_passes` | Fixed |
| `can_approve_gate_pass` | **Still broken - needs fix** |

### Error Location (Line 33)
```sql
SELECT array_agg(r.code)
INTO v_user_roles
FROM user_role_assignments ura
JOIN roles r ON r.id = ura.role_id AND r.is_active = true
WHERE ura.user_id = p_user_id AND ura.deleted_at IS NULL;  -- THIS LINE
```

---

## Solution

Create a database migration to update the `can_approve_gate_pass` function, removing the invalid `ura.deleted_at` reference.

### SQL Fix
```sql
-- Change from:
WHERE ura.user_id = p_user_id AND ura.deleted_at IS NULL;

-- To:
WHERE ura.user_id = p_user_id;
```

---

## Files to Create

| File | Action | Description |
|:-----|:-------|:------------|
| New migration SQL | **Create** | Update `can_approve_gate_pass` to remove invalid column reference |

---

## Technical Details

The migration will:
1. Use `CREATE OR REPLACE FUNCTION` to update the existing function
2. Remove only the `AND ura.deleted_at IS NULL` condition
3. Keep all other logic intact (role checks, approval stages, permissions)

---

## Expected Result

After migration:
1. Khaled (Department Representative) can approve gate passes without errors
2. All approval workflow stages will function correctly
3. No more `ura.deleted_at does not exist` errors in the logs

