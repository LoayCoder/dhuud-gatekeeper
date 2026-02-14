

## Investigation: Mohammed Al Khammees Assignments and Investigation Workspace Gaps

### Part 1: Mohammed Al Khammees -- Why Only 1 Investigation Shows

**Database Reality:** Mohammed Al Khammees (`b40cb1a8-ecf7-4f01-9ade-170548b163a8`) has **4 investigations** assigned to him:

| Ref | Title | Incident Status | Should Show? |
|-----|-------|-----------------|--------------|
| INC-2026-0002 | Water Leakage - Hole #2 | `investigation_pending` | Yes |
| INC-2026-0007 | Damaged Underground Cable | `investigation_in_progress` | Yes |
| INC-2026-0005 | Multiple Water Leakage | `investigation_in_progress` | Yes |
| INC-2026-0001 | Unsafe Door Swing | `investigation_closed` | Yes |

**Root Cause:** The `useMyAssignedInvestigations` hook (used in My Actions) filters out incidents where `status` is `closed` or `rejected`. Since none of Mohammed's incidents match those exact strings, all 4 should appear. However, the **currently logged-in user is not Mohammed** -- it's `luay.madkhali@golfsaudi.com`. The My Actions page always shows data for the logged-in user only. If Mohammed logs in, he should see all 4.

**However**, there is a secondary issue: the hook fetches each incident individually via `Promise.all`, and if any Supabase query silently fails or returns null (e.g., RLS filtering), that investigation gets filtered out. The current filter `status && !['closed', 'rejected'].includes(status)` also removes investigations where `incident` is `null` (failed fetch).

**Fix:** Add `investigation_closed` and `investigation_pending` to the properly handled statuses, and make the filtering more robust.

---

### Part 2: Active Bugs on My Actions Page (from Network Logs)

**Bug A: `witness_statements.status` column does not exist**

The `useMyAssignedWitnessStatements` hook queries `status` from `witness_statements`, but this column does not exist. The actual column is `assignment_status`.

**Fix:** Change the select from `status` to `assignment_status` in the hook query.

**Bug B: Ambiguous `branches` relationship on incidents**

The `useMyReportedIncidents` hook uses `branch:branches(id, name)` which fails because `incidents` has two foreign keys to `branches` (`branch_id` and `reporter_branch_id`). Supabase returns HTTP 300.

**Fix:** Disambiguate using `branch:branches!incidents_branch_id_fkey(id, name)`.

---

### Part 3: Investigation Workspace Workflow Gaps

**Gap 1: `investigation_pending` not in `investigationAllowed` list**

When "Approve & Lock" sets status to `investigation_pending`, the Investigation Workspace locks all tabs (Evidence, Witnesses, RCA, Actions) because `investigation_pending` is not in the `investigationAllowed` array (line 300-318). The investigator cannot access any investigation tools until status changes to `investigation_in_progress`.

**Fix:** Add `investigation_pending` to the `investigationAllowed` array.

**Gap 2: `under_investigation` status exists in types but missing from workspace workflow**

The type system defines `under_investigation` as a valid status, and some components reference it, but the Investigation Workspace's `renderWorkflowCards` switch/case has no handler for it. If an incident somehow reaches this status, no workflow card renders.

**Fix:** Add `under_investigation` case alongside `investigation_in_progress` in the workspace.

**Gap 3: Approve & Lock doesn't check the `can_approve_investigation` RPC**

The `ApprovalWorkflowBanner` shows the "Approve & Lock" button based on workflow state alone (no role check). The Investigation Workspace does call `useCanApproveInvestigation`, but this result is not passed to or checked by `ApprovalWorkflowBanner`.

**Fix:** Pass the `canApprove` flag to `ApprovalWorkflowBanner` and gate the button visibility.

---

### Summary of Fixes

| # | File | Change |
|---|------|--------|
| 1 | `src/hooks/use-my-workflow-tasks.ts` | Improve investigation status filtering; add `investigation_closed` to excluded list |
| 2 | `src/hooks/use-witness-statements.ts` | Change `status` to `assignment_status` in select query |
| 3 | `src/hooks/use-incidents.ts` | Disambiguate `branches` FK in `useMyReportedIncidents` |
| 4 | `src/pages/incidents/InvestigationWorkspace.tsx` | Add `investigation_pending` and `under_investigation` to `investigationAllowed` |
| 5 | `src/components/investigation/ApprovalWorkflowBanner.tsx` | Accept `canApprove` prop and gate button |
| 6 | `src/pages/incidents/InvestigationWorkspace.tsx` | Pass `canApprove` to `OverviewPanel` -> `ApprovalWorkflowBanner` |

### Technical Details

**Fix 1 -- `use-my-workflow-tasks.ts`:**
Update the status filter to properly exclude terminal statuses:
```typescript
const activeInvestigations = investigationsWithIncidents.filter(inv => {
  const status = inv.incident?.status;
  return status && !['closed', 'rejected', 'rejected_invalid'].includes(status);
});
```

**Fix 2 -- `use-witness-statements.ts`:**
```typescript
.select("id, incident_id, witness_name, witness_contact, statement_text, assignment_status, created_at, return_reason, return_count, returned_at")
```
And map `assignment_status` to the `status` field in the return object.

**Fix 3 -- `use-incidents.ts`:**
```typescript
.select('id, reference_id, title, status, severity, event_type, created_at, occurred_at, site:sites(id, name), branch:branches!incidents_branch_id_fkey(id, name)')
```

**Fix 4 -- `InvestigationWorkspace.tsx`:**
Add `investigation_pending` and `under_investigation` to the `investigationAllowed` array:
```typescript
const investigationAllowed = status && [
  'investigation_pending',
  'investigation_in_progress',
  'under_investigation',
  // ... existing statuses
].includes(status);
```

**Fix 5 -- `ApprovalWorkflowBanner.tsx`:**
Add optional `canApprove` prop. If provided and `false`, hide the "Approve & Lock" button. This prevents unauthorized users from seeing the action.

**Fix 6 -- Prop threading:**
Pass `canApprove` from `InvestigationWorkspace` through `OverviewPanel` to `ApprovalWorkflowBanner`.

