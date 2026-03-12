

# Replace Role Column with User Name

## What Changes
Replace the static "Role" column (showing "Approver"/"Investigator") with the **reporter's name** — the person who reported the incident. This gives users meaningful context about each item.

## Changes

### 1. `IncidentApprovalsList.tsx`
- Already has `reporter_name` mapped from `a.reporter?.full_name`
- Change the `assigned_role` column to show `reporter_name` instead
- Update column label to "Reported By"
- Show a `User` icon + name instead of a role badge

### 2. `IncidentInvestigationsList.tsx`
- Need to fetch reporter name — update the query in `useMyAssignedInvestigations` to include `reporter:profiles!incidents_reporter_id_fkey(full_name)` in the incident select
- OR: fetch it in the secondary incident query (line 61) by adding reporter join
- Map `reporter_name` from `inv.incident?.reporter?.full_name`
- Same column change as approvals

### 3. `use-my-workflow-tasks.ts`
- Update the incident select query (line 62) to include reporter name:
  `'id, reference_id, title, status, severity_v2, event_type, reporter:profiles!incidents_reporter_id_fkey(full_name)'`
- Update `MyAssignedInvestigation` type to include the reporter field

### 4. Translation keys
- Add `actionCenter.columns.reportedBy` in EN/AR

### Files
1. `src/components/action-center/modules/IncidentApprovalsList.tsx`
2. `src/components/action-center/modules/IncidentInvestigationsList.tsx`
3. `src/hooks/use-my-workflow-tasks.ts`
4. `src/locales/en/translation.json`
5. `src/locales/ar/translation.json`

