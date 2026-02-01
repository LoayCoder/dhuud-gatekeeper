

# Fix: Remove `ura.deleted_at` from the 3-Parameter `can_approve_gate_pass` Function

## Problem Confirmed

The error **"column ura.deleted_at does not exist"** persists because there are **TWO VERSIONS** of the `can_approve_gate_pass` function:

| Function Signature | Status |
|:-------------------|:-------|
| `can_approve_gate_pass(uuid, uuid)` (2 params) | Fixed |
| `can_approve_gate_pass(uuid, uuid, text)` (3 params) | **STILL BROKEN** |

The actual approval workflow uses the **3-parameter version** via `approve_gate_pass_unified`:
```sql
v_can_approve := can_approve_gate_pass(p_user_id, p_gate_pass_id, v_stage);
```

### Error Location (Line 33 in the 3-param version)
```sql
SELECT array_agg(r.code)
INTO v_user_roles
FROM user_role_assignments ura
JOIN roles r ON r.id = ura.role_id AND r.is_active = true
WHERE ura.user_id = p_user_id AND ura.deleted_at IS NULL;  -- BROKEN
```

---

## Solution

Create a migration to fix the **3-parameter version** of `can_approve_gate_pass` by removing the invalid `ura.deleted_at` reference.

### SQL Fix
```sql
-- Change from:
WHERE ura.user_id = p_user_id AND ura.deleted_at IS NULL;

-- To:
WHERE ura.user_id = p_user_id;
```

---

## Database Migration

| File | Action | Description |
|:-----|:-------|:------------|
| New migration SQL file | **Create** | Update `can_approve_gate_pass(uuid, uuid, text)` function |

The migration will:
1. Use `CREATE OR REPLACE FUNCTION` to update the 3-parameter version
2. Remove the `AND ura.deleted_at IS NULL` condition from line 33
3. Keep all other logic intact (approval stage checks, role validations)
4. Grant EXECUTE permission to authenticated role

---

## Verification Data

| Entity | Details |
|:-------|:--------|
| **Khalid Al Shuhail** | User ID: `dcf0e39d-d2df-4c14-89bc-7b8ebab82b32` |
| **Roles** | `department_representative`, `normal_user` |
| **GP-2026-00001** | Status: `pending_dept_approval`, approval_from: Khalid |

---

## Expected Result

After migration:
1. Khalid Al Shuhail **will be able to approve** GP-2026-00001
2. All approval workflow stages will function correctly
3. No more `ura.deleted_at does not exist` errors

