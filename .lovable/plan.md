

# Make Entire Action Center User-Specific (Strict Personal Assignment)

## Problem
All KPI numbers (Overdue, Pending, Investigations, Total) and the overview summary bar use **tenant-wide** counts from `useActionCenterStats` → `stat-fetchers.ts`, which queries by `tenant_id` only. Even admins should see only their personally assigned/approvable items.

## Current Architecture

```text
ActionCenter page
  └── useActionCenterStats() → stat-fetchers.ts (ALL tenant-wide queries)
       ├── fetchIncidentStats       → tenant-wide incident counts
       ├── fetchCorrectiveActionStats → tenant-wide corrective action counts  
       ├── fetchGatePassStats       → tenant-wide gate pass counts
       ├── fetchInspectionStats     → tenant-wide inspection counts
       ├── fetchContractorStats     → tenant-wide contractor counts
       ├── fetchInductionStats      → tenant-wide induction counts
       └── fetchUserStats           → tenant-wide profile counts
  
  └── Module Cards receive stats.{module} as props → KPIs display tenant-wide
  └── ActionCenterStatsBar → stats.summary (aggregated tenant-wide)
```

## Solution

Replace the centralized tenant-wide `useActionCenterStats` with a new **user-specific** version that derives counts from the same user-filtered hooks already used for badges/lists.

### Approach: Rewrite `stat-fetchers.ts` to accept `userId` and filter personally

**Phase 1: Rewrite stat fetchers to be user-specific**

Each fetcher will add `assigned_to = userId` or equivalent user-scoping:

| Module | Current Filter | New Filter |
|--------|---------------|------------|
| Incidents (corrective actions) | `tenant_id` only | `assigned_to = userId` |
| Incidents (investigations) | `status IN (...)` | `investigator_id = userId` via investigations table |
| Incidents (pending approvals) | `status IN (...)` | Already user-specific via `can_approve_investigation` RPC - reuse `usePendingIncidentApprovals` count |
| Observations (corrective actions) | `source_type = 'observation'` | `assigned_to = userId` |
| Gate Passes | `tenant_id` only | `requested_by = userId` for personal, approval counts use role-based hooks |
| Inspections | `tenant_id` only | `assigned_inspector_id = userId` or `created_by = userId` |
| Contractors | `tenant_id` only | Role-gated - only show if user has approval role |
| Video Inductions | `tenant_id` only | Filter by user assignment |
| Users | `tenant_id` only | Keep as-is (admin-only module, inherently organizational) |

**Phase 2: Update `use-action-center-stats.ts`**
- Pass `user.id` to all fetchers
- Each fetcher adds user-level filtering

**Phase 3: Update module KPIs to use user-specific data**

For `IncidentsModule`:
- **Overdue KPI**: Count from `useMyCorrectiveActions` where `due_date < today && status not completed`
- **Pending KPI**: Use `pendingApprovalsCount` (already user-specific)
- **Investigations KPI**: Use `myInvestigationsCount` (already user-specific)
- **Total KPI**: Sum of user's open corrective actions

For `ObservationsModule`: Same approach - user's observation corrective actions only

For `GatePassesModule`: User's own gate passes + role-gated approval counts

For `InspectionsModule`: User's assigned inspection sessions + corrective actions

For `AuditsModule`: User's assigned audit sessions + findings

For `ContractorsModule`: Role-gated counts only

For `VideoInductionModule`: Keep organizational (managed by admins)

For `UserManagementModule`: Keep organizational (admin-only)

**Phase 4: Update `ActionCenterStatsBar` summary**
- Summary KPIs aggregate from the user-specific module stats

### Files to Modify

1. **`src/features/incidents/hooks/use-action-center-stats/stat-fetchers.ts`** - Add `userId` parameter to `fetchCorrectiveActionStats`, `fetchIncidentStats`, `fetchGatePassStats`, `fetchInspectionStats`; filter by user assignment
2. **`src/features/incidents/hooks/use-action-center-stats/use-action-center-stats.ts`** - Pass `user.id` to fetchers
3. **`src/components/action-center/modules/IncidentsModule.tsx`** - Replace KPI values with user-specific counts derived from existing hooks
4. **`src/components/action-center/modules/ObservationsModule.tsx`** - Add user-specific hooks for KPIs
5. **`src/components/action-center/modules/GatePassesModule.tsx`** - Add user-specific hooks for KPIs
6. **`src/components/action-center/modules/InspectionsModule.tsx`** - Add user-specific hooks for KPIs
7. **`src/components/action-center/modules/AuditsModule.tsx`** - Add user-specific hooks for KPIs
8. **`src/components/action-center/modules/ContractorsModule.tsx`** - Add user-specific hooks for KPIs
9. **`src/components/action-center/ActionCenterStatsBar.tsx`** - Ensure summary reflects user-specific totals
10. **`src/features/incidents/hooks/use-action-center-stats/types.ts`** - No change needed

### Key Design Decisions
- **Users/Admin module** stays organizational (it's about managing others)
- **Video Inductions** stays organizational (managed for workers)
- All other modules show strictly personal counts
- The existing user-specific hooks (`useMyCorrectiveActions`, `usePendingIncidentApprovals`, `useMyAssignedInvestigations`) are already correct and will be leveraged for KPI numbers too

