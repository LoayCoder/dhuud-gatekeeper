

# Fix Pending Approvals Count Mismatch

## Problem
Three different numbers for the same concept:
- **Card title badge "15"** = `stats.overdue (5) + stats.pendingApprovals (10)` — correct sum, but `pendingApprovals` is wrong
- **"Pending Approvals" button badge = "10"** — uses `stats.pendingApprovals` from `fetchIncidentStats`
- **Sheet content = "Showing 15 of 15"** — uses `usePendingIncidentApprovals()` which fetches the actual list

## Root Cause
The status filters are misaligned between the two queries:

- **`fetchIncidentStats`** (stat-fetchers.ts line 21) counts only **4 statuses**: `pending_dept_rep_incident_review`, `pending_manager_approval`, `pending_department_manager_approval`, `expert_screening`
- **`usePendingIncidentApprovals`** (use-pending-approval-queries.ts line 190) uses **12 statuses** including `pending_closure`, `pending_final_closure`, `pending_dept_rep_approval`, `hsse_manager_escalation`, `pending_consultant_*`, `pending_contract_controller_approval`, etc.

The stat query is missing 8 statuses, so it undercounts.

## Fix

### `stat-fetchers.ts` — Align pending approval statuses
Update `fetchIncidentStats` (line 21) to use the same status list as `usePendingIncidentApprovals`:

```typescript
.in('status', [
  'pending_manager_approval',
  'hsse_manager_escalation',
  'pending_closure',
  'pending_final_closure',
  'pending_dept_rep_approval',
  'pending_dept_rep_incident_review',
  'expert_screening',
  'pending_consultant_screening',
  'pending_consultant_review',
  'pending_consultant_actions',
  'pending_department_manager_violation_approval',
  'pending_contract_controller_approval'
])
```

Note: The stat count is tenant-wide while the sheet filters by `can_approve_investigation` per user. For perfect accuracy, the badge on the button should ideally use the actual list length from `usePendingIncidentApprovals`. But aligning statuses is the minimum fix to reduce the gap.

### `IncidentsModule.tsx` — Use actual list count for button badge
Replace `stats.pendingApprovals` on the Pending Approvals button with the real count from `usePendingIncidentApprovals()`:

```typescript
const { data: pendingApprovals } = usePendingIncidentApprovals();
// ...
badge: (pendingApprovals || []).length,
```

This ensures the button badge matches the sheet content exactly.

### Files
1. `src/features/incidents/hooks/use-action-center-stats/stat-fetchers.ts`
2. `src/components/action-center/modules/IncidentsModule.tsx`

