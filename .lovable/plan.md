

## Fix Translation Keys for `/security/handover` Page

### Problem
The English `security.handover` sub-object (line 1544 in `en/translation.json`) only has 11 keys, but the page and its sub-components (`ShiftHandover.tsx`, `VacationHandoverForm.tsx`, `HandoverApprovalDialog.tsx`) use ~30+ keys under `security.handover.*`. The missing keys fall back to the default string parameter in `t()` calls, meaning:
- English works visually (fallback strings are English) but keys are untracked
- Arabic translations exist in the correct location (line 9794) and should work via `parseJsonDedup` merge of duplicate `security` objects

### Fix: Add missing keys to English `security.handover` object

In `src/locales/en/translation.json`, expand the `handover` object at line 1544 to include all keys used by the 3 components:

**Keys to add** (to the existing `handover` object inside `security`):
```json
"vacationHandover": "Vacation/Resignation",
"vacationResignation": "Vacation/Resignation",
"vacationResignationList": "Vacation & Resignation Handovers",
"vacationTitle": "Vacation/Resignation Handover",
"vacationDesc": "This handover requires manager approval before assignment",
"noVacationHandovers": "No vacation/resignation handovers",
"assignedTo": "Assigned to",
"completed": "Completed",
"acknowledged": "Acknowledged",
"pending": "Pending",
"reviewHandover": "Review Handover",
"reviewHandoverDesc": "Review and approve or reject this handover request",
"assignFollowup": "Assign Follow-up Guard",
"selectGuard": "Select a guard...",
"rejectionReason": "Rejection Reason",
"rejectionReasonPlaceholder": "Explain why this handover is being rejected...",
"rejectHandover": "Reject",
"approveHandover": "Approve & Assign",
"confirmReject": "Confirm Rejection",
"approveFailed": "Approval Failed",
"rejectFailed": "Rejection Failed",
"submitted": "Handover Submitted",
"awaitingApproval": "Awaiting manager approval",
"submitFailed": "Submission Failed",
"type": "Handover Type",
"typeDesc": "Select the reason for this handover"
```

Also verify the Arabic file's `handover` object (line 9794) has matching keys — from the read, it already has the core ones (`pending`, `acknowledged`, `approved`, `rejected`, `completed`, `vacation`, `resignation`, `vacationHandover`, `vacationResignation`, etc.). Will add any missing Arabic keys for the approval dialog strings.

### Files Changed
- `src/locales/en/translation.json` — expand `security.handover` object (~25 new keys)
- `src/locales/ar/translation.json` — add missing approval dialog keys to `security.handover` object (~10 new keys)

