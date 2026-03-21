

# E2E Audit Report — Incidents Module (Post-Submission Flow)

## Finding 1: CRITICAL — `current-owner.ts` missing 6 incident-specific statuses

**Impact**: For these statuses, `getCurrentOwner()` returns `null` (falls through to `default`), so the UnifiedTimelineTracker shows no ownership info — no name, no "unassigned" warning. Users see a blank active step.

**Missing statuses in `current-owner.ts`**:

| Status | Expected Owner |
|--------|---------------|
| `pending_clinic_review` | Clinic User |
| `pending_department_manager_violation_approval` | Department Manager |
| `pending_contract_controller_approval` | Contract Controller |
| `pending_hsse_incident_validation` | HSSE Team |
| `pending_escalation_approval` | HSSE Manager |
| `osha_reportable` | HSSE Expert |

**Fix**: Add 6 new `case` blocks to the `switch` in `src/lib/current-owner.ts`, mapping each to the correct role with `buildOwner(null, "Role", true)`.

---

## Finding 2: MEDIUM — `incident-statuses.ts` missing several incident workflow statuses

The centralized constants file `src/types/incident-statuses.ts` only has ~20 entries but the actual codebase uses 40+ statuses. Missing from the constants:

- `pending_clinic_review`
- `pending_department_manager_violation_approval`
- `pending_contract_controller_approval`
- `pending_hsse_incident_validation`
- `pending_escalation_approval`
- `under_investigation`
- `pending_investigator_assignment`
- `monitoring_30_day`, `monitoring_60_day`, `monitoring_90_day`
- `dispute_resolution`, `pending_contractor_dispute_review`
- `pending_legal_review` (already in the file but inconsistently)
- Several contractor/observation statuses

**Fix**: Add all missing statuses to `src/types/incident-statuses.ts` so the single source of truth is actually complete. Components that reference raw strings should migrate to use these constants.

---

## Finding 3: LOW — `IncidentDetail.tsx` only shows observation workflow cards, not incident workflow cards

In `IncidentDetail.tsx` (lines 296-311), workflow approval cards (like `HSSEObservationValidationCard`, `ObservationClosureGate`) are conditionally rendered only for `event_type === 'observation'`. For incidents, only contractor-related cards appear (lines 304-311). There is no rendering of incident-specific cards like `ClinicReviewCard`, `LegalReviewCard`, `MonitoringCheckCard`, etc. on the detail page.

**Impact**: Low — the Investigation Workspace (`/incidents/investigate`) handles all these via `InvestigationWorkflowCards.tsx`. The detail page is primarily read-only. However, users navigating directly to `/incidents/:id` won't see actionable workflow cards for incident-specific stages.

**Recommendation**: Either add incident workflow card rendering to `IncidentDetail.tsx` or add a prominent "Open in Investigation Workspace" CTA for non-closed incidents.

---

## Finding 4: LOW — `InvestigationTabsContent.tsx` nav tabs use inverted lock logic

Lines 102-136 show tabs when `isTabLocked('evidence')` returns `true`, which seems inverted. Looking at the logic: `isTabLocked = (tabKey) => !unlockedTabs.includes(tabKey)` — so `isTabLocked` returns `true` when the tab is NOT unlocked. But the condition renders the button when `isTabLocked` is true, meaning it shows the nav button for locked tabs.

**Impact**: Actually correct by accident — the tabs render for display but sections also check `isTabLocked` on lines 154-282, gating content visibility the same way. The naming is confusing but functionally correct. No code change needed — just noting the confusing naming.

---

## Verified Clean Areas

- **InvestigationWorkflowCards.tsx**: All 30+ statuses have dedicated action cards including clinic review, legal review, dispute, monitoring, contractor violations, OSHA, and escalation
- **UnifiedTimelineTracker**: Correctly maps all statuses to 5-step indices for both observations and incidents
- **Audit Trail**: UUID resolution working correctly for actors and branches
- **Action Center**: Incident filtering via `event_type` is correct
- **SPA Refresh**: Uses `handleRefresh()` with React Query invalidation, no `window.location.reload()`
- **Status Labels**: Complete coverage in `incident-status-colors.ts` with bilingual support in `workflow-status-resolver.ts`
- **Closure Flow**: Prerequisites card, closure request dialog, and approval card all properly gated

---

## Summary of Required Changes

| Priority | File | Change |
|----------|------|--------|
| CRITICAL | `src/lib/current-owner.ts` | Add 6 missing incident status cases |
| MEDIUM | `src/types/incident-statuses.ts` | Add ~15 missing status constants |
| LOW | `src/pages/incidents/IncidentDetail.tsx` | Add "Open in Investigation Workspace" CTA for active incidents |

