

# Fix Gate Pass Approval Authorization (Permanent System Fix)

## Problem
The `can_approve_gate_pass` SQL function has three systemic issues that block legitimate approvals:

1. **Missing `manager` role**: The `dept_approval` stage only recognizes `department_representative` and `department_manager` roles — but the system uses `manager` role (there is no `department_manager` role in the database at all)
2. **No admin bypass**: Admin and super-admin users cannot override approval stages
3. **Auto-resolver has no fallback chain**: If a department has no Department Representative, the request gets stuck instead of falling back to the department's manager

These are permanent system-level fixes, not user-specific patches.

## Changes

### 1. Update `can_approve_gate_pass` SQL Function

**`dept_approval` stage** — expand role checks and add flexibility:
- Add **admin/super-admin bypass** at the top of the function (checks `is_admin` or `is_super_admin` on profile)
- Allow `manager` role to approve `dept_approval` stage — managers who are the designated `approval_from_id` should not be blocked
- Keep department matching for `department_representative` role (they have narrower scope)
- Allow `manager` role users who are in the `manager_team` of the requester to approve regardless of department match

**`pm` stage** — apply the same `manager` role fix for consistency

### 2. Update `get_auto_approver_for_gate_pass` SQL Function

Add a fallback chain when resolving the auto-approver for normal employees:
1. First, look for a `department_representative` in the same department (current behavior)
2. If none found, look for a `department_manager` or `manager` role user in the same department
3. If none found, look for the user's manager via `manager_team` table
4. If none found, return `auto_resolved: false` so the UI shows a manual dropdown

### 3. Update the simpler `can_approve_gate_pass` (boolean version)

The boolean overload (used by RLS policies) also needs `manager` added to the `pending_dept_approval` check — currently it only checks `department_representative` and `department_manager`.

---

## Technical Detail

### Admin Bypass (added at top of JSONB function)
```sql
-- Check if user is admin or super_admin → bypass all checks
IF EXISTS (
  SELECT 1 FROM profiles 
  WHERE id = p_user_id AND (is_admin = true OR is_super_admin = true)
  AND tenant_id = v_user_tenant_id
) THEN
  RETURN jsonb_build_object('allowed', true);
END IF;
```

### dept_approval Stage Fix
```sql
WHEN 'dept_approval' THEN
  -- Managers can approve (they have broader authority)
  IF EXISTS (SELECT 1 FROM user_roles_cte WHERE code = 'manager') THEN
    RETURN jsonb_build_object('allowed', true);
  END IF;
  -- Dept reps require same department
  IF v_is_dept_rep AND (department match check) THEN
    RETURN jsonb_build_object('allowed', true);
  END IF;
```

### Auto-Resolver Fallback Chain
```sql
-- Step 1: Find dept_representative in same department (existing)
-- Step 2: Find manager role user in same department (NEW)
-- Step 3: Find manager via manager_team table (NEW)
-- Step 4: Return auto_resolved = false (existing fallback)
```

## Summary
| Change | Type | Scope |
|--------|------|-------|
| Add admin bypass to `can_approve_gate_pass` | SQL migration | All gate pass approvals |
| Add `manager` role to dept_approval stage | SQL migration | All internal gate passes |
| Add fallback chain to `get_auto_approver_for_gate_pass` | SQL migration | Auto-routing for new requests |
| Fix boolean overload of `can_approve_gate_pass` | SQL migration | RLS policy compatibility |

Single SQL migration. No frontend changes needed.

