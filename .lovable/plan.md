

# E2E Audit — Incidents Module (Post-Submission Flow) — Pass 5

## Result: 2 gaps found

### Finding 1: MEDIUM — `UnifiedTimelineTracker.getStepIndex()` missing ~15 incident statuses

The incident (non-observation) path in `getStepIndex()` is missing these statuses, causing them to fall through to `return 0` (step "Reported") instead of the correct step:

| Missing Status | Correct Step |
|---|---|
| `osha_reportable` | 1 (Triage) |
| `pending_escalation_approval` | 1 (Triage) |
| `dept_rep_rejected` | 1 (Triage) |
| `pending_hsse_manager_closure` | 4 (Closed) |
| `pending_action_dispute_review` | 3 (Corrective Actions) |
| `pending_consultant_screening` | 1 (Triage) |
| `pending_consultant_review` | 1 (Triage) |
| `pending_consultant_actions` | 3 (Corrective Actions) |
| `pending_consultant_verification` | 3 (Corrective Actions) |
| `pending_contractor_site_rep_approval` | 3 (Corrective Actions) |
| `pending_hsse_violation_review` | 3 (Corrective Actions) |
| `contractor_violation_enforced` | 4 (Closed) |
| `contractor_violation_approved_fine` | 4 (Closed) |
| `contractor_violation_cancelled` | 4 (Closed) |
| `contractor_violation_warning` | 4 (Closed) |
| `contractor_violation_terminated` | 4 (Closed) |
| `closed_rejected_approved_by_hsse` | 4 (Closed) |
| `upgraded_to_incident` | 4 (Closed) |
| `rejected_invalid` | 4 (Closed) |

**Impact**: Timeline tracker shows the wrong active step for these statuses, misleading users about workflow progress.

**Fix**: Add these statuses to the correct arrays in the incident branch of `getStepIndex()`.

---

### Finding 2: LOW — `CLOSED_STATUSES` and `REJECTED_STATUSES` arrays incomplete

In `src/lib/incident-status-colors.ts`:

**`CLOSED_STATUSES`** (line 109) is missing:
- `hsse_enforced`
- `contractor_violation_enforced`
- `contractor_violation_approved_fine`
- `contractor_violation_cancelled`
- `contractor_violation_warning`
- `contractor_violation_terminated`
- `upgraded_to_incident`

**`REJECTED_STATUSES`** (line 112) is missing:
- `rejected_invalid`

**Impact**: `isOpenStatus()`, `isClosedStatus()`, and `getClosedStatuses()` return wrong results for these terminal statuses. Any filtering logic using these functions (e.g., showing "open" incidents) would incorrectly include closed/terminal records.

**Fix**: Add the missing entries to both arrays.

---

## Verified Clean
- `current-owner.ts`: All statuses mapped (complete)
- `STATUS_CATEGORIES`: All statuses mapped (complete)
- `STATUS_LABELS` / `ACTION_VERBS`: All statuses have labels (complete)
- `InvestigationWorkflowCards`: All actionable statuses have cards (complete)
- Investigation Workspace CTA: Correct `?incident=` query param (complete)
- `IncidentStatusBadge`: Has fallback for unmapped statuses (acceptable)

## Files to Edit

| File | Change |
|------|--------|
| `src/features/investigation/components/UnifiedTimelineTracker.tsx` | Add ~19 missing statuses to incident path in `getStepIndex()` |
| `src/lib/incident-status-colors.ts` | Add 7 entries to `CLOSED_STATUSES`, 1 to `REJECTED_STATUSES` |

