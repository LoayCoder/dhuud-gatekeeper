

# Fix: Column "reference_id" Does Not Exist Error

## Root Cause

The `submit_public_gate_pass` database function references a **non-existent column** `reference_id`, but the actual column in the `material_gate_passes` table is named `reference_number`.

| Location | Column Name Used | Actual Column Name |
|----------|------------------|-------------------|
| RPC Function (line 183) | `reference_id` | **Should be** `reference_number` |
| RPC Function (line 176) | `v_reference_id` | Variable name (OK) |
| Database Table | N/A | `reference_number` |

## Technical Fix

Create a migration to update the `submit_public_gate_pass` function, replacing `reference_id` with `reference_number` in the INSERT statement.

### Migration SQL

```sql
-- Fix submit_public_gate_pass function: change reference_id to reference_number
CREATE OR REPLACE FUNCTION submit_public_gate_pass(
  -- ... same parameters ...
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
  v_tenant_name TEXT;
  v_gate_pass_id UUID;
  v_access_token UUID;
  v_reference_number TEXT;  -- renamed variable for clarity
  v_rate_limit_count INTEGER;
  v_branch_valid BOOLEAN;
BEGIN
  -- ... same validation logic ...

  -- Generate access token and reference number
  v_access_token := gen_random_uuid();
  v_reference_number := 'PUB-' || to_char(now(), 'YYYYMMDD') || '-' || 
                        substring(v_access_token::text from 1 for 8);

  -- Create the gate pass (FIXED: use reference_number instead of reference_id)
  INSERT INTO material_gate_passes (
    tenant_id,
    branch_id,
    reference_number,  -- ← FIXED: was reference_id
    pass_type,
    -- ... rest of columns ...
  ) VALUES (
    v_tenant_id,
    p_branch_id,
    v_reference_number,  -- ← FIXED: was v_reference_id
    p_pass_type,
    -- ... rest of values ...
  )
  RETURNING id INTO v_gate_pass_id;

  RETURN jsonb_build_object(
    'success', true,
    'gate_pass_id', v_gate_pass_id,
    'reference_number', v_reference_number,  -- ← Also update return key
    'public_access_token', v_access_token,
    'message', 'Gate pass request submitted successfully'
  );
END;
$$;
```

## Files to Modify

| File | Action |
|------|--------|
| Database Migration | **Create** - Fix the `submit_public_gate_pass` function |

## Additional Fix: Handle `requested_by` NOT NULL Constraint

The `material_gate_passes` table requires `requested_by` (line 14348, 14422), which is a user ID. For public requests without authentication, this needs to be handled:

**Option A**: Make `requested_by` nullable for public requests (requires ALTER TABLE)
**Option B**: Use a system/placeholder UUID for public requests
**Option C**: Use `approval_from_id` or another nullable field

I will use **Option B**: Create a constant system UUID or use the `public_requester_name` field to identify the requester, while setting `requested_by` to a placeholder value that the function can generate.

Actually, looking more carefully, the function doesn't set `requested_by` at all, which is also a problem since it's a required column. We need to handle this as well.

## Complete Fix Summary

1. Change `reference_id` to `reference_number` in the INSERT statement
2. Handle the `requested_by` NOT NULL constraint for public requests

