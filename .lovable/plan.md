

## Findings

The translation issue on `/incidents/my-actions` is actually a **much bigger problem**: the entire page is a non-functional placeholder stub. The `MyActionsLayout.tsx` only renders a title and a count. All 6 tab files (`ActionsTab.tsx`, `InvestigationsTab.tsx`, `InspectionsTab.tsx`, `WitnessTab.tsx`, `ReportedTab.tsx`, `ApprovalsTab.tsx`) are **empty** (0 bytes).

It appears a refactoring script (`refactor-myactions-tabs.cjs`) was run to extract tabs from a full layout, but the extraction failed — the tab files are empty and the layout was replaced with a stub.

### What needs to happen

Rebuild the full `MyActionsLayout.tsx` with all 6 tabs, using the existing hooks (`useMyActions`, `useMyActionsFilters`, `useMyApprovalsState`) which are intact and fully functional. All text must use `t()` calls referencing existing keys under `investigation.*`.

### Plan

#### 1. Rebuild `MyActionsLayout.tsx` (~350 lines)

Full layout with:
- KPI summary cards (overdue, pending, in-progress, awaiting verification, closed, statements, approvals)
- Search bar and priority filter
- Tabbed interface with 6 tabs: Actions, Investigations, Inspections, Witness, Reported, Approvals
- All text via `t()` using existing `investigation.*` keys

#### 2. Rebuild `tabs/ActionsTab.tsx` (~120 lines)

- Active actions list with status icons, priority badges, due date info
- Action buttons: Start Work, Mark Completed, Request Extension
- Closed actions toggle
- Action confirmation dialog integration

#### 3. Rebuild `tabs/InvestigationsTab.tsx` (~50 lines)

- List of assigned investigations with status, severity, link to workspace

#### 4. Rebuild `tabs/InspectionsTab.tsx` (~50 lines)

- Scheduled inspections list with date, location, status

#### 5. Rebuild `tabs/WitnessTab.tsx` (~60 lines)

- Pending witness statements with incident reference
- Inline witness statement form via `WitnessDirectEntry`

#### 6. Rebuild `tabs/ReportedTab.tsx` (~50 lines)

- My reported incidents list with status tracking

#### 7. Rebuild `tabs/ApprovalsTab.tsx` (~100 lines)

- Severity approvals, action verifications, incident approvals, closure requests, extension requests, contractor approvals (workers, gate passes, companies)
- Role-gated sections

### Translation keys

All required keys already exist in both EN and AR under the `investigation` namespace (`investigation.myActions`, `investigation.correctiveActions`, `investigation.approvals.*`, etc.). No new translation keys needed.

### Files Modified

1. `src/pages/incidents/MyActions/MyActionsLayout.tsx` — Full rebuild
2. `src/pages/incidents/MyActions/tabs/ActionsTab.tsx` — Full rebuild
3. `src/pages/incidents/MyActions/tabs/InvestigationsTab.tsx` — Full rebuild
4. `src/pages/incidents/MyActions/tabs/InspectionsTab.tsx` — Full rebuild
5. `src/pages/incidents/MyActions/tabs/WitnessTab.tsx` — Full rebuild
6. `src/pages/incidents/MyActions/tabs/ReportedTab.tsx` — Full rebuild
7. `src/pages/incidents/MyActions/tabs/ApprovalsTab.tsx` — Full rebuild

