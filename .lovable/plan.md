

# Worker Photo Gate: Mandatory Photo Before Induction & ID Card

## Problem
After Security Approval, a worker can proceed to Induction or ID Card generation without a photo. Photo must be a mandatory gate in the workflow: Security Approval → Photo Capture → Induction → ID Card.

## Current State
- `contractor_workers` table already has `photo_path`, `id_card_image_path`, `id_card_generated_at`
- `WorkerPhotoUpload.tsx` component exists with camera capture + file upload to `worker-photos` bucket
- `WorkerDetailDialog.tsx` shows QR/Onboard and Induction tabs but does NOT enforce photo requirement
- No `photo_verified_by` / `photo_verified_at` columns exist yet

## Changes

### 1. Database Migration — Add photo verification columns
Add `photo_verified_by` (UUID, FK to profiles) and `photo_verified_at` (timestamptz) to `contractor_workers`. These track who verified the photo and when, separate from upload.

### 2. Update ContractorWorker type
**File:** `src/features/contractors/hooks/use-contractor-workers/types.ts`

Add `photo_verified_by`, `photo_verified_at` fields. Update the query in `use-contractor-worker-queries.ts` to select them.

### 3. Create WorkerPhotoGate component
**File:** `src/features/contractors/components/WorkerPhotoGate.tsx`

A gate component that:
- If `photo_path` exists and `photo_verified_at` is set → shows photo with green checkmark and "Continue" button
- If no photo → shows warning alert + embedded `WorkerPhotoUpload` component (reuses existing)
- Auto-verifies on upload (sets `photo_verified_by` and `photo_verified_at` via a mutation)

### 4. Create useVerifyWorkerPhoto mutation
**File:** `src/features/contractors/hooks/use-contractor-workers/use-worker-photo-mutations.ts`

Mutation that sets `photo_verified_by` and `photo_verified_at` on the worker record after photo upload. Logs to audit trail via existing `useContractorAuditLog`.

### 5. Enforce photo gate in WorkerDetailDialog
**File:** `src/features/contractors/components/WorkerDetailDialog.tsx`

- In the "QR & Onboard" tab: if worker is security-approved but has no verified photo, show `WorkerPhotoGate` instead of the onboard/QR section
- In the "Induction" tab: if no verified photo, show a locked state with message "Photo required before induction"
- ID Card button: disable if no verified photo, with tooltip explaining why

### 6. Add photo status indicator to WorkerListTable
**File:** `src/features/contractors/components/WorkerListTable.tsx`

Show a small camera icon/badge next to workers who are security-approved but missing a photo, so admins can quickly spot who needs a photo.

## Workflow After Implementation

```text
Security Approval ✅
    ↓
Photo Gate (WorkerDetailDialog checks photo_path + photo_verified_at)
    ├── No photo → Show WorkerPhotoGate (upload/camera)
    └── Photo verified ✅ → Unlock:
            ├── Induction tab (send video)
            └── QR/Onboard + ID Card generation
```

## Technical Details
- Reuses existing `WorkerPhotoUpload` component (camera + file upload + compression)
- Reuses existing `worker-photos` storage bucket
- Photo verification is auto-set on upload (no separate manual verification step unless needed later)
- All gates are client-side UI enforcement; the DB trigger approach is optional for later hardening
- RTL-compatible using logical properties (`ms-`, `me-`, `text-start`)
- Audit trail via existing `useContractorAuditLog` hook

## Files Summary
| File | Action |
|------|--------|
| DB migration | Add `photo_verified_by`, `photo_verified_at` columns |
| `types.ts` | Add photo verification fields |
| `use-contractor-worker-queries.ts` | Select new fields |
| `use-worker-photo-mutations.ts` | NEW — verify photo mutation |
| `WorkerPhotoGate.tsx` | NEW — gate component |
| `WorkerDetailDialog.tsx` | Enforce photo gate before induction/QR/ID |
| `WorkerListTable.tsx` | Photo status indicator |
| `index.ts` (barrel) | Export new hook |

