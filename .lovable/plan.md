

# E2E Audit — Incidents Module (Post-Submission Flow) — Pass 4

## Result: 3 gaps found across status maps

All previous fixes verified clean. This pass focuses on contractor violation statuses and a few edge cases that were missed in earlier audits.

---

## Finding 1: MEDIUM — `current-owner.ts` missing 5 statuses

These statuses fall through to `default: return null`, causing blank ownership in the timeline tracker:

| Status | Expected Owner |
|--------|---------------|
| `pending_contractor_site_rep_approval` | Contractor Site Rep |
| `pending_hsse_violation_review` | HSSE Expert |
| `pending_legal_review` | Legal & Compliance |
| `upgraded_to_incident` | System (closed/terminal) — should return `null` explicitly |
| `rejected_invalid` | System (closed/terminal) — should return `null` explicitly |

**Fix**: Add 3 new `case` blocks with `buildOwner()` for the actionable statuses, and add 2 statuses to the existing terminal/closed group.

---

## Finding 2: MEDIUM — `STATUS_CATEGORIES` missing contractor violation terminal statuses

These 7 statuses are defined in the DB enum and have `STATUS_LABELS` entries but no `STATUS_CATEGORIES` mapping, so they default to `'open'` (blue) instead of their correct category:

| Status | Should Be |
|--------|-----------|
| `pending_contractor_site_rep_approval` | `action_required` |
| `pending_hsse_violation_review` | `action_required` |
| `contractor_violation_enforced` | `closed` |
| `contractor_violation_approved_fine` | `closed` |
| `contractor_violation_cancelled` | `closed` |
| `contractor_violation_warning` | `closed` |
| `contractor_violation_terminated` | `closed` |
| `upgraded_to_incident` | `closed` |
| `rejected_invalid` | `rejected` |

**Fix**: Add 9 entries to `STATUS_CATEGORIES`.

---

## Finding 3: LOW — `IncidentStatus` constants missing contractor violation + escalation statuses

The centralized constants file lacks these statuses that exist in the DB enum:

- `PENDING_CONTRACTOR_SITE_REP_APPROVAL`
- `PENDING_HSSE_VIOLATION_REVIEW`
- `CONTRACTOR_VIOLATION_ENFORCED`
- `CONTRACTOR_VIOLATION_APPROVED_FINE`
- `CONTRACTOR_VIOLATION_CANCELLED`
- `CONTRACTOR_VIOLATION_WARNING`
- `CONTRACTOR_VIOLATION_TERMINATED`
- `UPGRADED_TO_INCIDENT`
- `REJECTED_INVALID`

**Fix**: Add 9 constants to `src/types/incident-statuses.ts`.

---

## Verified Clean

- **InvestigationWorkflowCards**: All actionable statuses have cards (contractor violation cards handled via IncidentDetail.tsx for `pending_contractor_site_rep_approval` and `pending_hsse_violation_review`)
- **STATUS_LABELS**: Complete — all statuses have human-readable labels
- **ACTION_VERBS**: Complete for all actionable statuses
- **Investigation Workspace CTA**: Correctly uses `?incident=` query param
- **Audit Trail**: UUID resolution working
- **AI Analysis**: Edge function integration clean

---

## Files to Edit

| File | Change |
|------|--------|
| `src/lib/current-owner.ts` | Add 3 actionable cases + 2 terminal statuses |
| `src/lib/incident-status-colors.ts` | Add 9 entries to `STATUS_CATEGORIES` |
| `src/types/incident-statuses.ts` | Add 9 missing constants |

