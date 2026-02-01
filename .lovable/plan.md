

# Comprehensive Fix: `can_approve_gate_pass` Function

## Problems Identified

The 3-parameter `can_approve_gate_pass(uuid, uuid, text)` function has **multiple errors**:

| Line | Issue | Wrong Value | Correct Value |
|:-----|:------|:------------|:--------------|
| 139 | Non-existent column | `cc.consultant_id` | `cc.assigned_client_pm_id` |
| 172 | Wrong column name | `v_gate_pass.approval_from` | `approval_from_id` |
| Return | Type mismatch | Returns `BOOLEAN` | Should return `JSONB` |

### Critical Type Mismatch

The `approve_gate_pass_unified` function expects `can_approve_gate_pass` to return **JSONB**:
```sql
v_can_approve JSONB;
...
v_can_approve := can_approve_gate_pass(p_user_id, p_gate_pass_id, v_stage);
IF NOT (v_can_approve->>'allowed')::BOOLEAN THEN
  RAISE EXCEPTION 'Not authorized: %', v_can_approve->>'reason';
```

But the current function returns `BOOLEAN`, causing a type error.

---

## Solution

Create a database migration that completely rewrites the 3-parameter function to:

1. **Fix column references**:
   - Change `cc.consultant_id` to `cc.assigned_client_pm_id`
   - Change `approval_from` to `approval_from_id`

2. **Fix return type**: Change from `BOOLEAN` to `JSONB` with structure:
```sql
RETURN jsonb_build_object('allowed', true);
-- or
RETURN jsonb_build_object('allowed', false, 'reason', 'Not authorized...');
```

---

## Database Migration

| File | Action | Description |
|:-----|:-------|:------------|
| New migration SQL file | **Create** | Complete rewrite of `can_approve_gate_pass(uuid, uuid, text)` |

The migration will:
1. Drop the existing 3-parameter function
2. Create new function returning `JSONB`
3. Fix all column references to match actual schema
4. Grant EXECUTE permission to authenticated role

---

## SQL Changes Summary

```sql
-- Column fixes:
cc.consultant_id → cc.assigned_client_pm_id
v_gate_pass.approval_from → approval_from_id

-- Return type fix:
RETURNS boolean → RETURNS jsonb

-- Return statements:
RETURN true → RETURN jsonb_build_object('allowed', true)
RETURN false → RETURN jsonb_build_object('allowed', false, 'reason', '...')
```

---

## Expected Result

After migration:
1. No more `column cc.consultant_id does not exist` errors
2. No more `column approval_from does not exist` errors
3. Proper JSONB return type matching `approve_gate_pass_unified` expectations
4. Khalid Al Shuhail will be able to approve **GP-2026-00001**
5. Complete gate pass approval workflow will function correctly

