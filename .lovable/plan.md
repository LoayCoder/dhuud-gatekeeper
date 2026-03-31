

# Fix: Action Verification & Closure Workflow — Gap Analysis and Implementation Plan

## What's Already Built ✓
- **ActionWorkflowDialog**: Start Work + Submit for Verification with file uploads and notes
- **ExtensionRequestDialog**: Due date extension requests
- **ActionDetailSheet**: Shows action details, timeline, notes — but NO evidence display
- **ActionEvidenceSection**: Full drag-and-drop evidence component exists (inspection context)
- **useVerifyAction**: Approve (→ closed) / Reject (→ returned_for_correction) with emails
- **ActionVerificationDialog**: Inspector approve/reject UI exists in session workspace
- **DB columns**: All workflow fields exist (started_at, completed_date, verified_by, verification_notes, return_count, etc.)

## What's Missing

### 1. ActionDetailSheet has no evidence section
The detail sheet shows timeline and notes but doesn't display uploaded evidence (photos/documents). The `ActionEvidenceSection` component exists but isn't used here.

### 2. ActionWorkflowDialog files are collected but not stored properly
Files are passed to `handleActionDialogConfirm` which calls `uploadEvidence.mutateAsync`, but the `incidentId` parameter falls back to `sessionId || actionId` — for inspection actions without an incident_id, this is fragile. Need to ensure the correct context ID flows through.

### 3. No reviewer/inspector verification UI in My Actions
The `ActionVerificationDialog` only lives in the session workspace. When an inspector opens "My Actions" and sees actions in `completed` (pending verification), there's no way to verify or reject them from this view.

### 4. ActionDetailSheet doesn't show evidence from the DB
Even after files are uploaded via the workflow dialog, the detail sheet has no `ActionEvidenceSection` embedded to display them.

### 5. ActionForDialog type is too narrow
Missing fields like `assigned_to`, `verified_by`, `verification_notes`, `source_type`, `session_id` that are needed for verification flows.

## Implementation Plan

### File 1: `src/pages/incidents/MyActions/ActionDetailSheet.tsx`
- **Add** `ActionEvidenceSection` import and render it inside the sheet (between notes and action buttons)
- **Add** verification buttons for inspector/reviewer: "Verify & Close" and "Return for Correction" when action status is `completed`
- Show uploaded evidence (photos, documents) with view/download capability
- Pass `isLocked` when action is closed

### File 2: `src/pages/incidents/MyActions/types.ts`
- Expand `ActionForDialog` with missing fields: `assigned_to`, `source_type`, `reference_id`, `created_at`, `started_at`, `completed_date`, `verified_by`, `verified_at`, `verification_notes`, `rejected_at`, `rejected_by`, `rejection_notes`, `return_count`, `last_return_reason`, `last_returned_at`, `progress_notes`, `completion_notes`, `overdue_justification`

### File 3: `src/pages/incidents/MyActions/ActionDetailSheet.tsx` (verification section)
- Add inline verification UI when the current user is the reviewer (inspector/creator) and status is `completed`:
  - "Verify & Close" button with notes textarea
  - "Return for Correction" button with mandatory rejection reason
- Use `useVerifyAction` mutation for both flows
- After verify/reject, invalidate queries and close sheet

### File 4: `src/pages/incidents/MyActions/hooks/useMyActions.ts`
- Ensure `handleActionDialogConfirm` correctly resolves the context ID for evidence uploads (use `sessionId` for inspection actions, `incidentId` for incident actions)

### File 5: `src/pages/incidents/MyActions/tabs/ActionsTab.tsx`
- Add visual indicator for actions in `completed` status showing "Pending Verification" badge
- Show evidence count badge on action cards if evidence exists

## Files to modify

| # | File | Change |
|---|------|--------|
| 1 | `types.ts` | Expand ActionForDialog with all workflow fields |
| 2 | `ActionDetailSheet.tsx` | Add evidence section + inline verification UI for reviewers |
| 3 | `useMyActions.ts` | Fix evidence upload context ID resolution |
| 4 | `ActionsTab.tsx` | Add "Pending Verification" badge for completed actions |

No database migration needed — all columns and tables exist.

## Expected Outcome
- Assignee can: upload evidence (photos + docs), add completion notes, submit for verification
- Reviewer can: view all evidence, read comments, verify & close OR return for correction with mandatory notes
- Action detail sheet shows full evidence gallery with view/download
- Returned actions show rejection feedback and allow re-submission
- Full audit trail maintained through existing DB columns and email notifications

