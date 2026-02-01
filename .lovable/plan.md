
# Gate Pass Visibility & Access Issues - ✅ COMPLETED

## Summary

All issues have been fixed:

1. ✅ **Fixed Department Routing Hooks** - Updated `use-dept-gate-passes.ts` to handle both routing methods:
   - Internal requests: Query by `approval_from_id = current user`
   - External requests: Query by `project_id` in user's department

2. ✅ **Updated Status Filters** - All hooks now use the new workflow statuses:
   - `pending_dept_approval` (internal)
   - `pending_contractor_approval` (external)
   - `pending_club_mgmt_ack`
   - `pending_security_approval`

3. ✅ **Added Click-to-View** - All gate pass lists now support clicking to view details:
   - `src/pages/my-gate-passes/List.tsx`
   - `src/pages/dept-gate-passes/Dashboard.tsx`
   - `src/pages/dept-gate-passes/GatePassList.tsx`
   - `src/pages/dept-gate-passes/PendingApprovals.tsx`
   - `src/pages/dept-gate-passes/TodayPasses.tsx`

## Files Modified

| File | Changes |
|:-----|:--------|
| `use-dept-gate-passes.ts` | Complete rewrite: dual routing for internal/external, updated status filters |
| `List.tsx` (my-gate-passes) | Added dialog state, click handler, GatePassDetailDialog |
| `Dashboard.tsx` | Added dialog state, click handler for recent passes |
| `GatePassList.tsx` | Added dialog state, click handler, type badges |
| `PendingApprovals.tsx` | Added dialog state, click handler, type badges |
| `TodayPasses.tsx` | Added dialog state, click handler, type badges |

## Routing Logic (Implemented)

```
INTERNAL REQUEST (is_internal_request = true):
├── Visible to: User with id = approval_from_id
├── Status filter: pending_dept_approval
└── No project_id check needed

EXTERNAL REQUEST (is_internal_request = false):
├── Visible to: Dept Rep where project.department_id matches user's department
├── Status filters: pending_contractor_approval, pending_club_mgmt_ack
└── Requires project_id lookup
```
