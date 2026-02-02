
# Fix: Golf Club Management Cannot See Internal Gate Passes for Acknowledgment

## Problem Summary

Khalid Al Shuhail (Golf Club Management) cannot see gate pass GP-2026-00004 because the system doesn't route **internal requests** with `pending_club_mgmt_ack` status to Golf Club Management users.

### Current Broken Logic

The `useDeptPendingApprovals` hook fetches:

| Request Type | Status Fetched | Who Sees It |
|:-------------|:---------------|:------------|
| Internal | `pending_dept_approval` | User in `approval_from_id` |
| External | `pending_contractor_approval`, `pending_club_mgmt_ack` | Dept Rep for project's department |

### Missing Case

| Request Type | Status | Who Should See It |
|:-------------|:-------|:------------------|
| Internal | `pending_club_mgmt_ack` | Golf Club Management Dept Reps/Managers |

---

## Solution

Update the `useDeptPendingApprovals` hook to add a **third query path** for Golf Club Management users to see all internal requests awaiting their acknowledgment.

### Logic Changes

```text
1. INTERNAL assigned to current user (pending_dept_approval)
2. EXTERNAL for user's department projects (pending_contractor_approval, pending_club_mgmt_ack)  
3. NEW: ALL INTERNAL with pending_club_mgmt_ack for Golf Club Management users
```

---

## Technical Implementation

### File: `src/hooks/contractor-management/use-dept-gate-passes.ts`

Add a third query block in `useDeptPendingApprovals()`:

```typescript
// 3. INTERNAL requests pending Golf Club Management acknowledgment
// (for users in Golf Club Management department)
if (departmentId) {
  // Check if user is in Golf Club Management department
  const { data: golfDept } = await supabase
    .from("departments")
    .select("id")
    .eq("id", departmentId)
    .or("name.eq.Golf Club Management,name.ilike.%golf%club%management%")
    .maybeSingle();

  if (golfDept) {
    // User is in Golf Club Management - fetch all internal pending_club_mgmt_ack
    const { data: clubMgmtPasses, error: clubMgmtError } = await supabase
      .from("material_gate_passes")
      .select(GATE_PASS_SELECT)
      .eq("tenant_id", tenantId)
      .eq("is_internal_request", true)
      .eq("status", "pending_club_mgmt_ack")
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (clubMgmtError) throw clubMgmtError;
    if (clubMgmtPasses) allPending.push(...(clubMgmtPasses as MaterialGatePass[]));
  }
}
```

---

## Files to Modify

| File | Action | Description |
|:-----|:-------|:------------|
| `src/hooks/contractor-management/use-dept-gate-passes.ts` | Modify | Add Golf Club Management visibility for internal pending_club_mgmt_ack passes |

---

## Expected Result

After this fix:
- Khalid Al Shuhail will see GP-2026-00004 (and GP-2026-00001) in the "Pending Approvals" queue
- Any Golf Club Management representative will see all internal gate passes awaiting their acknowledgment
- The approval action buttons will appear correctly in the detail dialog
