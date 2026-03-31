

# Fix: Duplicate Submission Flow in Action Verification

## Problem
When the user views an `in_progress` action in the **ActionDetailSheet**, they can upload evidence directly there. When they click "Submit for Verification", the sheet closes and opens a **second dialog** (`ActionWorkflowDialog`) that again asks for completion notes and evidence uploads — creating a confusing duplicate flow.

## Root Cause
The "Submit for Verification" button in `ActionDetailSheet` (line 421) calls `onSubmitForVerification(action)` which maps to `handleMarkCompleted` in `useMyActions.ts` (line 84). This closes the sheet and opens the `ActionWorkflowDialog` in `complete` mode — a separate dialog that duplicates the evidence upload and notes fields already present in the detail sheet.

## Solution: Submit Inline from the Detail Sheet
Replace the "Submit for Verification" button in `ActionDetailSheet` with an **inline submission form** (completion notes + optional overdue justification). Evidence is already uploaded via the `ActionEvidenceSection` in the sheet — no need for a second upload step. The `ActionWorkflowDialog` remains for the **Start Work** flow only.

### File 1: `src/pages/incidents/MyActions/ActionDetailSheet.tsx`
- Replace the `canComplete && onSubmitForVerification` button block (lines 420-424) with an inline collapsible submission form:
  - Completion Notes textarea (required)
  - Overdue Justification textarea (conditional, if action is overdue)
  - Submit button that calls a new `onSubmitInline` callback directly
- Add state: `showSubmitForm`, `completionNotes`, `overdueJustification`
- Add a new prop: `onSubmitInline?: (action: ActionForDialog, data: { notes: string; overdueJustification?: string }) => void`
- Remove `onSubmitForVerification` prop entirely

### File 2: `src/pages/incidents/MyActions/MyActionsLayout.tsx`
- Remove `onSubmitForVerification={handleMarkCompleted}` from `ActionDetailSheet`
- Add `onSubmitInline` prop that calls the mutation directly (no evidence files since they're already uploaded via the sheet's `ActionEvidenceSection`)
- Wire it to a new handler that does the status update without re-opening the workflow dialog

### File 3: `src/pages/incidents/MyActions/hooks/useMyActions.ts`
- Add a new `handleSubmitInline` function that:
  - Takes action + notes + optional overdueJustification (no files — already uploaded)
  - Calls `updateInspectionStatus` or `updateStatus` with status `completed`
  - Manages `submittingActionIds` state
  - Closes the detail sheet on success
- Export it from the hook

### What stays unchanged
- `ActionWorkflowDialog` remains for `Start Work` mode (mode=`start`)
- `ActionEvidenceSection` in the detail sheet handles all evidence uploads
- All mutation logic, `.throwOnError()`, and notification triggers remain intact

## Expected Result
- User opens action detail → sees evidence already uploaded → clicks "Submit for Verification" → inline form appears for notes → submits → done. **One screen, no duplicate dialog.**
- Start Work flow continues to use the `ActionWorkflowDialog` as before.

