

## Split Incidents & Observations Cards by `event_type`

Currently both cards share the same data without filtering by `event_type`. The Incidents card shows all 15 pending approvals (including observations), and the Observations card shows 0s. The fix is to filter data by `event_type` throughout.

### Data Available

- `usePendingIncidentApprovals()` returns items with `event_type` field
- `useMyCorrectiveActions()` returns items with `incident.event_type` 
- `useMyAssignedInvestigations()` needs checking but likely has `event_type`
- Stats in `use-action-center-stats` already split by source type (`incident` vs `observation` corrective actions)

### Changes

**1. `src/components/action-center/modules/IncidentsModule.tsx`**
- Filter `myActions` to exclude `event_type === 'observation'`
- Filter `pendingApprovals` to exclude `event_type === 'observation'`
- Filter `myInvestigations` to exclude observations (if applicable)
- Pass filtered counts to KPIs and badges

**2. `src/components/action-center/modules/ObservationsModule.tsx`**
- Convert to stateful component like IncidentsModule
- Add `usePendingIncidentApprovals()` hook, filter to `event_type === 'observation'` only
- Add `useMyCorrectiveActions()` hook, filter to observation actions only
- Add My Actions expandable button with sheet + InlineActionsPanel (observation-filtered)
- Add Pending Approvals expandable button with sheet + filtered approvals list
- Wire up KPI clicks to open sheets

**3. `src/components/action-center/modules/IncidentApprovalsList.tsx`**
- Accept optional `eventTypeFilter` prop
- Filter displayed items by `event_type` when provided

**4. `src/components/action-center/modules/InlineActionsPanel.tsx`**
- Accept optional `eventTypeFilter` prop  
- Filter displayed actions by `incident.event_type` when provided

**5. Stats already correct** — `use-action-center-stats` already separates `incidentOverdue` vs `observationOverdue` etc., and these map correctly to each card's stats.

### Result
- Incidents card: only shows incident-type approvals, actions, investigations
- Observations card: only shows observation-type approvals and actions with expandable sheets

