

# HSSE Incident Workflow Update: Unified Expert Routing + Severity Change Approval

## Overview

This plan updates the HSSE incident workflow with three main changes:
1. Route ALL severity levels (1-5) to HSSE Expert after Dept Rep approval (removing the 1-2 vs 3-5 split)
2. When HSSE Expert changes severity during screening, require Department Manager approval before proceeding
3. Fix offline sync to include `severity_v2` and create a status constants file to reduce hardcoded strings

---

## Change 1: Unified Routing to HSSE Expert

**Current behavior:** `process_dept_rep_incident_decision` routes Level 1-2 to `pending_expert_screening` and Level 3-5 to `pending_department_manager_approval`.

**New behavior:** ALL levels route to `pending_expert_screening` when approved.

**File:** New migration `supabase/migrations/20260220_update_incident_routing.sql`

```sql
CREATE OR REPLACE FUNCTION public.process_dept_rep_incident_decision(
  _incident_id uuid, _user_id uuid, _decision text, _justification text
) RETURNS jsonb ...
```

The key change is removing the `IF _severity_level <= 2` conditional and always setting `_new_status := 'pending_expert_screening'` when decision is `approved`.

---

## Change 2: Severity Change Triggers Dept Manager Approval

**Workflow logic:** When HSSE Expert screens an incident and recommends `investigate`:
- If severity was changed during screening (expert modified `severity_v2`), route to `pending_department_manager_approval` for Dept Manager sign-off
- If severity is unchanged, route directly to `pending_manager_approval` (existing flow)

**File:** `src/hooks/use-hsse-workflow.ts` -- `useExpertScreening` mutation

In the `investigate` case (line 172-179), add a check: compare the incident's `original_severity_v2` (or the value before expert edit) with current `severity_v2`. If different, set `newStatus = 'pending_department_manager_approval'` and flag `severity_pending_approval = true`. If same, keep existing `pending_manager_approval` routing.

This reuses the existing `pending_department_manager_approval` status and the existing `SeverityApprovalCard` / `usePendingApprovals` infrastructure for manager approval of severity changes.

---

## Change 3: Status Constants File

**New file:** `src/types/incident-statuses.ts`

Export all incident status strings as named constants to reduce hardcoded strings across the codebase:

```typescript
export const INCIDENT_STATUS = {
  DRAFT: 'draft',
  SUBMITTED: 'submitted',
  PENDING_EXPERT_SCREENING: 'pending_expert_screening',
  PENDING_DEPT_REP_APPROVAL: 'pending_dept_rep_approval',
  PENDING_MANAGER_APPROVAL: 'pending_manager_approval',
  PENDING_DEPARTMENT_MANAGER_APPROVAL: 'pending_department_manager_approval',
  INVESTIGATION_PENDING: 'investigation_pending',
  UNDER_INVESTIGATION: 'under_investigation',
  // ... all statuses
} as const;
```

Then update key files to import from this constants file:
- `src/hooks/use-hsse-workflow.ts`
- `src/hooks/use-incident-progression.ts`
- `src/components/incidents/IncidentStatusBadge.tsx`

(Gradual migration -- not all 40+ files at once, just the ones touched by this change.)

---

## Change 4: Offline Sync -- Include `severity_v2`

**File:** `src/lib/offline-report-sync.ts`

The `syncSingleReport` function (line 174-215) builds an `incidentData` object but does not include `severity_v2`. Add `severity_v2` from `form_data.severity_v2` (if present) so that offline-created incidents carry the correct 5-level severity into the database.

**File:** `src/hooks/use-offline-reporting.ts`

No changes needed -- this hook caches reference data only, not form fields. The form data shape is defined in `use-offline-report-queue.ts` which already allows arbitrary fields.

---

## Technical Summary

| # | File | Change Type | Description |
|---|------|------------|-------------|
| 1 | `supabase/migrations/20260220_update_incident_routing.sql` | New (migration) | Override `process_dept_rep_incident_decision` -- all severities to expert |
| 2 | `src/hooks/use-hsse-workflow.ts` | Modify | Expert screening: if severity changed, route to dept manager approval |
| 3 | `src/types/incident-statuses.ts` | New | Status constants file |
| 4 | `src/hooks/use-incident-progression.ts` | Modify | Import from status constants |
| 5 | `src/lib/offline-report-sync.ts` | Modify | Include `severity_v2` in synced incident data |

## Verification

- **Routing test:** Submit incidents at Level 1 and Level 5. Both should appear in HSSE Expert queue after Dept Rep approval.
- **Severity change test:** As HSSE Expert, change severity during screening and approve for investigation. Verify it routes to Dept Manager queue instead of directly to Manager Approval.
- **No-change test:** As HSSE Expert, approve without changing severity. Verify it routes to Manager Approval as before.
- **Offline test:** Create an offline report with severity_v2 set, sync, and verify the field persists.

