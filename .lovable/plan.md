

# Deep Audit: GBR Company Data Not Persisting

## Root Cause Analysis

After investigating the database, RLS policies, frontend mutations, and form logic, I found **3 critical bugs** causing data loss:

### Bug 1: Silent RLS Failures — Missing `.throwOnError()`
The create and update mutations in `use-contractor-company-mutations.ts` do NOT use `.throwOnError()`. Per the project's own standard (memory: forced-rls-error-reporting), all insert/update chains must include `.throwOnError()` to prevent PostgREST from returning a 201 status with an empty body when RLS blocks the operation. Without it, the mutation appears to succeed, the dialog closes, but no data was actually written.

**Affected files:**
- `src/features/contractors/hooks/use-contractor-companies/use-contractor-company-mutations.ts` — all 8 mutations
- `src/features/contractors/hooks/use-sync-personnel-to-workers.ts` — all insert/update calls

### Bug 2: RLS Column Mismatch (`branch_id` vs `assigned_branch_id`)
The `contractor_companies` table has TWO branch columns:
- `branch_id` — used by RLS policies
- `assigned_branch_id` — used by all frontend code

The frontend code writes to `assigned_branch_id` but **never sets `branch_id`**. The RLS policies check `branch_id`:
```
INSERT: (branch_id IS NULL) OR can_access_branch(auth.uid(), branch_id)
SELECT: (branch_id IS NULL) OR can_access_branch(auth.uid(), branch_id)
UPDATE: (branch_id IS NULL) OR can_access_branch(auth.uid(), branch_id)
```

Since `branch_id` is always NULL, the RLS passes, but this means branch-based isolation is **completely bypassed**. The UPDATE policy also checks `branch_id`, and if someone sets it, future updates would fail unless the user has branch access.

### Bug 3: Form Submit Doesn't Await Errors
In `CompanyFormDialog.tsx`, `handleSubmit` calls `onOpenChange(false)` at line 336 unconditionally — even if `syncPersonnel.mutateAsync()` threw an error. The dialog closes before the user can see what failed.

## Plan

### Step 1: Add `.throwOnError()` to all mutations
Add `.throwOnError()` to every `.insert()`, `.update()`, and `.select()` chain in:
- `use-contractor-company-mutations.ts` (create, update, suspend, activate, changeStatus, checkExpired, approve, reject)
- `use-sync-personnel-to-workers.ts` (all site rep and safety officer insert/update calls)

### Step 2: Fix RLS policies — align on `assigned_branch_id`
Create a migration to update all 3 RLS policies (`INSERT`, `UPDATE`, `SELECT`) on `contractor_companies` to check `assigned_branch_id` instead of `branch_id`. Then drop the unused `branch_id` column (or keep as deprecated, but update RLS).

### Step 3: Wrap `handleSubmit` in try/catch
In `CompanyFormDialog.tsx`, wrap the submit logic in a proper try/catch so that if any mutation fails, the dialog stays open and shows the error to the user.

### Step 4: Fix the same issues in `contractor_workers`
The `contractor_workers` INSERT policy also checks `branch_id` which the code never sets. Update it to use `assigned_branch_id` or remove the branch check for workers (since they inherit branch from their company).

## Technical Details

| Issue | File | Line | Fix |
|-------|------|------|-----|
| Missing throwOnError | `use-contractor-company-mutations.ts` | Lines 17-43, 64-87 | Add `.throwOnError()` after `.select()` |
| Missing throwOnError | `use-sync-personnel-to-workers.ts` | All insert/update calls | Add `.throwOnError()` |
| RLS column mismatch | DB migration | N/A | Update RLS policies to use `assigned_branch_id` |
| No error handling in submit | `CompanyFormDialog.tsx` | Lines 237-336 | Wrap in try/catch, keep dialog open on error |
| Workers RLS mismatch | DB migration | N/A | Fix `contractor_workers` INSERT/SELECT policies |

## Impact
- Company data will properly persist (no more silent failures)
- Branch-based isolation will actually work
- Users will see error messages when saves fail instead of a false success

