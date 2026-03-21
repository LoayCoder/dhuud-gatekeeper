

# Audit Correction — Missing Environmental Impact Navigation Tab

## Current State

The Investigation Workspace (`InvestigationTabsContent.tsx`) has **9 tab sections**, not 6:

| # | Tab | Nav Button | Section Content | Conditional On |
|---|-----|:----------:|:---------------:|----------------|
| 1 | Overview | YES | YES | Always shown |
| 2 | Evidence | YES | YES | `isTabLocked('evidence')` |
| 3 | Witnesses | YES | YES | `isTabLocked('witnesses')` |
| 4 | RCA | YES | YES | `isTabLocked('rca')` |
| 5 | Actions | YES | YES | `isTabLocked('actions')` |
| 6 | Injuries | YES | YES | `has_injury` + locked |
| 7 | Property Damage | YES | YES | `has_damage` + locked |
| 8 | **Environmental Impact** | **NO** | YES | event_type/subtype + locked |
| 9 | Governance | YES | YES | `canAccessGovernance` + locked |

## Finding: MEDIUM — Environmental Impact tab missing navigation button

The section content for Environmental Impact exists (lines 257-280) with its `Leaf` icon already imported, but there is **no corresponding navigation button** in the sticky jump nav (lines 87-137). Users cannot scroll-jump to this section even when it is visible.

## Fix

Add an Environmental Impact navigation button in `InvestigationTabsContent.tsx` between the Property Damage button and the Governance button (after line 136), using the same conditional logic as the section content:

```
selectedIncident?.event_type matches environmental/environment
OR subtype is in the environmental subtypes list
AND isTabLocked('environmental-impact')
```

The button will use the already-imported `Leaf` icon and follow the exact same pattern as the other nav buttons (scroll-to-section + setActiveTab).

## File to Edit

| File | Change |
|------|--------|
| `src/pages/incidents/InvestigationWorkspace/components/InvestigationTabsContent.tsx` | Add Environmental Impact nav button (lines ~136, before Governance button) |

