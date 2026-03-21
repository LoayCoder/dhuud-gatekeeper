

# E2E Audit — Investigation Tabs — Pass 15

## Overall Status: CONDITIONAL PASS (1 MEDIUM finding)

---

## System Verification Summary

All 10 sections audited across the full lifecycle:

| # | Section | Nav Button | Content | Data Hook | CRUD | Cross-Tab Integration | Status |
|---|---------|:---:|:---:|------|:---:|------|:---:|
| 1 | Overview | YES | YES | `useIncident` + `useInvestigation` | Read + Start | Progress bar syncs with `unlockedTabs`/`completedTabs` | CLEAN |
| 2 | Evidence | YES | YES | `useEvidenceItems` (REAL hook) | CRUD + Review | Feeds into `useInvestigationCompleteness.hasEvidence` | CLEAN |
| 3 | Witnesses | YES | YES | `useWitnessStatements` | CRUD + Voice + Export | Independent — no cross-tab dependency issues | CLEAN |
| 4 | RCA | YES | YES | `useInvestigation` + AI edge functions | Auto-save + Lock/Unlock + AI | `incidentEventSubtype` now passed correctly; root causes feed into Actions tab via `CauseCoverageIndicator` | CLEAN |
| 5 | Actions | YES | YES | `useCorrectiveActions` + `useInvestigationCompleteness` | CRUD + Submit | `CauseCoverageIndicator` reads RCA data; `SubmitInvestigationCard` aggregates evidence + RCA + actions | **MEDIUM** |
| 6 | Injuries | YES | YES | `useIncidentInjuries` | CRUD + Specialist Review | `ClinicUserAssignmentCard` + `SpecialistDataReviewCard` cycle | CLEAN |
| 7 | Property Damage | YES | YES | `useIncidentPropertyDamages` | CRUD + Specialist Review | `TechEvaluatorAssignmentCard` + `SpecialistDataReviewCard` cycle | CLEAN |
| 8 | Environmental | YES | YES | `useEnvironmentalContaminationEntries` | CRUD + Specialist Review | `EnvironmentalExpertAssignmentCard` + `SpecialistDataReviewCard` cycle | CLEAN |
| 9 | Governance | YES | YES | Investigation data | Violation ID + Submit | Conditional on `canAccessGovernance` + contractor company + `investigation_in_progress` | CLEAN |
| 10 | Audit Log | YES | YES | `useIncidentAuditLogs` | Read + Sort | Always visible, tracks all mutations | CLEAN |

---

## Finding: MEDIUM — SubmitInvestigationCard not shown for `under_investigation` status

**File:** `src/pages/incidents/InvestigationWorkspace/components/InvestigationTabsContent.tsx` (line 214)

The `SubmitInvestigationCard` is gated by:
```typescript
editAccess.canEdit && incidentData?.status === 'investigation_in_progress'
```

But the system treats `under_investigation` as an equivalent active-investigation status:
- `useInvestigationWorkflow.ts` (lines 61-62): both statuses map to DataCollection/Analysis
- `InvestigationWorkflowCards.tsx` (lines 223-225): both return `null` (no card — investigator is working)
- `useInvestigationWorkspaceData.ts` (line 153): both are in `investigationAllowed`
- Tab auto-unlock `useEffect` (line 131): both trigger auto-unlock

Yet `under_investigation` is excluded from the submit card condition.

**Impact:** If an incident reaches `under_investigation` status (legacy or alternate workflow path), the investigator can see and work on all tabs (evidence, RCA, actions) but cannot submit the investigation because the submit button never renders.

**Fix:** Change line 214 from:
```typescript
{editAccess.canEdit && incidentData?.status === 'investigation_in_progress' && (
```
to:
```typescript
{editAccess.canEdit && (incidentData?.status === 'investigation_in_progress' || incidentData?.status === 'under_investigation') && (
```

---

## Verified Clean Areas

**Tab Unlock Logic:** `startInvestigation()` and the `useEffect` auto-unlock both compute identical tab sets based on `has_injury`, `has_damage`, environmental conditions, and `canAccessGovernance`. No desync possible.

**Nav ↔ Content Sync:** All 10 nav buttons use identical conditional logic (`investigationAllowed && isTabUnlocked(key)`) as their corresponding `<section>` blocks. Environmental Impact uses the same subtype array in both places.

**Cross-Tab Data Flow:**
- Evidence → Completeness (`hasEvidence`) → Submit card checklist
- RCA (5-Whys, root causes, contributing factors) → Completeness (`hasRCAData`) → Submit card checklist
- Root causes → `CauseCoverageIndicator` → Submit card cause coverage section
- Actions → Completeness (`hasActions`) → Submit card checklist
- All completeness → `isComplete` → Submit button enabled/disabled
- Submit → server-side `check_investigation_readiness` RPC (double gate)

**Workflow Cards:** 40+ statuses mapped in `InvestigationWorkflowCards.tsx`. `pending_closure` correctly maps to `HSSEIncidentValidationCard` (verified at line 363). `HSSEIncidentValidationCard` includes `pending_closure` in its `validStatuses` (line 43).

**Role-Based Access:** `useInvestigationEditAccess` correctly gates: investigator can edit when not locked; consultant can edit during consultant stages; oversight roles get read-only; closed/pending states lock editing.

**Closure Flow:** `IncidentClosureApprovalCard` shows for `pending_closure` and `pending_final_closure` when `canApprove`. Closure request button shows when `closureEligibility.can_close` and no existing request. `IncidentClosurePrerequisitesCard` shows for `pending_final_closure` and `pending_hsse_incident_validation`.

---

## File to Edit

| Priority | File | Change |
|----------|------|--------|
| MEDIUM | `src/pages/incidents/InvestigationWorkspace/components/InvestigationTabsContent.tsx` | Add `under_investigation` to SubmitInvestigationCard visibility condition (line 214) |

