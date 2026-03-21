

# E2E Audit — HSSE Events Reporting System — Pass 7

## Result: 3 findings requiring code changes

Previous passes (1-6) addressed status maps, timeline tracking, ownership resolution, and constants. This pass audits **InvestigationWorkflowCards coverage** and the remaining `STATUS_CATEGORIES` gap.

---

## Finding 1: MEDIUM — `InvestigationWorkflowCards` missing 7 actionable statuses

The `switch` in `InvestigationWorkflowCards.tsx` has no `case` for these statuses, so when an incident reaches them, the Investigation Workspace shows **no actionable card** — users see nothing to act on.

| Missing Status | Card to Render |
|---|---|
| `pending_investigator_assignment` | `InvestigatorAssignmentStep` (same as `investigation_pending`) |
| `osha_reportable` | `HSSEExpertScreeningCard` (OSHA requires HSSE Expert action) |
| `pending_contractor_site_rep_approval` | `ContractorSiteRepAcknowledgeCard` (already imported in IncidentDetail but not in this file) |
| `pending_hsse_violation_review` | `HSSEViolationReviewCard` (already imported in IncidentDetail but not in this file) |
| `pending_escalation_approval` | `HSSEManagerEscalationCard` (HSSE Manager reviews escalation) |
| `dept_rep_rejected` | `RejectionConfirmationCard` (same pattern as `expert_rejected`) |
| `investigation_in_progress` / `under_investigation` | No card needed (investigation is active — workspace tabs handle this). However, should return `null` explicitly rather than falling through `default`. |

**Impact**: Users navigating to the Investigation Workspace for these statuses see a blank workflow area with no action buttons.

**Fix**: Add 6 new `case` blocks to the switch in `InvestigationWorkflowCards.tsx`:
- `pending_investigator_assignment` → falls through to `investigation_pending`
- `osha_reportable` → renders `HSSEExpertScreeningCard`
- `pending_contractor_site_rep_approval` → renders `ContractorSiteRepAcknowledgeCard` (import from `@/features/investigation`)
- `pending_hsse_violation_review` → renders `HSSEViolationReviewCard` (import from `@/features/investigation`)
- `pending_escalation_approval` → renders `HSSEManagerEscalationCard`
- `dept_rep_rejected` → renders `RejectionConfirmationCard`

---

## Finding 2: LOW — `STATUS_CATEGORIES` missing `pending_expert_screening`

In `src/lib/incident-status-colors.ts`, the `STATUS_CATEGORIES` map has `expert_screening` mapped to `'open'` (line 27) but `pending_expert_screening` is absent. It has labels and action verbs, but no category — so `getStatusCategory('pending_expert_screening')` returns `'open'` (blue) via fallback, which happens to be correct for screening. However, since the HSSE Expert is expected to take action, it should be `'action_required'` (amber) to match `expert_screening`.

**Fix**: Add `'pending_expert_screening': 'action_required'` to `STATUS_CATEGORIES`. Also verify `expert_screening` should similarly be `'action_required'` rather than `'open'`.

---

## Finding 3: INFORMATIONAL — Edge function `check-geofence-compliance` has persistent DB error

The function errors every 60 seconds with `column security_zones_1.name does not exist`. This is a PostgREST join aliasing issue when the same table appears in multiple joins. This is outside the HSSE Events scope but worth noting as it generates continuous error logs.

---

## Verified Clean (cumulative from passes 1-6)

- `current-owner.ts`: All 45+ statuses mapped
- `incident-status-colors.ts`: `STATUS_LABELS`, `ACTION_VERBS`, `CLOSED_STATUSES`, `REJECTED_STATUSES` complete
- `UnifiedTimelineTracker`: `getStepIndex()` complete for all statuses
- `incident-statuses.ts`: 49 constants covering full DB enum
- Navigation: Investigation Workspace CTA uses correct `?incident=` query param
- IncidentDetail.tsx: Contractor violation cards rendered for `related_contractor_company_id` incidents
- Audit trail: UUID resolution working

---

## Files to Edit

| Priority | File | Change |
|----------|------|--------|
| MEDIUM | `src/pages/incidents/InvestigationWorkspace/components/InvestigationWorkflowCards.tsx` | Add 6 missing `case` blocks + 2 imports |
| LOW | `src/lib/incident-status-colors.ts` | Add `pending_expert_screening` to `STATUS_CATEGORIES` as `action_required`; update `expert_screening` from `open` to `action_required` |

