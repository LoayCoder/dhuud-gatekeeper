
# Gate Pass Visibility & Access Issues - Fix Plan

## Issues Identified

### Issue 1: Department Representative Not Seeing Gate Pass Requests

**Root Cause**: Multiple problems in `use-dept-gate-passes.ts`:

1. **Project-based filtering excludes internal requests**: The hooks filter by `project_id` but internal gate passes have `project_id = null`. They should be routed via `approval_from_id` instead.

2. **Wrong status filters**: The `useDeptPendingApprovals` hook filters for `["pending", "pm_approved"]` but the new workflow uses `pending_dept_approval` status.

3. **Incorrect routing logic**: Internal requests are routed to a specific approver via `approval_from_id`, not based on project's department.

**Database Evidence**:
```text
Gate Pass GP-2026-00001:
- status: pending_dept_approval
- is_internal_request: true
- project_id: null (no project!)
- approval_from_id: Khalid Al Shuhail (dcf0e39d...)
```

The current hooks filter by project_id which is null for internal requests.

---

### Issue 2: Requester Cannot Click to Open Gate Pass Details

**Root Cause**: The `List.tsx` for My Gate Passes does not have click handlers on table rows. The `GatePassDetailDialog` component exists but is never used in the list.

**Current Code** (lines 177-189 of List.tsx):
```typescript
{passes.map(pass => (
  <TableRow key={pass.id}>
    <TableCell>{pass.reference_number}</TableCell>
    ...
  </TableRow>
))}
```

There's no `onClick` handler and no dialog state management.

---

### Issue 3: Department Dashboard Shows No Data

**Root Cause**: Same as Issue 1 - the `useDeptGatePasses` and `useDeptGatePassStats` hooks rely on project-based filtering which fails for internal requests.

---

## Fix Plan

### Phase 1: Fix Department Approval Routing Hooks

Update `use-dept-gate-passes.ts` to handle BOTH routing methods:
- **External requests**: Route via `project.department_id`
- **Internal requests**: Route via `approval_from_id` (the selected approver)

**Updated Logic**:

```typescript
export function useDeptPendingApprovals() {
  const { profile, user } = useAuth();
  
  return useQuery({
    queryFn: async () => {
      // TWO types of passes can be pending for department rep:
      
      // 1. INTERNAL: where approval_from_id = current user
      // 2. EXTERNAL: where project belongs to user's department
      
      // Fetch internal requests assigned to this user
      const { data: internalPasses } = await supabase
        .from("material_gate_passes")
        .select(...)
        .eq("tenant_id", tenantId)
        .eq("approval_from_id", user.id)
        .eq("is_internal_request", true)
        .eq("status", "pending_dept_approval");
      
      // Fetch external requests for department projects
      const { data: projects } = await supabase
        .from("contractor_projects")
        .select("id")
        .eq("department_id", departmentId);
      
      const { data: externalPasses } = await supabase
        .from("material_gate_passes")
        .select(...)
        .in("project_id", projectIds)
        .eq("is_internal_request", false)
        .in("status", ["pending_contractor_approval", "pending_club_mgmt_ack"]);
      
      return [...internalPasses, ...externalPasses];
    }
  });
}
```

### Phase 2: Update Status Filters to Match New Workflow

Update the status arrays used in all department hooks:

| Current | New Workflow |
|:--------|:-------------|
| `pending` | `pending_dept_approval` (internal) |
| `pm_approved` | `pending_club_mgmt_ack` |
| N/A | `pending_contractor_approval` (external) |
| N/A | `pending_security_approval` |

### Phase 3: Add Click-to-View for Requester's Gate Passes

Update `src/pages/my-gate-passes/List.tsx` to:
1. Add state for selected pass and dialog open state
2. Import and use `GatePassDetailDialog` component
3. Add `onClick` handler to table rows

```typescript
function MyGatePassListContent() {
  const [selectedPass, setSelectedPass] = useState<MaterialGatePass | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  
  const handleRowClick = (pass: MaterialGatePass) => {
    setSelectedPass(pass);
    setDetailOpen(true);
  };
  
  return (
    <>
      <Table>
        <TableBody>
          {passes.map(pass => (
            <TableRow 
              key={pass.id} 
              onClick={() => handleRowClick(pass)}
              className="cursor-pointer hover:bg-accent"
            >
              ...
            </TableRow>
          ))}
        </TableBody>
      </Table>
      
      <GatePassDetailDialog
        pass={selectedPass}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </>
  );
}
```

### Phase 4: Add Click-to-View for Department Dashboard

Apply the same pattern to:
- `src/pages/dept-gate-passes/Dashboard.tsx` (Recent Passes section)
- `src/pages/dept-gate-passes/GatePassList.tsx`
- `src/pages/dept-gate-passes/PendingApprovals.tsx`
- `src/pages/dept-gate-passes/TodayPasses.tsx`

---

## Files to Modify

| File | Action | Description |
|:-----|:-------|:------------|
| `src/hooks/contractor-management/use-dept-gate-passes.ts` | **Modify** | Fix routing logic for internal requests, update status filters |
| `src/pages/my-gate-passes/List.tsx` | **Modify** | Add click handler and detail dialog |
| `src/pages/dept-gate-passes/Dashboard.tsx` | **Modify** | Add click handler for recent passes |
| `src/pages/dept-gate-passes/GatePassList.tsx` | **Modify** | Add click handler and detail dialog |
| `src/pages/dept-gate-passes/PendingApprovals.tsx` | **Modify** | Add click handler and detail dialog |
| `src/pages/dept-gate-passes/TodayPasses.tsx` | **Modify** | Add click handler and detail dialog |

---

## Technical Summary

| Issue | Root Cause | Fix |
|:------|:-----------|:----|
| Dept Rep can't see requests | Hooks filter by project_id (null for internal) and wrong status values | Query by `approval_from_id` for internal requests, update status filters |
| Requester can't click passes | No click handler or dialog in List.tsx | Add `onClick`, state, and `GatePassDetailDialog` |
| Dashboard empty | Same as Issue 1 | Fixed by updating hooks |

---

## Routing Logic After Fix

```text
INTERNAL REQUEST (is_internal_request = true):
├── Created by: Employee
├── project_id: null
├── approval_from_id: Selected Golf Club Mgmt Rep
├── status: pending_dept_approval
└── Visible to: User with id = approval_from_id

EXTERNAL REQUEST (is_internal_request = false):
├── Created by: Contractor
├── project_id: Links to contractor_projects
├── approval_from_id: null
├── status: pending_contractor_approval
└── Visible to: Dept Rep where project.department_id matches
```
