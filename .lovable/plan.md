

# Fix: `pass_date` NOT NULL violation

## Root Cause

The `submit_public_gate_pass` function correctly inserts `start_date` and `end_date` but does **not** set the legacy `pass_date` column. Previously, a trigger (`validate_gate_pass_dates`) would auto-fill `pass_date := start_date`, but the trigger was later rewritten and that line was removed. Since `pass_date` is NOT NULL, the insert fails.

## Fix

Update the `validate_gate_pass_dates` trigger function to sync `pass_date` from `start_date` before returning, restoring backward compatibility. This is a single SQL migration -- no frontend changes needed.

```text
-- Add to the trigger function, just before RETURN NEW:
NEW.pass_date := NEW.start_date;
```

## Technical Details

- The `pass_date` column is `NOT NULL` with no default value
- The current function body (`submit_public_gate_pass`, OID 115359) inserts `start_date` and `end_date` but omits `pass_date`
- The trigger fires `BEFORE INSERT` so setting `pass_date` there will satisfy the constraint
- This restores the behavior that existed in the original `validate_gate_pass_dates` function from migration `20260203000000`
- No frontend or function changes required -- just the trigger fix

## Files to Create

| File | Change |
|------|--------|
| New migration SQL | Recreate `validate_gate_pass_dates()` to sync `pass_date := start_date` |

