

# Fix Gate Pass Issues - Photos, Approval Actions, and Visibility

## Issues Identified

### Issue 1: Photos Not Showing

**Root Cause**: Photos are uploaded to `gate_pass_item_photos` table (per-item photos), but the dialog fetches from `gate_pass_photos` table.

| Code Location | What It Does |
|:--------------|:-------------|
| `use-material-gate-passes.ts` (lines 316-348) | Uploads photos to `gate_pass_item_photos` table |
| `use-gate-pass-details.ts` (lines 199-235) | Fetches photos from `gate_pass_photos` table |

**Database Evidence**:
- `gate_pass_photos` for GP-2026-00001: **Empty**
- `gate_pass_item_photos` for GP-2026-00001: **Not checked, but code stores here**

The hooks are querying the **wrong table**.

---

### Issue 2: Department Representative Cannot Approve/Reject

**Root Cause**: The `GatePassDetailDialog` component only displays information - it has **no approval action buttons**. The approval buttons exist in `GatePassApprovalQueue` component, but that is used in the main contractor management section, not the department gate passes pages.

**Current State**:
- `PendingApprovals.tsx` opens `GatePassDetailDialog` on click
- `GatePassDetailDialog` shows details only, no actions
- No approve/reject buttons are displayed

---

### Issue 3: Pass Not Showing in `/my-gate-passes/history`

**Root Cause**: The History page (`History.tsx`) uses `useGatePassApprovalHistory()` hook which shows **passes you have approved/rejected** - it's for approvers, not requesters.

The "history" for requesters should show their submitted passes, but this page is for approval history.

---

### Issue 4: Pass Not Showing in `/dept-gate-passes` Dashboard

**Root Cause**: The current user is **LUAY IBRAHIM** who is the requester, not the approver. The gate pass is assigned to **Khalid Al Shuhail** (`approval_from_id: dcf0e39d...`).

The dashboard only shows passes where:
- Internal: `approval_from_id = current_user_id`
- External: `project.department_id = user's department`

Since LUAY is not the designated approver, he won't see it on the department dashboard.

**However**: If logged in as Khalid Al Shuhail, the pass SHOULD appear.

---

## Fix Plan

### Phase 1: Fix Photo Display (use `gate_pass_item_photos` table)

Update `use-gate-pass-details.ts` to fetch from `gate_pass_item_photos` instead of `gate_pass_photos`:

```typescript
export function useGatePassPhotos(passId: string | null) {
  return useQuery({
    queryFn: async () => {
      // Fetch from gate_pass_item_photos (where photos are actually stored)
      const { data, error } = await supabase
        .from("gate_pass_item_photos")  // Changed from gate_pass_photos
        .select("id, gate_pass_id, item_id, storage_path, file_name, file_size, mime_type, uploaded_by, created_at")
        .eq("gate_pass_id", passId)
        .eq("tenant_id", tenantId)
        .is("deleted_at", null)
        .order("created_at", { ascending: true });
      // ... rest same
    }
  });
}
```

---

### Phase 2: Add Approval Actions to Detail Dialog

Create a new `GatePassApprovalActions` component and integrate it into `GatePassDetailDialog` for passes with pending status when viewed by the assigned approver.

```typescript
interface GatePassApprovalActionsProps {
  pass: MaterialGatePass;
  onSuccess: () => void;
}

function GatePassApprovalActions({ pass, onSuccess }: GatePassApprovalActionsProps) {
  const { user } = useAuth();
  const approvePass = useApproveGatePass();
  
  // Only show actions if:
  // 1. Status is pending_dept_approval
  // 2. Current user is the approval_from_id (for internal)
  const canApprove = 
    pass.status === "pending_dept_approval" && 
    pass.approval_from_id === user?.id;
  
  if (!canApprove) return null;
  
  return (
    <div className="flex gap-2">
      <Button onClick={() => approvePass.mutate({...})}>Approve</Button>
      <Button variant="destructive" onClick={...}>Reject</Button>
    </div>
  );
}
```

Add this to the dialog footer when viewing a pending pass.

---

### Phase 3: Clarify History Page Purpose

The `/my-gate-passes/history` page is correctly named "Approval History" and shows passes **approved by** the current user (for approvers). This is working as designed.

For **requester's submitted passes**, they should use `/my-gate-passes` which lists all passes they created.

No code change needed, but we should verify the List page shows the requester's passes (which it does via `useMyGatePasses`).

---

### Phase 4: Verify Department Dashboard Routing

The current logic is correct:
- `useDeptGatePasses` fetches internal passes where `approval_from_id = current_user_id`
- GP-2026-00001 has `approval_from_id = Khalid Al Shuhail`

For LUAY IBRAHIM to see it on the dashboard, one of these must be true:
1. LUAY is logged in as the approver (Khalid)
2. OR the pass is assigned to LUAY as `approval_from_id`

**Verification**: When logged in as Khalid Al Shuhail, the pass should appear.

---

## Files to Modify

| File | Action | Description |
|:-----|:-------|:------------|
| `src/hooks/contractor-management/use-gate-pass-details.ts` | **Modify** | Fetch photos from `gate_pass_item_photos` table |
| `src/components/contractors/GatePassDetailDialog.tsx` | **Modify** | Add approval action buttons for pending passes |
| `src/pages/dept-gate-passes/PendingApprovals.tsx` | **Modify** | Refresh data after approval action |

---

## Technical Summary

| Issue | Root Cause | Fix |
|:------|:-----------|:----|
| Photos not showing | Hook queries `gate_pass_photos`, code saves to `gate_pass_item_photos` | Query correct table |
| Cannot approve/reject | Detail dialog has no action buttons | Add approval action component |
| Not in history | History page is for approvers, not requesters | Working as designed |
| Not in dept dashboard | User is requester, not approver | Pass shows for correct approver (Khalid) |

---

## Expected Results After Fix

1. **Photos**: Will display correctly in the Items & Photos tab
2. **Approval Actions**: Approve/Reject buttons visible when assigned approver views the pass
3. **Visibility**: Pass appears in correct locations based on user role:
   - Requester (LUAY): Sees in `/my-gate-passes` list
   - Approver (Khalid): Sees in `/dept-gate-passes` and `/dept-gate-passes/approvals`

