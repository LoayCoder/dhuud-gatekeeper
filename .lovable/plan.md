

# Fix: Add Missing `purpose` and `notes` Columns

## Problem

The `submit_public_gate_pass` function inserts into `purpose` and `notes` columns on `material_gate_passes`, but neither column exists in the table.

## Fix

A single migration to add both missing columns:

```text
ALTER TABLE material_gate_passes ADD COLUMN purpose TEXT;
ALTER TABLE material_gate_passes ADD COLUMN notes TEXT;
```

Both are nullable TEXT columns with no default -- safe, additive, non-destructive.

## Technical Details

- **No function changes needed** -- the function already references these columns correctly
- **No frontend changes needed** -- the hook already sends `p_purpose` and `p_notes` (as null)
- **No RLS impact** -- existing policies cover all columns on the table
- After adding the columns, trigger a schema reload: `NOTIFY pgrst, 'reload schema';`

## Files to Modify

| File | Change |
|------|--------|
| New migration SQL | `ALTER TABLE material_gate_passes ADD COLUMN purpose TEXT; ADD COLUMN notes TEXT;` |

