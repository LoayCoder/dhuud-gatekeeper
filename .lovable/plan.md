

# Integrated Worker Approval System with Auto-Induction

## Problem
The current `WorkerApprovalQueue` shows minimal worker info (name, ID, nationality, mobile). It lacks:
- Full worker profile data (DOB, gender, email, emergency contact, fitness, training certs)
- Documents tab
- Induction tab with auto-linked project
- Auto-triggered induction on approval
- Compliance indicators (missing docs, expired medical, risk flags)

## Plan

### 1. Expand `usePendingWorkerApprovals` query
**File:** `src/features/contractors/hooks/use-contractor-workers/use-contractor-worker-queries.ts`

Expand the select from minimal fields to full worker profile (id_type, date_of_birth, gender, email, emergency_contact_name/phone, worker_role, fitness_to_work, fitness_acknowledged, medical_check_date, fitness_expiry_date, medical_certificate_path, training_certifications, photo_path, photo_verified_at, preferred_language, full_name_ar, worker_type, approved_at, security_approval_status, tenant_id). Also join `company:contractor_companies(company_name)`.

### 2. Create `WorkerApprovalDetailDialog` component
**File:** `src/features/contractors/components/WorkerApprovalDetailDialog.tsx`

A new dialog opened when clicking "View" on a pending worker card, with 3 tabs:

**Overview tab:**
- Worker photo + avatar
- Personal info grid: Full Name (EN/AR), ID Type + National ID, DOB, Gender, Nationality, Mobile, Email, Emergency Contact
- Worker Role badge
- Fitness to Work card with compliance indicators (status badge, medical dates, certificate link)
- Training Certifications list
- Compliance flags section: amber/red alerts for missing photo, missing docs, expired/missing medical, unacknowledged fitness

**Documents tab:**
- Reuse existing `ContractorDocumentUpload` component (read-only mode for reviewer)

**Induction tab:**
- Auto-detect assigned project from `project_worker_assignments` (new query)
- Show project name (read-only, no manual selection)
- Show induction status if any exists
- Display worker language + mobile for reference
- Note: "Induction will be sent automatically upon approval"

**Footer:** Approve / Reject buttons (same logic as current queue)

### 3. Add `useWorkerProjectAssignment` hook
**File:** `src/features/contractors/hooks/use-worker-project-assignment.ts`

Query `project_worker_assignments` joined with `contractor_projects` to get the worker's assigned project (for the induction tab auto-link).

### 4. Update `useSecurityApproveWorker` for auto-induction with project
**File:** `src/features/contractors/hooks/use-contractor-workers/use-worker-approval-mutations.ts`

In `useSecurityApproveWorker.onSuccess`, after approval:
- Fetch worker's active project assignment from `project_worker_assignments`
- Pass `projectId` to the `send-induction-video` edge function call (currently missing)
- Also invoke `onboard-worker` to generate QR code automatically

### 5. Update `WorkerApprovalQueue` to open detail dialog
**File:** `src/features/contractors/components/WorkerApprovalQueue.tsx`

Replace the current `WorkerDetailDialog` (generic) with the new `WorkerApprovalDetailDialog` when clicking the Eye icon. Keep the inline approve/reject buttons on the card for quick actions.

### 6. Update `usePendingSecurityApprovals` query
**File:** `src/features/contractors/hooks/use-contractor-workers/use-contractor-worker-queries.ts`

Expand similarly to include full worker fields for the security approval queue.

### Summary

| File | Change |
|------|--------|
| `use-contractor-worker-queries.ts` | Expand pending approval queries with full worker fields |
| `WorkerApprovalDetailDialog.tsx` (new) | 3-tab approval dialog with compliance indicators |
| `use-worker-project-assignment.ts` (new) | Query worker's assigned project |
| `use-worker-approval-mutations.ts` | Auto-trigger induction + onboarding on security approval with project context |
| `WorkerApprovalQueue.tsx` | Use new detail dialog |
| Barrel exports | Export new components/hooks |

