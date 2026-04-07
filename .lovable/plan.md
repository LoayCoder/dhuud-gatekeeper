

# Unify All Worker Dialogs, Forms, and Cards

## Problem

Worker UI is duplicated across 6+ files with inconsistent fields, schemas, and helper functions:

| Component | Location | Fields | Lines |
|-----------|----------|--------|-------|
| `WorkerFormDialog` (admin) | `features/contractors/` | 6 fields (minimal) | 191 |
| `WorkerFormSchema` (admin) | `features/contractors/` | Minimal schema | 13 |
| `ContractorWorkerForm` (portal create) | `contractor-portal/` | 15+ fields (full) | 702 |
| `ContractorWorkerEditForm` (portal edit) | `contractor-portal/` | 15+ fields (full) | 1003 |
| `WorkerDetailDialog` (admin view) | `features/contractors/` | Full profile, 4 tabs | 703 |
| `WorkerApprovalDetailDialog` | `features/contractors/` | Full profile, 3 tabs | 366 |
| `WorkerSecurityApprovalQueue` | `features/contractors/` | Inline minimal card | 279 |

**Duplications:** `InfoRow`, `FitnessBadge`, `getComplianceFlags`, constants (LANGUAGES, ID_TYPES, WORKER_ROLES, FITNESS_OPTIONS, TRAINING_CERTS, GENDERS) are copy-pasted across files.

## Plan

### 1. Create shared constants file
**New file:** `src/features/contractors/constants/worker-constants.ts`

Extract all shared constants: `LANGUAGES`, `ID_TYPES`, `WORKER_ROLES`, `FITNESS_OPTIONS`, `TRAINING_CERTS`, `GENDERS`. All form and detail components import from here.

### 2. Create shared worker UI primitives
**New file:** `src/features/contractors/components/shared/WorkerInfoRow.tsx`

Extract `InfoRow` / `DetailInfoRow` into a single reusable component.

**New file:** `src/features/contractors/components/shared/WorkerFitnessBadge.tsx`

Extract `FitnessBadge` / `DetailFitnessBadge`.

**New file:** `src/features/contractors/components/shared/WorkerComplianceFlags.tsx`

Extract `getComplianceFlags` + the compliance alerts rendering block.

**New file:** `src/features/contractors/components/shared/WorkerProfileHeader.tsx`

Extract the repeated photo + name + company + role badge block.

**New file:** `src/features/contractors/components/shared/WorkerPersonalInfoCard.tsx`

Extract the Personal Info grid card (ID type, national ID, DOB, gender, nationality, mobile, email, language).

**New file:** `src/features/contractors/components/shared/WorkerEmergencyContactCard.tsx`

Extract emergency contact card.

**New file:** `src/features/contractors/components/shared/WorkerFitnessCard.tsx`

Extract fitness-to-work card with badge, acknowledged status, medical dates.

**New file:** `src/features/contractors/components/shared/WorkerCertificationsCard.tsx`

Extract training certifications card.

**New file:** `src/features/contractors/components/shared/WorkerProjectCard.tsx`

Extract assigned project card (uses `useWorkerProjectAssignment`).

### 3. Unify form schema
**Update:** `src/features/contractors/components/WorkerFormSchema.ts`

Expand to the full field set (matching portal forms): id_type, date_of_birth, gender, email, emergency contacts, worker_role, fitness fields, training_certifications, project_id, photo_path, full_name_ar. Add optional flags so the same schema works for both admin (company selectable) and portal (company fixed) contexts.

### 4. Unify admin form — `WorkerFormDialog.tsx`
**Update:** `src/features/contractors/components/WorkerFormDialog.tsx`

Replace the minimal 6-field form with the full field set from the unified schema. Import constants and form sections from shared files. This becomes the single admin create/edit form. Structure matches the portal form (photo, personal info, fitness, training, project).

### 5. Unify portal forms — merge Edit into Create
**Update:** `src/components/contractor-portal/ContractorWorkerForm.tsx`

Add an optional `worker` prop for edit mode (like admin form). Import from shared constants. Remove duplicated constants.

**Delete:** `src/components/contractor-portal/ContractorWorkerEditForm.tsx`

Replace all usages in `src/pages/contractor-portal/Workers.tsx` to use `ContractorWorkerForm` with the `worker` prop.

### 6. Create unified `WorkerOverviewTab` component
**New file:** `src/features/contractors/components/shared/WorkerOverviewTab.tsx`

Composes: `WorkerComplianceFlags` + `WorkerProfileHeader` + `WorkerPersonalInfoCard` + `WorkerEmergencyContactCard` + `WorkerFitnessCard` + `WorkerCertificationsCard` + `WorkerProjectCard` + rejection reason card. Used by both `WorkerDetailDialog` and `WorkerApprovalDetailDialog`.

### 7. Simplify `WorkerDetailDialog.tsx`
**Update:** `src/features/contractors/components/WorkerDetailDialog.tsx`

Replace inline Overview tab content with `<WorkerOverviewTab worker={worker} />`. Remove local `DetailInfoRow`, `DetailFitnessBadge`, `getComplianceFlags`. Keep the 4-tab structure (Details, Documents, QR, Induction) but tabs now use shared components.

### 8. Simplify `WorkerApprovalDetailDialog.tsx`
**Update:** `src/features/contractors/components/WorkerApprovalDetailDialog.tsx`

Replace inline Overview tab with `<WorkerOverviewTab worker={worker} />`. Remove local `InfoRow`, `FitnessBadge`, `getComplianceFlags`. Keep the 3-tab structure + approval footer.

### 9. Update `WorkerSecurityApprovalQueue.tsx`
**Update:** `src/features/contractors/components/WorkerSecurityApprovalQueue.tsx`

Open `WorkerApprovalDetailDialog` (with `isSecurityStage=true`) when clicking a worker card, instead of showing only inline minimal info. Keep inline approve/reject buttons on card for quick actions.

### 10. Update imports and barrel exports
Update `src/pages/contractor-portal/Workers.tsx` to use unified form. Update barrel exports in `src/features/contractors/index.ts` if needed.

## Summary

| Action | Files |
|--------|-------|
| New shared primitives | 10 new files in `shared/` |
| New shared constants | 1 new file |
| Unified schema | 1 update |
| Admin form expansion | 1 update |
| Portal form merge | 1 update + 1 delete |
| Detail dialog simplification | 2 updates |
| Security queue enhancement | 1 update |
| Import updates | 2-3 updates |

**Result:** ~1,500 lines of duplication removed. Single source of truth for worker display, worker form fields, and compliance logic across admin, portal, and approval views.

