

# Fix `submit_public_gate_pass` Schema Cache Error

## Root Cause

The migration `20260218000000_gate_pass_entry_exit_rules.sql` **never executed** against the live database. The database still contains **two old overloads** of `submit_public_gate_pass`:

- **19-param version** (from Feb 4 migration) -- no `p_items`, no `p_start_date`/`p_end_date`
- **22-param version** (from Feb 6 migration) -- has `p_time_window_start`/`p_time_window_end` (TIME type), no `p_start_date`/`p_end_date`

The frontend sends `p_start_date` and `p_end_date` which don't match either overload, causing PostgREST to fail with "Could not find the function."

## Fix

Create a **new migration** that applies the exact same logic from `20260218000000`:

### Step 1: Drop all existing overloads
Use a `DO` block to iterate `pg_proc` and drop every `submit_public_gate_pass` overload.

### Step 2: Recreate the function with the correct 22-param signature
Parameters (in order):
```
p_tenant_slug TEXT, p_branch_id UUID, p_requester_name TEXT,
p_requester_phone TEXT, p_requester_email TEXT, p_requester_company TEXT,
p_pass_type TEXT, p_material_description TEXT, p_quantity TEXT,
p_vehicle_plate TEXT, p_vehicle_plate_letters TEXT, p_vehicle_plate_numbers TEXT,
p_driver_name TEXT, p_driver_mobile TEXT, p_pass_date DATE,
p_notify_whatsapp BOOLEAN, p_notify_email BOOLEAN, p_notify_sms BOOLEAN,
p_client_ip TEXT, p_items JSONB, p_start_date DATE, p_end_date DATE
```

Key changes vs old versions:
- Removed `p_time_window_start` and `p_time_window_end` (TIME)
- Added `p_start_date` and `p_end_date` (DATE) at the end
- Added pass_type-based date validation (in/out = single day, in_out = max 7 days)

### Step 3: Also recreate supporting functions
- `validate_gate_pass_dates()` trigger function
- `validate_gate_pass_guard_access()` function
- `get_public_gate_pass_status()` function (updated to return start_date/end_date)

### Step 4: Grant permissions and reload schema cache
- `GRANT EXECUTE ... TO anon` on `submit_public_gate_pass`
- `GRANT EXECUTE ... TO authenticated` on `validate_gate_pass_guard_access`
- `NOTIFY pgrst, 'reload schema'`

## No Frontend Code Changes Needed

The frontend hook (`src/hooks/public-gate-pass/use-public-gate-pass.ts`) already sends the correct parameters matching the new function signature. Once the migration runs, the schema cache will update and the RPC call will succeed.

## Security & Isolation

The function enforces multi-tenant isolation by:
1. Resolving `tenant_id` from `p_tenant_slug` (validates tenant exists and has public gate pass enabled)
2. All inserts include `tenant_id` scoping
3. Rate limiting is per-tenant per-phone
4. Function is `SECURITY DEFINER` with `SET search_path = public` to prevent search path injection
5. `GRANT EXECUTE TO anon` -- required since public users aren't authenticated

## Files to Modify

| File | Change |
|------|--------|
| New migration SQL | Drop old overloads, recreate all 4 functions with correct signatures, grant permissions, reload schema |

## Expected Result

After migration runs:
- Public gate pass submission works without errors
- Only one function overload exists (22 params, correct types)
- Schema cache reflects the new signature
- `p_start_date` / `p_end_date` are properly accepted and validated

