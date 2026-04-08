

# Fix: Contractor Portal Workers & Projects Loading Failure

## Root Cause

The contractor portal worker query in `use-contractor-portal.ts` (line 106) selects `submitted_by`, which **does not exist** as a column in the `contractor_workers` table. This causes a 400 error from the database (`column contractor_workers.submitted_by does not exist`), breaking the entire Workers tab. The repeated 400 errors are visible in the network logs.

The previous plan to align the portal query with the admin query incorrectly added `submitted_by` — the admin query itself does not use this column either.

## Fix

**File: `src/features/contractors/hooks/use-contractor-portal.ts`** (line 106)

Remove `submitted_by` from the select statement. Change:
```
safety_officer_id, submitted_by,
```
to:
```
safety_officer_id,
```

This is a single-line fix that will immediately restore the Workers tab for the contractor portal.

## Verification

After the fix, the contractor rep (l.r.love07@gmail.com) logging into the contractor portal should see:
- 1 project (Substation B Electrical Installation) in the Projects tab
- 1 worker linked to Al-Rashid Contracting LLC in the Workers tab

