

# E2E Audit — Investigation Workspace Tabs — Pass 13

## Overall Status: CONDITIONAL PASS (1 MEDIUM, 1 LOW finding)

---

## Tab Inventory & Status

All 9 tab sections verified in `InvestigationTabsContent.tsx`:

| # | Tab | Nav Button | Section Content | Panel Component | Data Hook | CRUD | Status |
|---|-----|:---:|:---:|------|------|:---:|:---:|
| 1 | Overview | YES | YES | `OverviewPanel` | `useIncident` + `useInvestigation` | Read + Start | CLEAN |
| 2 | Evidence | YES | YES | `EvidenceManager` | `useEvidenceItems` | CRUD + Download + Review | CLEAN |
| 3 | Witnesses | YES | YES | `WitnessPanel` | `useWitnessStatements` | CRUD + Voice + Upload + Review + Export | CLEAN |
| 4 | RCA | YES | YES | `RCAPanel` | `useInvestigation` + `useRCAAI` | Form + Auto-save + Lock/Unlock + AI Assist | **MEDIUM** |
| 5 | Actions | YES | YES | `ActionsPanel` + `SubmitInvestigationCard` + `CauseCoverageIndicator` | `useCorrectiveActions` + `useInvestigationCompleteness` | CRUD + Submit | CLEAN |
| 6 | Injuries | YES | YES | `InjuryPanel` + `ClinicUserAssignmentCard` + `SpecialistDataReviewCard` | `useIncidentInjuries` + `useSpecialistReview` | CRUD + Specialist Review Cycle | CLEAN |
| 7 | Property Damage | YES | YES | `PropertyDamagePanel` + `TechEvaluatorAssignmentCard` + `SpecialistDataReviewCard` | `useIncidentPropertyDamages` + `useSpecialistReview` | CRUD + Specialist Review Cycle | CLEAN |
| 8 | Environmental Impact | YES | YES | `EnvironmentalImpactPanel` + `EnvironmentalExpertAssignmentCard` + `SpecialistDataReviewCard` | `useEnvironmentalContaminationEntries` + `useSpecialistReview` | CRUD + Specialist Review Cycle | CLEAN |
| 9 | Governance | YES | YES | `InvestigatorViolationIdentificationCard` + `InvestigatorViolationSubmissionCard` | Investigation data | Violation ID + Submit | CLEAN |
| 10 | Audit Log | **NO** | YES (outside tabs) | `AuditLogPanel` | `useIncidentAuditLogs` | Read + Sort | **LOW** |

---

## Finding 1: MEDIUM — RCAPanel missing `incidentEventSubtype` prop from InvestigationTabsContent

`RCAPanel` accepts an `incidentEventSubtype` prop (line 74) which is used in **6 locations**:
- AI Immediate Cause suggestion payload (`event_subtype` field)
- AI Underlying Cause suggestion payload
- `FiveWhysBuilder` component (`eventSubtype` prop)
- `AISummaryPanel` component (`eventSubtype` prop) — appears twice
- `ContributingFactorsBuilder` / root cause AI context

However, `InvestigationTabsContent` (lines 186-194) does NOT pass this prop:
```
<RCAPanel
  incidentId={selectedIncidentId}
  incidentStatus={selectedIncident?.status}
  incidentTitle={selectedIncident?.title}
  incidentDescription={selectedIncident?.description}
  incidentSeverity={selectedIncident?.severity}
  incidentEventType={selectedIncident?.event_type}
  canEdit={editAccess.canEdit}
/>
```

The `subtype` field IS available on `selectedIncident` (confirmed in `incidentQueryService.ts` query). It's simply not being passed through.

**Impact**: All AI-assisted RCA features (immediate cause suggestion, underlying cause suggestion, 5-Whys AI helper, AI summary generation) receive `undefined` for `event_subtype`. This degrades AI output quality — for example, an "oil_chemical_spill_land" incident would not give the AI the subtype context needed for precise cause analysis.

