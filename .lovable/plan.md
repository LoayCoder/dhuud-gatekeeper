

# Complete Fix: All Column Mismatches in Gate Pass Functions

## Problem

A full audit reveals **14+ column mismatches** between the database functions and actual table schemas. The functions reference columns that either don't exist or have different names.

## Audit Results

### `material_gate_passes` table -- Missing columns the functions expect:

| Missing Column | Type | Purpose |
|---|---|---|
| `vehicle_plate_letters` | TEXT | Separated plate letters (Arabic) |
| `vehicle_plate_numbers` | TEXT | Separated plate numbers |
| `token_expires_at` | TIMESTAMPTZ | Token expiration for public access |
| `submission_ip` | TEXT | Client IP for rate limiting audit |

### `material_gate_passes` table -- Wrong column names in functions:

| Function uses | Should be |
|---|---|
| `requester_name` | `public_requester_name` |
| `requester_phone` | `public_requester_phone` |
| `requester_email` | `public_requester_email` |
| `requester_company` | `public_requester_company` |
| `reference_id` | `reference_number` |
| `qr_token` | `qr_code_token` |

### `public_gate_pass_items` table -- Missing columns:

| Missing Column | Type | Purpose |
|---|---|---|
| `branch_id` | UUID | Tenant isolation on items |
| `sort_order` | INTEGER | Item ordering |

### `public_gate_pass_items` table -- Wrong column names:

| Function uses | Should be |
|---|---|
| `item_description` | `description` |

### `public_gate_pass_items` -- Type mismatch:

| Column | Function casts to | Actual type |
|---|---|---|
| `quantity` | INTEGER | TEXT |

## Fix Strategy

**Single atomic migration** with two parts:

### Part 1: Add missing columns (additive, non-destructive)

Add to `material_gate_passes`:
- `vehicle_plate_letters TEXT`
- `vehicle_plate_numbers TEXT`
- `token_expires_at TIMESTAMPTZ`
- `submission_ip TEXT`

Add to `public_gate_pass_items`:
- `branch_id UUID REFERENCES branches(id)`
- `sort_order INTEGER DEFAULT 0`

### Part 2: Recreate all functions with correct column names

**`submit_public_gate_pass`** -- Fix all column references:
- `public_requester_name` instead of `requester_name`
- `public_requester_phone` instead of `requester_phone`
- `public_requester_email` instead of `requester_email`
- `public_requester_company` instead of `requester_company`
- `reference_number` instead of `reference_id`
- Use newly added columns for `vehicle_plate_letters`, `vehicle_plate_numbers`, `token_expires_at`, `submission_ip`

**`get_public_gate_pass_status`** -- Fix all column references:
- `reference_number` instead of `reference_id`
- `public_requester_name` instead of `requester_name`
- `public_requester_company` instead of `requester_company`
- `qr_code_token` instead of `qr_token`
- `description` instead of `item_description` for items
- Keep `quantity` as TEXT (no INT cast)

**`validate_gate_pass_dates`** and **`validate_gate_pass_guard_access`** -- Verify and recreate for completeness.

### Part 3: Permissions and cache reload
```
GRANT EXECUTE to anon/authenticated
NOTIFY pgrst, 'reload schema'
```

## No Frontend Changes Needed

The frontend hook already sends the correct parameter names (`p_requester_name`, `p_requester_phone`, etc.) -- these are RPC parameters, not column names. The column mapping happens inside the SQL function.

## Files to Modify

| File | Change |
|------|--------|
| New migration SQL | Add missing columns, drop and recreate all 4 functions with correct column references, grant permissions, reload schema |

## Expected Result

- All column references match the actual database schema
- Public gate pass submission works without any column errors
- Status tracking works correctly
- Full tenant isolation maintained
- No data loss (additive columns only)

