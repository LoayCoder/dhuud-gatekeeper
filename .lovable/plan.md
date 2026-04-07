

# Fix: Replace `is_admin` Column Reference with RPC Function Call

## Problem
The migration created for gate pass approval references `is_admin` as a column on the `profiles` table (line 26), but it doesn't exist. `is_admin` is an **RPC function** (`public.is_admin(uuid)`) that checks `user_role_assignments`. Only `is_super_admin` is an actual column on `profiles`.

## Fix
Re-create all three functions in the migration, replacing every `is_admin` column reference with a call to `public.is_admin(p_user_id)`.

### Changes in the JSONB `can_approve_gate_pass` function:
```sql
-- BEFORE (broken):
SELECT tenant_id, COALESCE(is_admin, false), COALESCE(is_super_admin, false)
INTO v_user_tenant_id, v_is_admin, v_is_super_admin
FROM profiles WHERE id = p_user_id;

-- AFTER (fixed):
SELECT tenant_id, COALESCE(is_super_admin, false)
INTO v_user_tenant_id, v_is_super_admin
FROM profiles WHERE id = p_user_id;

v_is_admin := public.is_admin(p_user_id);
```

### Same fix in the boolean `can_approve_gate_pass` and `get_auto_approver_for_gate_pass`:
Any reference to `profiles.is_admin` must be replaced with `public.is_admin(p_user_id)`.

### Summary
Single SQL migration to recreate the three functions with the corrected admin check. No frontend changes.

