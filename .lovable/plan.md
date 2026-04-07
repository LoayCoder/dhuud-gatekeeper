

# Fix: Worker Fitness Data Not Showing & Medical Certificate Upload Failing

## Root Causes Found

### Bug 1: Missing fitness fields in main worker query
The `useContractorWorkers` query (lines 19-28 of `use-contractor-worker-queries.ts`) does **not** select `fitness_to_work`, `fitness_acknowledged`, `medical_check_date`, `fitness_expiry_date`, `medical_certificate_path`, or `training_certifications`. These fields come back as `undefined`, so the compliance flags show false warnings like "Fitness to work not acknowledged" and "No medical check on record" even though the database has `fitness_acknowledged: true` and `medical_check_date: 2026-04-08`.

**Fix:** Add the missing columns to the main SELECT in `useContractorWorkers`.

### Bug 2: Medical certificate upload fails silently — missing INSERT storage policy
The `contractor-documents` bucket has SELECT, UPDATE, and DELETE RLS policies, but **no INSERT policy**. Every upload attempt is blocked by RLS and fails silently (the code catches the error but doesn't show a toast).

**Fix:** Add an INSERT policy on the `contractor-documents` storage bucket.

### Bug 3: Wrong folder path breaks existing RLS policies
The RLS policies expect the **first folder** in the path to be the `tenant_id`. But the upload code uses:
```
medical-certificates/${companyId}/${timestamp}.ext
```
This should be:
```
${tenant_id}/medical-certificates/${timestamp}.ext
```

**Fix:** Update the upload path in all 3 locations (`WorkerFormDialog.tsx`, `ContractorWorkerForm.tsx`, `ContractorWorkerEditForm.tsx`) to use `tenant_id` as the first folder segment.

### Bug 4: No error toast on upload failure
The `handleMedicalCertUpload` function in `WorkerFormDialog.tsx` silently catches errors without user feedback.

**Fix:** Add `toast.error()` on upload failure.

### Bug 5: Medical certificate not shown in detail/overview views
The `WorkerFitnessCard` shared component doesn't display the medical certificate or offer a download link.

**Fix:** Add a medical certificate row to `WorkerFitnessCard` with a download link when available.

## Files to Change

| File | Change |
|------|--------|
| `use-contractor-worker-queries.ts` | Add 6 missing columns to main SELECT |
| Database migration | Add INSERT policy on `contractor-documents` bucket |
| `WorkerFormDialog.tsx` | Fix upload path to use `tenant_id`, add error toast |
| `ContractorWorkerForm.tsx` | Fix upload path to use `tenant_id` |
| `ContractorWorkerEditForm.tsx` | Fix upload path to use `tenant_id` |
| `WorkerFitnessCard.tsx` | Show medical certificate download link |

