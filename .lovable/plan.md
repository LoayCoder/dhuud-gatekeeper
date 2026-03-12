

# Replace Severity with Current Action Owner Name

## What Changes
Replace the "Severity" column in both Approvals and Investigations lists with an "Action By" column showing the name of the person who currently needs to take action on the incident.

## Data Changes

### `use-pending-approval-queries.ts`
- Add `approval_manager:profiles!incidents_approval_manager_id_fkey(full_name)` to the incident select query (line 209)
- Include `approval_manager` in the `PendingIncidentApproval` type and pass it through to `approvableIncidents`

### `use-my-workflow-tasks.ts`
- Add `approval_manager:profiles!incidents_approval_manager_id_fkey(full_name)` to the investigation's incident select query (line 63)
- Update `MyAssignedInvestigation` type to include `approval_manager`

## Column Changes

### `IncidentApprovalsList.tsx`
- Map `action_by` from status-based logic:
  - `pending_manager_approval` / `pending_dept_rep_*` → `approval_manager.full_name`
  - `expert_screening` / `pending_consultant_*` → "HSSE Expert" / "Consultant" (role fallback)
- Replace severity column with "Action By" column showing `User` icon + name

### `IncidentInvestigationsList.tsx`
- Map `action_by` similarly using status + available data (investigator = current user, approval_manager for review stages)
- Same column replacement

## Files
1. `src/hooks/use-pending-approvals/use-pending-approval-queries.ts`
2. `src/hooks/use-my-workflow-tasks.ts`
3. `src/components/action-center/modules/IncidentApprovalsList.tsx`
4. `src/components/action-center/modules/IncidentInvestigationsList.tsx`

