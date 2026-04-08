

# Worker Profile Consistency, Project Auto-Linking & Alert Unification

## Root Cause Analysis

**Issue 1 — Manual project selection in Induction tab**: `WorkerDetailDialog.tsx` always renders a `<Select>` dropdown for project, with state `selectedProjectId` initialized to `""`. It never auto-resolves the worker's assigned project from `useWorkerProjectAssignment`. The hook exists and works, but the dialog doesn't use it.

**Issue 2 — Different alerts across portals**: The contractor portal query (`useContractorPortalWorkers`, line 98-114 of `use-contractor-portal.ts`) is missing critical fields that `WorkerComplianceFlags` depends on:
- Missing: `tenant_id`, `company_id`, `rejection_reason`, `worker_type`, `safety_officer_id`, `photo_verified_by`, `photo_verified_at`, `security_approval_status`, `induction_status`
- Missing join: `company:contractor_companies(company_name, assigned_branch_id)`
- Missing join: `latest_induction:worker_inductions(id, status, expires_at)`

When `WorkerComplianceFlags` receives a worker with `undefined` for these fields, it triggers false alerts (e.g., `!worker.fitness_acknowledged` is true when field is undefined, `!worker.photo_path` triggers even though photo exists but wasn't selected, etc.).

**Issue 3 — QR tab also has manual project selection**: Same problem as induction — the Quick Onboard card requires manual project selection even when the worker already has one.

## Implementation Plan

### 1. Fix Contractor Portal Worker Query (Root cause of alert inconsistency)

**File: `src/features/contractors/hooks/use-contractor-portal.ts`** — `useContractorPortalWorkers`

Update the select to match the admin query fields exactly:
- Add: `tenant_id, company_id, rejection_reason, worker_type, safety_officer_id, photo_verified_by, photo_verified_at, security_approval_status, induction_status`
- Add join: `company:contractor_companies(company_name, assigned_branch_id)`
- Add join: `latest_induction:worker_inductions(id, status, expires_at)`
- Apply the same `latest_induction` array→single transform as the admin query

This ensures `WorkerComplianceFlags` receives identical data regardless of entry point.

### 2. Auto-Link Project in WorkerDetailDialog

**File: `src/features/contractors/components/WorkerDetailDialog.tsx`**

- Import and call `useWorkerProjectAssignment(worker?.id)`
- In a `useEffect`, when `projectAssignment?.project_id` exists, set `selectedProjectId` to that value automatically
- In the Induction tab and QR tab:
  - If project is already assigned: show project name as a **read-only badge/display** instead of a dropdown
  - If no project is assigned: keep the dropdown (this is the only valid case for manual selection)
- The "Send Induction" and "Onboard Worker" buttons use the auto-resolved project

### 3. Unify Data Shape Type

**File: `src/features/contractors/hooks/use-contractor-workers/types.ts`**

Already has all fields. No change needed — the issue is the portal query not selecting them.

### 4. Extract Project Display Logic into Shared Component

Create a small utility in the dialog that conditionally renders:
- **Project assigned** → Read-only card showing project name + status badge
- **No project** → Select dropdown (existing behavior)

This applies to both the Induction tab and QR/Onboard tab to avoid duplication within the dialog.

### 5. Verify WorkerComplianceFlags Logic

Review `getComplianceFlags` for defensive handling of undefined fields. Add explicit null checks where fields might be missing (defensive, but the real fix is Step 1).

## Files to Modify

| File | Change |
|------|--------|
| `src/features/contractors/hooks/use-contractor-portal.ts` | Align `useContractorPortalWorkers` select with admin query |
| `src/features/contractors/components/WorkerDetailDialog.tsx` | Auto-resolve project, show read-only when assigned |
| `src/features/contractors/components/shared/WorkerComplianceFlags.tsx` | Minor defensive checks |

## What Gets Fixed

1. **Alerts unified** — Same worker data → same compliance flags everywhere
2. **Project auto-linked** — No manual selection when project exists
3. **Induction tab clean** — Shows assigned project as read-only, sends automatically
4. **QR/Onboard tab clean** — Same auto-link behavior
5. **No new tables or migrations needed** — This is purely a frontend data alignment fix

