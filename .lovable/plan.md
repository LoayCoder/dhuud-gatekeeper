

# Add Inspection Approvals to Action Center

## Problem
The Inspections card in `/action-center` only has "My Actions" — there is no way for reviewers to see and verify/close inspection-sourced corrective actions directly from the Action Center. The approval workflow is only accessible via the My Actions page's Approvals tab.

## Solution
Mirror the pattern already used by the Incidents module card (which has "My Actions", "Pending Approvals", and "Investigations" sheets) and add a **Pending Approvals** action link + sheet to the Inspections module card.

## Changes

### 1. Add `session_id` to Pending Action Approvals query & type

**`src/hooks/use-pending-approvals/types.ts`** — Add `session_id: string | null` to `PendingActionApproval`

**`src/hooks/use-pending-approvals/use-pending-approval-queries.ts`** — Add `session_id` to the select list in `usePendingActionApprovals` query (line 37)

### 2. Create `InspectionApprovalsList` component

**New file: `src/components/action-center/modules/InspectionApprovalsList.tsx`**

- Uses `usePendingActionApprovals()` hook
- Filters to actions where `session_id IS NOT NULL` (inspection-sourced)
- Displays columns: Title/Reference, Status, Assignee, Due Date
- On row click: opens the ActionDetailSheet inline (same pattern as the fix for ApprovalsTab)
- Shows "Pending with" reviewer info and verify/return actions

### 3. Update `InspectionsModule` to include Pending Approvals

**`src/components/action-center/modules/InspectionsModule.tsx`**

- Import `usePendingActionApprovals` and filter to inspection-sourced (`session_id != null`)
- Add `SheetType` option: `'my-actions' | 'approvals' | null`
- Add new KPI: "Pending Verification" with count and click handler
- Add new action link: "Pending Approvals" with badge count (following Incidents pattern)
- Add new `ActionListSheet` for approvals, rendering `InspectionApprovalsList`

### 4. Translation keys

**`en/translation.json`** — Add:
- `actionCenter.sheet.inspectionApprovals`: "Inspection Action Approvals"
- `actionCenter.sheet.inspectionApprovalsDesc`: "Inspection actions pending your verification"

**`ar/translation.json`** — Arabic equivalents

## Files Modified (5)
1. `src/hooks/use-pending-approvals/types.ts` — add `session_id`
2. `src/hooks/use-pending-approvals/use-pending-approval-queries.ts` — add `session_id` to select
3. `src/components/action-center/modules/InspectionApprovalsList.tsx` — new component
4. `src/components/action-center/modules/InspectionsModule.tsx` — add approvals sheet + KPI
5. `src/locales/en/translation.json` + `ar/translation.json` — new keys

