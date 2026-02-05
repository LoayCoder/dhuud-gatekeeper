

# Apply Migration: Fix Public Gate Pass Status Function

## Problem Confirmed

The migration file `supabase/migrations/20260205012818_fix_public_gate_pass_status.sql` exists in your codebase but the **function was never updated** in the database.

| Item | Current Database State | Expected (Migration File) |
|------|------------------------|---------------------------|
| Column reference | `reference_id` (wrong) | `reference_number` |
| Return structure | `{ data: {...} }` | `{ gate_pass: {...}, branch: {...}, tenant: {...} }` |
| Missing fields | Many | `driver_mobile`, `requester_phone`, `entry_time`, `exit_time`, etc. |
| Tenant info | Not returned | Full branding data |

## What Will Be Fixed

The migration will update the `get_public_gate_pass_status` function to:

1. Use correct column `reference_number`
2. Return proper nested structure matching frontend types
3. Include all required fields for the status page
4. Return complete branch location data
5. Return tenant branding info (logo, colors, instructions)

## Technical Details

The fix uses `CREATE OR REPLACE FUNCTION` which safely updates the existing function without affecting stored data.

```sql
RETURN jsonb_build_object(
  'success', true,
  'gate_pass', jsonb_build_object(
    'id', v_gate_pass.id,
    'reference_number', v_gate_pass.reference_number,
    'driver_mobile', v_gate_pass.driver_mobile,
    'requester_phone', v_gate_pass.public_requester_phone,
    ...
  ),
  'branch', jsonb_build_object(...),
  'tenant', jsonb_build_object(...)
);
```

## Action Required

I will run the migration to update the database function. After approval, the public gate pass status page will correctly display all information.

