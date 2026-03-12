

# Fix Investigation Workspace Badge Mismatch

## Problem
The "Investigation Workspace" button badge shows **10** (tenant-wide count of incidents in `investigation_pending`/`investigation_in_progress` status), but the "My Investigations" sheet shows **0** because `useMyAssignedInvestigations()` correctly filters by `investigator_id = current user`. The current user has no investigations assigned to them.

## Root Cause
In `IncidentsModule.tsx`, the Investigation Workspace button uses `stats.openInvestigations` (tenant-wide) for its badge. Per the established pattern (memory: action-center-data-filtering-logic), action link badges should use **user-specific counts**, not tenant-wide stats.

## Fix

### `IncidentsModule.tsx`
- Import `useMyAssignedInvestigations` from `use-my-workflow-tasks`
- Use its `.data?.length` for the Investigation Workspace button badge instead of `stats.openInvestigations`
- Keep `stats.openInvestigations` on the KPI row (tenant-wide overview is correct there)

### Files
1. `src/components/action-center/modules/IncidentsModule.tsx`

