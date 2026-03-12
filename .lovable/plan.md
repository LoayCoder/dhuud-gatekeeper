

# Apply Sheet-Based Interaction Pattern to All Action Center Cards

## What We're Doing

Apply the same interactive pattern from the Incidents Management card — expandable action buttons that open slide-over sheets with live data lists — to the remaining module cards: **Inspections**, **Audits**, **Gate Passes**, **Contractors**, and **Video Induction**.

Currently these cards only have static navigation links. After this change, they will have expandable "My Actions" and "Pending Approvals" buttons with inline sheets showing real data, just like Incidents and Observations.

## Cards to Update

### 1. Inspections Module
- Make stateful with sheet management
- Add "My Actions" expandable button → sheet with inspection corrective actions (uses `useMyInspectionActions`)
- KPI "Pending Actions" becomes clickable → opens My Actions sheet
- Existing hooks: `useMyInspectionActions` from `@/features/incidents`

### 2. Audits Module
- Make stateful with sheet management
- Add "Open Findings" as expandable button → sheet listing open findings
- Reuse `useMyInspectionActions` (audit actions are in same corrective_actions table with `session_id`)
- KPI "Open Findings" becomes clickable

### 3. Gate Passes Module
- Make stateful with sheet management
- Add "Pending Approvals" expandable button → sheet with gate pass approvals list
- Uses `usePendingGatePassApprovals` from `@/features/contractors/hooks/use-material-gate-passes`
- KPI "Pending" becomes clickable → opens approvals sheet

### 4. Contractors Module
- Make stateful with sheet management
- Add "Pending Approvals" expandable button → sheet with pending company approvals
- Uses `usePendingCompanyApprovals` from `@/features/contractors/hooks/use-contractor-companies`
- KPI "Pending" becomes clickable

### 5. Video Induction Module
- Make stateful with sheet management
- Add "Pending Verification" expandable button → sheet
- KPI "Pending" becomes clickable

## New List Components to Create

Each sheet needs a list component using `ActionListTable`:

1. **`InspectionActionsList.tsx`** — Lists user's inspection corrective actions from `useMyInspectionActions`, with columns: Title, Status, Priority, Due Date
2. **`GatePassApprovalsList.tsx`** — Lists pending gate pass approvals from `usePendingGatePassApprovals`, with columns: Reference, Type, Status, Requested By, Date
3. **`ContractorApprovalsList.tsx`** — Lists pending company approvals from `usePendingCompanyApprovals`, with columns: Company Name, Status, Date
4. **`InductionPendingList.tsx`** — Lists pending inductions (simple list, navigates to induction videos page)

## Files to Create
- `src/components/action-center/modules/InspectionActionsList.tsx`
- `src/components/action-center/modules/GatePassApprovalsList.tsx`
- `src/components/action-center/modules/ContractorApprovalsList.tsx`
- `src/components/action-center/modules/InductionPendingList.tsx`

## Files to Modify
- `src/components/action-center/modules/InspectionsModule.tsx` — Add state, hooks, sheets, expandable buttons
- `src/components/action-center/modules/AuditsModule.tsx` — Add state, hooks, sheets, expandable buttons
- `src/components/action-center/modules/GatePassesModule.tsx` — Add state, hooks, sheets, expandable buttons
- `src/components/action-center/modules/ContractorsModule.tsx` — Add state, hooks, sheets, expandable buttons
- `src/components/action-center/modules/VideoInductionModule.tsx` — Add state, hooks, sheets, expandable buttons

## Pattern Reference (from IncidentsModule)

Each card will follow this structure:
- `useState<SheetType>` for managing which sheet is open
- Action buttons with `onExpand` + `isExpanded` instead of `href` for expandable items
- `ActionListSheet` components rendered after the card
- KPIs with `onClick` handlers to open relevant sheets
- Badge counts from real data hooks