**Fix**: Add `incidentEventSubtype={selectedIncident?.subtype}` to the RCAPanel in `InvestigationTabsContent.tsx` (line ~193).

---

## Finding 2: LOW — Audit Log has no navigation button in sticky jump nav

The `AuditLogPanel` is rendered in `InvestigationWorkspace.tsx` (line 256), outside of `InvestigationTabsContent`. It appears at the bottom of the workspace but has no corresponding nav button in the sticky jump nav bar. Users must manually scroll to find it.

**Impact**: Low usability friction. The audit trail is always visible at the bottom but not quickly accessible via the nav bar.

**Fix**: Add an "Audit Log" nav button at the end of the sticky nav in `InvestigationTabsContent.tsx` (after Governance). Since the panel is outside the component, the scroll target `#audit-log` needs to be set as an `id` on the `AuditLogPanel`'s wrapper. Two options:
1. Move AuditLogPanel inside InvestigationTabsContent (cleanest)
2. Keep it external but add nav button that scrolls to `#audit-log` and add `id="audit-log"` wrapper in InvestigationWorkspace.tsx

Option 2 is less intrusive since AuditLogPanel is intentionally always visible (not gated by `investigationAllowed`).

---

## Verified Clean Details

**Overview Tab**: Renders `ReporterInfoCard`, `IncidentInfoCard`, `InvestigatorAssignmentCard`, `LinkedAssetsCard`, `ContractorPersonnelCard`, `SeverityAdjustmentCard`, `ApprovalWorkflowBanner`. Progress bar calculates from `completedTabs`/`unlockedTabs`. Admin edit dialog available.

**Evidence Tab**: Full CRUD with file upload (image compression), download, review comments, delete confirmation. CCTV metadata display. Session traceability. Locked state for closed incidents and non-investigators.

**Witnesses Tab**: 4 input modes (text, voice, upload, task assignment). Review workflow (pending → review → approved/returned). Word document export with branding. Role-based review access.

**Actions Tab**: `CauseCoverageIndicator` tracks root cause → action linkage. `ActionsPanel` with create/edit/delete. `SubmitInvestigationCard` with 6-point completeness checklist + server-side readiness gate. Only shows submit when `investigation_in_progress`.

**Injuries Tab**: Statistics dashboard (total, hospitalized, days lost, severity breakdown). CRUD via `InjuryEntryForm` with body parts selector. `ClinicUserAssignmentCard` for specialist assignment. `SpecialistDataReviewCard` with draft → submitted → approved/returned cycle.

**Property Damage Tab**: Statistics (total, estimated cost with currency, downtime hours, severity). Safety hazard alert. Same CRUD + specialist review pattern as Injuries.

**Environmental Impact Tab**: Statistics (entries, cost in SAR, regulatory breaches, severity). Regulatory breach alert banner. Same CRUD + specialist review pattern. `EnvironmentalContaminationForm` with spill-specific fields.

**Governance Tab**: Conditional on `canAccessGovernance` + contractor company link + `investigation_in_progress` status. `InvestigatorViolationIdentificationCard` and `InvestigatorViolationSubmissionCard` for contractor violations.

**Specialist Review Cycle** (shared across Injuries, Property Damage, Environmental): `SpecialistDataReviewCard` implements draft → submitted → approved/returned flow. Assigned specialist can submit; investigation lead can approve/return with mandatory notes. Correctly hidden when user has neither `canSubmit` nor `canReview`.

---

## Files to Edit

| Priority | File | Change |
|----------|------|--------|
| MEDIUM | `src/pages/incidents/InvestigationWorkspace/components/InvestigationTabsContent.tsx` | Add `incidentEventSubtype={selectedIncident?.subtype}` to RCAPanel props |
| LOW | `src/pages/incidents/InvestigationWorkspace/components/InvestigationTabsContent.tsx` | Add Audit Log nav button (History icon, scrolls to `#audit-log`) |
| LOW | `src/pages/incidents/InvestigationWorkspace.tsx` | Wrap AuditLogPanel in `<section id="audit-log">` |

