
# Fix: Security Supervisor Approval Error - `gen_random_bytes` Function Not Found

## Problem Summary

When the Security Supervisor tries to approve a gate pass, the system returns:
```
Failed: function gen_random_bytes(integer) does not exist
```

## Root Cause Analysis

| Component | Current State | Issue |
|:----------|:--------------|:------|
| `pgcrypto` extension | Installed in `extensions` schema | Not in `public` schema |
| `gen_random_bytes` function | Located at `extensions.gen_random_bytes()` | Not accessible via unqualified call |
| `approve_gate_pass_unified` | Uses `gen_random_bytes(32)` | Missing schema prefix |
| Function `search_path` | Set to `public` | Cannot resolve `extensions.gen_random_bytes` |

The `approve_gate_pass_unified` function generates a QR token when Security or Safety approves a gate pass:
```sql
WHEN 'security' THEN
  v_qr_token := encode(gen_random_bytes(32), 'hex');  -- FAILS here
```

---

## Solution

Update the `approve_gate_pass_unified` function to use the fully qualified function name: `extensions.gen_random_bytes(32)`.

---

## Technical Implementation

### Database Migration

Create a new migration to fix the function:

```sql
-- Fix gen_random_bytes reference in approve_gate_pass_unified
-- The pgcrypto extension is installed in 'extensions' schema, not 'public'

DROP FUNCTION IF EXISTS approve_gate_pass_unified(UUID, UUID, TEXT, TEXT);

CREATE OR REPLACE FUNCTION approve_gate_pass_unified(
  p_user_id UUID,
  p_gate_pass_id UUID,
  p_action TEXT,
  p_notes TEXT DEFAULT NULL
) RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pass RECORD;
  v_stage TEXT;
  v_new_status TEXT;
  v_qr_token TEXT;
  v_can_approve JSONB;
BEGIN
  -- ... existing logic ...

  WHEN 'security' THEN
    -- FIXED: Use extensions.gen_random_bytes instead of gen_random_bytes
    v_qr_token := encode(extensions.gen_random_bytes(32), 'hex');
    -- ... rest of update ...

  WHEN 'safety' THEN
    -- FIXED: Use extensions.gen_random_bytes instead of gen_random_bytes
    v_qr_token := encode(extensions.gen_random_bytes(32), 'hex');
    -- ... rest of update ...
END;
$$;
```

---

## Files to Modify

| Type | Action | Description |
|:-----|:-------|:------------|
| Database Migration | Create | Fix `approve_gate_pass_unified` to use `extensions.gen_random_bytes()` |

---

## Expected Result

After this fix:
- Security Supervisor can approve gate passes without errors
- Safety Officer can approve gate passes without errors
- QR codes are generated correctly upon final approval
- The approval workflow completes successfully

---

## Technical Notes

- The `pgcrypto` extension is in the `extensions` schema (standard Supabase configuration)
- Using fully qualified schema names ensures compatibility regardless of `search_path`
- Both `security` and `safety` approval stages use `gen_random_bytes` and need the fix
