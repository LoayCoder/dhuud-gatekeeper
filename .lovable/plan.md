

# Systematic i18n Audit Plan

## Current State

The build is **succeeding** — the truncated output is just the long list of generated chunks, not an error. The real issues are untranslated UI strings.

After auditing the codebase, here are all findings classified by type:

---

## TYPE A — Hardcoded English Strings (not using `t()`)

### Priority 1: Investigation Workspace Tabs
**File:** `src/pages/incidents/InvestigationWorkspace/components/InvestigationTabsContent.tsx`
- Line 104: `Evidence` (hardcoded JSX text)
- Line 109: `Witnesses`
- Line 114: `RCA`
- Line 119: `Actions`
- Line 124: `Injuries`
- Line 129: `Property Damage`
- Line 134: `Governance`

**Fix:** Wrap each with `t('investigation.tabs.evidence', 'Evidence')`, etc. Add keys to both en and ar JSON.

### Priority 2: Workflow Status Labels
**File:** `src/features/incidents/components/dashboard/MajorEventsTimeline.tsx` (lines 48-55)
- `Submitted`, `Expert Screening`, `Pending Approval`, `Investigation`, `Pending Closure`, `Closed`

**File:** `src/features/incidents/components/detail/IncidentWorkflowCard.tsx` (lines 32-57)
- 3 workflow arrays with ~18 hardcoded labels: `Submitted`, `Expert Screening`, `Investigation`, `Pending Closure`, `Closed`, `Manager Review`, `HSSE Review`, `Final Closure`, `Consultant Review`, `Site Client Approval`, `Implementation`, `Verification`, `Violation (if any)`

**Fix:** These are defined outside the component (before `useTranslation` is available). Move labels into the component render, or use a function that accepts `t`. Add keys under `workflow.status.*` in both JSONs.

### Priority 3: KPI Evaluation Panel
**File:** `src/components/kpi/KPIEvaluationPanel.tsx` (lines 16-44)
- `Exceeding`, `On Track`, `At Risk`, `Failing`

**Fix:** Move into component or use a getter function with `t()`.

### Priority 4: Investigation Task Types
**File:** `src/features/investigation/components/TeamTaskAssignmentPanel.tsx` (lines 36-41)
- `Evidence Collection`, `Witness Interview`, `Property Assessment`, `Injury Documentation`

### Priority 5: SLA Classification Labels
**File:** `src/components/sla/FindingSLACard.tsx` (lines 14-49)
- `Critical NC`, `Major NC`, `Minor NC`, `Observation`

### Priority 6: Asset Import Status Options
**File:** `src/features/assets/components/import/ImportFieldEditor.tsx` (lines 57-62)
- `Active`, `Out of Service`, `Under Maintenance`, `Retired`, `Missing`

### Priority 7: KPI Dashboard PDF Export
**File:** `src/features/incidents/components/dashboard/KPIDashboardExport.tsx` (lines 240-262)
- `TRIR`, `LTIFR`, `DART Rate`, `Fatality Rate`, `Severity Rate`, `Near Miss Rate`, `Action Closure %`, `Observation %`

### Priority 8: Debug Page
**File:** `src/pages/incidents/InvestigationWorkspaceDebug.tsx` (line 294)
- `Loading Incidents...`

---

## TYPE B — Missing Keys in ar/translation.json

Based on the audit, the following `t()` keys used in code with fallbacks **already exist** in ar/translation.json:
- `hsseDashboard.eventDistribution` ✅
- `hsseDashboard.trendAnalysis` ✅
- `hsseDashboard.actionsInvestigations` ✅
- `executiveSummary.title/overallScore/topPriorities` ✅
- `kpiDashboard.recordableInjuries/lostTimeInjuries/etc.` ✅
- `common.allBranches/allMonths/filters` ✅
- `contractors.nav.*` ✅
- `security.menu.*` ✅

**No significant TYPE B issues found** — previous fixes already added the Arabic translations.

---

## TYPE C — Wrong/Mismatched Keys

No mismatched keys detected. All `t()` calls use paths that match the JSON structure.

---

## Implementation Plan (by priority)

### Step 1: Fix Investigation Workspace Tabs (7 strings)
- Edit `InvestigationTabsContent.tsx` — wrap 7 tab labels with `t()`
- Add 7 keys to en/ar JSON under `investigation.tabs.*`

### Step 2: Fix Workflow Status Labels (18 strings across 2 files)
- `MajorEventsTimeline.tsx` — convert `statusConfig` to use `t()` inside component
- `IncidentWorkflowCard.tsx` — convert 3 workflow arrays to use `t()` inside component
- Add keys under `workflow.status.*` in both JSONs

### Step 3: Fix KPI Evaluation Panel (4 strings)
- `KPIEvaluationPanel.tsx` — move `statusConfig` labels into component with `t()`
- Add keys under `kpi.status.*`

### Step 4: Fix Team Task Assignment (4 strings)
- `TeamTaskAssignmentPanel.tsx` — wrap labels with `t()`
- Add keys under `investigation.taskTypes.*`

### Step 5: Fix SLA Classification Labels (4 strings)
- `FindingSLACard.tsx` — wrap with `t()`
- Add keys under `sla.classification.*`

### Step 6: Fix Asset Import Labels (5 strings)
- `ImportFieldEditor.tsx` — wrap with `t()`
- Add keys under `assets.status.*`

### Step 7: Fix KPI Dashboard Export (8 strings)
- `KPIDashboardExport.tsx` — wrap labels with `t()`
- Use existing `kpiDashboard.*` keys

### Step 8: Add all new Arabic translations
- Add ~50 new Arabic translations covering all the above keys

---

## Summary of Changes

| Metric | Count |
|--------|-------|
| Files to edit (code) | 7 component files |
| Files to edit (JSON) | 2 (en + ar translation.json) |
| TYPE A fixes | ~50 hardcoded strings |
| TYPE B fixes | 0 (already covered) |
| TYPE C fixes | 0 (no mismatches) |
| New en keys | ~50 |
| New ar translations | ~50 |

No new translation files will be created. All keys go into existing `en/translation.json` and `ar/translation.json`.

