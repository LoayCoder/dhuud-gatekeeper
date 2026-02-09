

# Unified Fix: Frontend-to-Database Parameter Alignment

## Root Cause

The database functions have been fixed multiple times, but the **frontend hook** (`use-public-gate-pass.ts`) sends parameters that don't match the function signatures. PostgREST rejects unknown parameters, which causes confusing errors.

## Mismatches Found

### `submit_public_gate_pass` -- Frontend vs Database

| Frontend sends | Database expects | Status |
|---|---|---|
| `p_pass_date` | (not a parameter) | EXTRA -- must remove |
| `p_notify_whatsapp` | (not a parameter) | EXTRA -- must remove |
| `p_notify_email` | (not a parameter) | EXTRA -- must remove |
| `p_notify_sms` | (not a parameter) | EXTRA -- must remove |
| `p_client_ip` | `p_submission_ip` | WRONG NAME |
| (not sent) | `p_project_id` | MISSING -- send null |
| (not sent) | `p_purpose` | MISSING -- send null |
| (not sent) | `p_notes` | MISSING -- send null |
| (not sent) | `p_captcha_token` | MISSING -- send null |
| (not sent) | `p_material_description` | MISSING -- send null |
| (not sent) | `p_quantity` | MISSING -- send null |
| (not sent) | `p_vehicle_plate` | MISSING -- send null |
| (not sent) | `p_pass_type` | MISSING -- derive from form |

### `get_public_gate_pass_status` -- Frontend vs Database

| Frontend sends | Database expects | Status |
|---|---|---|
| `p_tenant_slug` + `p_access_token` | `p_access_token` only | EXTRA param `p_tenant_slug` |

## Fix Plan

### 1. Fix `use-public-gate-pass.ts` hook

Update the `mutationFn` in `useSubmitPublicGatePass` to send **exactly** the 22 parameters the database function expects:

```
p_tenant_slug, p_branch_id, p_pass_type,
p_requester_name, p_requester_phone, p_requester_email, p_requester_company,
p_material_description, p_quantity, p_vehicle_plate,
p_vehicle_plate_letters, p_vehicle_plate_numbers,
p_driver_name, p_driver_mobile,
p_project_id, p_purpose, p_notes, p_submission_ip,
p_captcha_token, p_start_date, p_end_date, p_items
```

Remove: `p_pass_date`, `p_notify_whatsapp`, `p_notify_email`, `p_notify_sms`
Rename: `p_client_ip` to `p_submission_ip`
Add missing: `p_pass_type`, `p_material_description`, `p_quantity`, `p_vehicle_plate`, `p_project_id`, `p_purpose`, `p_notes`, `p_captcha_token` (as null where not provided)

### 2. Fix `get_public_gate_pass_status` call

Remove `p_tenant_slug` from the RPC call -- the function only accepts `p_access_token`.

### 3. Fix `PublicGatePassSubmission` type

Add the missing fields (`pass_type`, `vehicle_plate`, etc.) to the submission interface so the form data flows correctly into the hook.

### 4. Verify `PublicRequestPage.tsx` form submission

The form already provides `pass_type`, `vehicle_plate_letters/numbers`, `driver_name/mobile`, `start_date`, `end_date`, and `items`. Need to ensure these all flow through to the RPC call correctly.

## Files to Modify

| File | Change |
|------|--------|
| `src/hooks/public-gate-pass/use-public-gate-pass.ts` | Fix RPC parameter names to match the 22-param function signature exactly; fix `get_public_gate_pass_status` call to only send `p_access_token` |
| `src/types/public-gate-pass.types.ts` | Ensure `PublicGatePassSubmission` type includes all needed fields |

## No Database Changes Needed

The database functions are correct. This is purely a frontend parameter mismatch fix.

## Expected Result

- Public gate pass submission sends exactly the right parameters
- No more "column does not exist" errors (these are actually parameter mismatch errors surfaced as column errors)
- Status tracking works with the single-parameter function
- All data flows correctly from form to database
