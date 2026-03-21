

# E2E Audit — Corrective Action Lifecycle (Creation → Verified → Closed)

## Action Status Lifecycle Map

```text
Created (assigned) → in_progress → completed → [HSSE Verification] → closed
                                       ↑                    ↓
                                       └── returned_for_correction
```

## Result: 2 findings (1 MEDIUM, 1 LOW)

---

## Finding 1: MEDIUM — `verifyCorrectiveAction` in Investigation service is missing `return_count` increment, audit logging, and email notifications

There are **3 separate verify implementations** for corrective actions:

| Hook | Location | Used By |
|------|----------|---------|
| `useVerifyAction` | `src/hooks/use-pending-approvals/use-pending-approval-mutations.ts` | Investigation Workspace `ActionVerificationDialog` (Pending Approvals tab) |
| `useVerifyCorrectiveAction` | `src/features/investigation/hooks/use-investigation/use-investigation-mutations.ts` | Investigation Workspace inline actions |
| `useVerifyAction` | `src/features/incidents/hooks/use-inspection-actions/use-action-mutations.ts` | Inspection session action verification |

The **pending-approvals version** (lines 9-165) is the most complete:
- Increments `return_count` on rejection
- Sends email notification to assignee on rejection (`action_returned`)
- Sends email notification on closure (`action_closed`)
- Creates `incident_audit_logs` entry for closures
- Fetches verifier profile name for email

The **investigation service version** (`verifyCorrectiveAction` in `investigationMutationService.ts`, lines 197-224) is missing ALL of the above:
- Does NOT increment `return_count`
- Does NOT send any email notifications
- Does NOT create audit log entries
- Does NOT track verifier name

The **inspection version** (lines 100-151) also lacks `return_count` increment and emails, but does update `last_returned_at` and `last_return_reason`.

**Impact**: When an HSSE Expert verifies/rejects actions from the Investigation Workspace (using `useVerifyCorrectiveAction`), the assignee receives no email notification, the rejection count is not tracked, and no audit trail is created. This breaks HSSE compliance requirements.

**Fix**: Align `verifyCorrectiveAction` in `investigationMutationService.ts` with the pending-approvals version:
1. Fetch action details (title, assigned user email, incident reference, return_count) before updating
2. Increment `return_count` on rejection
3. Send `action_returned` email on rejection
4. Send `action_closed` email on approval
5. Create `incident_audit_logs` entry on approval

Also align the inspection version (`use-action-mutations.ts` lines 100-151) with the same `return_count` increment logic.

---

## Finding 2: LOW — `useVerifyCorrectiveAction` does not invalidate `pending-action-approvals` query cache

When actions are verified/rejected via the Investigation Workspace's inline `useVerifyCorrectiveAction` hook, it only invalidates:
- `corrective-actions`
- `incident`
- `incidents`

But it does NOT invalidate `pending-action-approvals`, which means the Pending Approvals tab will still show the action as pending until the user refreshes or navigates away.

Compare with `useVerifyAction` (pending-approvals), which correctly invalidates:
- `pending-action-approvals`
- `corrective-actions`
- `my-corrective-actions`

**Fix**: Add `pending-action-approvals` and `my-corrective-actions` to the `onSuccess` invalidation list in `useVerifyCorrectiveAction`.

---

## Verified Clean

| Area | Status |
|------|--------|
| Action creation (`useCreateCorrectiveAction`) | CLEAN — Sets status `assigned`, creates audit log, sends assignment email |
| Status transitions: assigned → in_progress → completed | CLEAN — `useUpdateMyActionStatus` correctly sets `started_at`, `completed_date`, `progress_notes`, `completion_notes`, `overdue_justification` |
| Overdue justification enforcement | CLEAN — Memory confirms mandatory notes for overdue completions |
| `ActionWorkflowTimeline` visual tracker | CLEAN — 4-stage stepper (Assigned → In Progress → Pending Verification → Closed) with return count badge |
| My Actions filtering | CLEAN — Correctly groups `assigned`/`pending`/`returned_for_correction` as actionable; `in_progress` as active; `completed`/`verified`/`closed` as done |
| Released-at gate for incident actions | CLEAN — `incidentQueryService` filters `released_at !== null` for incident actions (observations bypass) |
| Evidence upload/view | CLEAN — `useActionEvidence`, `useUploadActionEvidence`, `useDeleteActionEvidence` all functional |
| SLA countdown | CLEAN — Stops for `completed`/`verified`/`closed` statuses |
| Pending approvals query | CLEAN — Filters `status === 'completed'` with role-based access (HSSE Expert/Manager, Environmental Expert/Manager, Admin) |
| Action Center sync | CLEAN — `stat-fetchers.ts` counts actions by tenant |

---

## Files to Edit

| Priority | File | Change |
|----------|------|--------|
| MEDIUM | `src/features/investigation/services/investigationMutationService.ts` | Add return_count increment, email notifications, and audit logging to `verifyCorrectiveAction` |
| MEDIUM | `src/features/investigation/hooks/use-investigation/use-investigation-mutations.ts` | Add `pending-action-approvals` and `my-corrective-actions` to `useVerifyCorrectiveAction` cache invalidation |
| LOW | `src/features/incidents/hooks/use-inspection-actions/use-action-mutations.ts` | Add `return_count` increment to inspection `useVerifyAction` rejection path |

