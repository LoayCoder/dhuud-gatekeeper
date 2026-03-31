

# Plan: Build Complete Action Closure Workflow

## Problem Summary
Three critical pieces are missing:
1. **No dialogs rendered** in My Actions — clicking "Start Work", "Mark Completed", or the calendar button sets state but no dialog component exists in the layout
2. **No action detail view** — no way to see action details, evidence, or history
3. **No verification/rework cycle** — the assignee workflow ends at "completed" with no proper "Submit for Verification" step, and inspectors have no verification UI in the My Actions context

## What exists (reusable)
- `useUpdateInspectionActionStatus` — handles `in_progress`, `completed` with notes/evidence
- `useVerifyAction` — handles approve (→ `closed`) and reject (→ `returned_for_correction`) with emails
- `ActionVerificationDialog` — exists for session workspace (approve/reject UI)
- `ActionEvidenceSection` — exists for both inspection and investigation contexts
- `useUploadActionEvidence` — file upload mutation
- DB columns: `status`, `started_at`, `completed_date`, `verified_by`, `verified_at`, `verification_notes`, `rejected_by`, `rejected_at`, `rejection_notes`, `return_count`, `last_returned_at`, `last_return_reason`, `progress_notes`, `completion_notes`, `overdue_justification`

## Workflow to implement

```text
assigned / returned_for_correction
    ↓ [Start Work] (assignee provides optional notes)
in_progress
    ↓ [Submit for Verification] (assignee provides evidence + completion notes)
completed (= pending verification)
    ↓ [Inspector reviews]
    ├── Approve → closed (locked, audit logged)
    └── Reject → returned_for_correction (with mandatory reason → back to assignee)
```

## Implementation

### 1. Create `ActionWorkflowDialog.tsx`
**File:** `src/pages/incidents/MyActions/ActionWorkflowDialog.tsx`

A single dialog with two modes:
- **Start Work mode**: shows action details, optional progress notes field, confirm button
- **Complete/Submit mode**: shows action details, mandatory completion notes textarea, evidence upload area (reuse `ActionEvidenceSection` pattern or inline file input), overdue justification field (if overdue), submit button labeled "Submit for Verification"

This dialog is what opens when clicking "Start Work" or "Mark Completed" buttons.

### 2. Create `ExtensionRequestDialog.tsx`
**File:** `src/pages/incidents/MyActions/ExtensionRequestDialog.tsx`

Simple dialog with:
- Current due date display
- Requested new date picker
- Reason textarea (mandatory)
- Submit button

### 3. Create `ActionDetailSheet.tsx`
**File:** `src/pages/incidents/MyActions/ActionDetailSheet.tsx`

A slide-over sheet that opens when clicking the action card itself (not the buttons). Shows:
- Full action details (title, description, reference, priority, status, dates)
- Timeline/history (status changes, return reasons if any)
- Evidence section (reuse `ActionEvidenceSection`)
- Action buttons at bottom based on current status
- Return feedback banner if status is `returned_for_correction` (shows last_return_reason)

### 4. Render dialogs in `MyActionsLayout.tsx`
Add the three new components at the bottom of the JSX:
- `<ActionWorkflowDialog>` bound to `actionDialogOpen` / `actionDialogAction` / `actionDialogMode`
- `<ExtensionRequestDialog>` bound to `extensionRequestAction`
- `<ActionDetailSheet>` bound to a new `selectedActionDetail` state

### 5. Update `ActionsTab.tsx`
- Make the card itself clickable → opens `ActionDetailSheet`
- Change "Mark Completed" label to "Submit for Verification" for clarity
- Add status-aware button: show "Submit for Verification" when `in_progress`, show "Start Work" when `assigned`/`returned_for_correction`
- Add return feedback banner on action cards with `returned_for_correction` status showing last_return_reason

### 6. Update `useMyActions.ts`
- Add `selectedActionDetail` / `setSelectedActionDetail` state
- Pass it through viewProps
- Update `handleMarkCompleted` to use status `completed` (= pending verification in the workflow)

### 7. Update `helpers.tsx`
- Add status icons for `completed` (pending verification), `returned_for_correction` (rework required)

### 8. Update `useMyActionsFilters.ts`
- `returned_for_correction` should be categorized under `pending` (action required by assignee)

## Files to create/modify

| # | File | Action |
|---|------|--------|
| 1 | `src/pages/incidents/MyActions/ActionWorkflowDialog.tsx` | Create — Start Work + Submit for Verification dialog |
| 2 | `src/pages/incidents/MyActions/ExtensionRequestDialog.tsx` | Create — Due date extension request dialog |
| 3 | `src/pages/incidents/MyActions/ActionDetailSheet.tsx` | Create — Full action detail slide-over |
| 4 | `src/pages/incidents/MyActions/MyActionsLayout.tsx` | Modify — Render the 3 new dialogs |
| 5 | `src/pages/incidents/MyActions/tabs/ActionsTab.tsx` | Modify — Clickable cards, return banner, button labels |
| 6 | `src/pages/incidents/MyActions/hooks/useMyActions.ts` | Modify — Add selectedActionDetail state |
| 7 | `src/pages/incidents/MyActions/helpers.tsx` | Modify — Add more status icons |
| 8 | `src/pages/incidents/MyActions/types.ts` | Modify — Add ActionDetailSheet props to viewProps |

No database migration needed — all required columns already exist.

## Expected outcome
- "Start Work" opens a dialog with notes field → transitions to `in_progress`
- "Submit for Verification" opens a dialog with evidence upload + notes → transitions to `completed`
- Calendar button opens extension request dialog
- Clicking action card opens detail sheet with full info, evidence, and history
- Returned actions show rejection reason banner and allow re-submission
- Inspector verification exists in session workspace (already built); assignee-side workflow is now complete
- Full audit trail via existing DB columns (`started_at`, `completed_date`, `return_count`, etc.)

