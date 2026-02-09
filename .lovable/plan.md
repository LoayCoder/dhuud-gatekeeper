

# Deep Fix: All `submit_public_gate_pass` and Related Function Issues

## Problems Found

There are **multiple bugs** across the gate pass database functions, not just in `submit_public_gate_pass`:

### 1. `get_public_gate_pass_status` -- TWO overloads, both broken

There are **two versions** of this function in the database:

| Overload | Parameter type | Bugs |
|----------|---------------|------|
| OID 110487 | `p_access_token TEXT` | References `tenants.deleted_at` (does not exist) and `tenants.logo_url` (should be `logo_light_url`) |
| OID 109286 | `p_access_token UUID` | References `tenants.deleted_at` is NOT present (good), but still references legacy `time_window_start/end` fields and missing `start_date/end_date` in response |

### 2. `submit_public_gate_pass` -- Currently correct
The latest migration fixed this function. No `deleted_at` on tenants. Signature matches frontend.

### 3. `validate_gate_pass_dates` -- Currently correct
Trigger function works properly with `start_date`/`end_date`.

### 4. `validate_gate_pass_guard_access` -- Currently correct
Uses `start_date`/`end_date` properly, no invalid column references.

## Root Cause of Current Error

The error "column deleted_at does not exist" is coming from `get_public_gate_pass_status` (the TEXT overload, OID 110487), which is called during status tracking after submission. The frontend likely calls this function as part of the submission flow or immediately after.

**Wait** -- the user said the error is on **submit**. Let me re-examine: the `submit_public_gate_pass` function itself was already fixed in the last migration. But there could be a **trigger** on `material_gate_passes` that fires on INSERT and calls something referencing `tenants.deleted_at`. The trigger `trg_notify_public_gate_pass_status` calls `notify_public_gate_pass_status_change()` on UPDATE -- not INSERT. So the submit function itself should work.

The most likely scenario: the previous migration to fix `submit_public_gate_pass` may not have deployed successfully, OR there's a cached old version. Either way, the comprehensive fix below will resolve everything.

## Fix: Single Migration to Clean Everything

### Step 1: Drop duplicate `get_public_gate_pass_status` overloads
Drop both overloads and recreate a single clean version.

### Step 2: Recreate `get_public_gate_pass_status` (single version, UUID param)
- Remove `deleted_at IS NULL` filter on `tenants` table
- Use `logo_light_url` instead of `logo_url`
- Include `start_date` and `end_date` in the response
- Remove legacy `time_window_start/end` references

### Step 3: Drop and recreate `submit_public_gate_pass`
Even though it was "fixed" before, recreate it fresh to guarantee no stale version exists:
- No `deleted_at` filter on `tenants`
- Correct 22-parameter signature with `p_start_date`/`p_end_date`
- Full tenant isolation via `tenant_id` scoping

### Step 4: Recreate `validate_gate_pass_guard_access`
Already correct but include in the atomic migration for completeness.

### Step 5: Ensure `validate_gate_pass_dates` trigger exists
Already correct but verify trigger is attached.

### Step 6: Permissions and schema cache
```
GRANT EXECUTE ON FUNCTION submit_public_gate_pass(...) TO anon;
GRANT EXECUTE ON FUNCTION get_public_gate_pass_status(...) TO anon;
GRANT EXECUTE ON FUNCTION validate_gate_pass_guard_access(...) TO authenticated;
NOTIFY pgrst, 'reload schema';
```

## Technical Details

### Tables with NO `deleted_at` column (must never filter on it):
- `tenants` -- confirmed no `deleted_at` column

### Tables WITH `deleted_at` column (safe to filter):
- `material_gate_passes` -- has `deleted_at`
- `branches` -- has `deleted_at`
- `public_gate_pass_items` -- has `deleted_at`

### Column name corrections:
- `tenants.logo_url` does NOT exist; correct column is `logo_light_url`

## Files to Modify

| File | Change |
|------|--------|
| New migration SQL | Drop all overloads of `submit_public_gate_pass` and `get_public_gate_pass_status`, recreate both with correct column references, grant permissions, reload schema cache |

## No Frontend Changes Needed

The frontend hooks already use the correct parameter names and types.

## Expected Result

- Public gate pass submission works without "deleted_at" errors
- Status tracking works without column reference errors
- Only one overload of each function exists (no ambiguity)
- Schema cache is refreshed
- Full tenant isolation maintained

