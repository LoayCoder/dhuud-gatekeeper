

# Fix: Category Check Constraint Mismatch

## Problem
The corrective action creation fails with: `new row for relation "corrective_actions" violates check constraint "corrective_actions_category_check"`

The database constraint allows: `engineering`, `administrative`, `ppe`, `training`, `procedures_update`, `environmental`

But the form and mutation use: `operations`, `maintenance`, `training`, `procedural`, `equipment`

Only `training` overlaps. The default value `operations` is invalid.

## Fix

### 1. Update `CreateSessionActionDialog.tsx`
- Change the Zod schema enum to match DB constraint values: `engineering`, `administrative`, `ppe`, `training`, `procedures_update`, `environmental`
- Change the default form value from `'operations'` to `'administrative'`
- Update the Select dropdown options to show these 6 valid categories with proper labels

### 2. Update `use-create-session-action.ts`
- Change the fallback default from `'operations'` to `'administrative'` (line 64)

### Files to change
1. `src/features/incidents/components/inspections/sessions/CreateSessionActionDialog.tsx` — schema, defaults, select options
2. `src/features/incidents/hooks/use-inspection-actions/use-create-session-action.ts` — fallback default on line 64

