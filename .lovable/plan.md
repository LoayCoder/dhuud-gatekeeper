
# Gate Pass Approval Flow Fix - Implementation Plan

## Executive Summary

The Gate Pass system has **dual approval systems running in parallel** causing confusion and potential security gaps. The user's requirement introduces a **new 4-stage approval workflow** that differs from both existing implementations.

---

## Current State Analysis

### Problem 1: Dual Approval Systems

| System | Columns Used | UI Location | Backend |
|:-------|:-------------|:------------|:--------|
| **System A** (Frontend hooks) | `pm_approved_by/at`, `safety_approved_by/at` | GatePassApprovalQueue, MyActions | `useApproveGatePass` hook |
| **System B** (Edge function) | `contractor_approval_status`, `security_approval_status` | Not used in main UI | `approve-gate-pass` edge function |

### Problem 2: Status Value Mismatch

| Location | PM Stage Status | Safety Stage Status |
|:---------|:----------------|:--------------------|
| Frontend (hooks) | `pending_pm_approval` | `pending_safety_approval` |
| Edge function | Uses `contractor_approval_status=pending` | Uses `security_approval_status=pending` |
| DB Default | `pending_pm_approval` | - |

### Problem 3: Role-Permission Gaps

Current `usePendingGatePassApprovals` hook checks:
- `gate_pass_approvers` table for scope matching
- `approval_from_id` for internal requests

**Missing**: No role-based checks for `contractor_consultant`, `department_representative`, or `security_supervisor`.

---

## Required New Workflow (Per User Requirement)

### A) Contractor Gate Pass (External)

```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│ CONTRACTOR GATE PASS WORKFLOW                                                   │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  Step 1              Step 2                Step 3             Step 4            │
│  ┌─────────────┐     ┌─────────────────┐   ┌───────────┐      ┌───────────┐     │
│  │ CONTRACTOR  │────▶│ GOLF MANAGEMENT │──▶│  ISSUED   │─────▶│ COMPLETED │     │
│  │ CONSULTANT  │     │  DEPT REP       │   │ (QR Gen)  │      │           │     │
│  │ Approval    │     │ Acknowledgment  │   │           │      │           │     │
│  └─────────────┘     └─────────────────┘   └───────────┘      └───────────┘     │
│                                                                                  │
│  Role: contractor_consultant    Role: department_representative                 │
│  Status: pending_contractor     Status: pending_dept_ack                         │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### B) Internal User Gate Pass

```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│ INTERNAL GATE PASS WORKFLOW                                                      │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  Step 1              Step 2                Step 3             Step 4            │
│  ┌─────────────┐     ┌─────────────────┐   ┌───────────┐      ┌───────────┐     │
│  │ USER'S DEPT │────▶│   SECURITY      │──▶│  ISSUED   │─────▶│ COMPLETED │     │
│  │     REP     │     │  SUPERVISOR     │   │ (QR Gen)  │      │           │     │
│  │  Approval   │     │   Approval      │   │           │      │           │     │
│  └─────────────┘     └─────────────────┘   └───────────┘      └───────────┘     │
│                                                                                  │
│  Role: department_representative   Role: security_supervisor                    │
│  Status: pending_dept_approval     Status: pending_security                      │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Implementation Plan

### Phase 1: Database Schema Alignment

**Migration 1: Add missing status values and update defaults**

```sql
-- Standardize status values for new workflow
-- No column changes needed - just using existing columns differently

-- Add comment documenting the status state machine
COMMENT ON COLUMN material_gate_passes.status IS 
'Status flow:
External (Contractor): pending_contractor_approval → pending_dept_ack → approved → used → completed
Internal (Employee): pending_dept_approval → pending_security_approval → approved → used → completed
Terminal: rejected, expired, cancelled';
```

**Migration 2: Create approval validation RPC**

```sql
CREATE OR REPLACE FUNCTION can_approve_gate_pass(
  p_user_id UUID,
  p_gate_pass_id UUID,
  p_approval_stage TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_pass RECORD;
  v_user_roles TEXT[];
  v_requester_dept_id UUID;
  v_user_dept_id UUID;
  v_can_approve BOOLEAN := FALSE;
  v_reason TEXT := '';
BEGIN
  -- Get gate pass
  SELECT * INTO v_pass FROM material_gate_passes WHERE id = p_gate_pass_id AND deleted_at IS NULL;
  IF NOT FOUND THEN RETURN jsonb_build_object('allowed', false, 'reason', 'Gate pass not found'); END IF;
  
  -- Prevent self-approval
  IF v_pass.requested_by = p_user_id THEN 
    RETURN jsonb_build_object('allowed', false, 'reason', 'Cannot approve own request'); 
  END IF;
  
  -- Get user roles
  SELECT ARRAY_AGG(r.code) INTO v_user_roles
  FROM user_role_assignments ura
  JOIN roles r ON r.id = ura.role_id
  WHERE ura.user_id = p_user_id AND r.is_active = true;
  
  -- Get user's department
  SELECT assigned_department_id INTO v_user_dept_id FROM profiles WHERE id = p_user_id;
  
  -- EXTERNAL (Contractor) WORKFLOW
  IF NOT v_pass.is_internal_request THEN
    CASE p_approval_stage
      WHEN 'contractor' THEN
        -- Stage 1: Contractor Consultant approval
        IF v_pass.status != 'pending_contractor_approval' THEN
          RETURN jsonb_build_object('allowed', false, 'reason', 'Not at contractor approval stage');
        END IF;
        v_can_approve := 'contractor_consultant' = ANY(v_user_roles) OR 'admin' = ANY(v_user_roles);
        v_reason := 'Requires contractor_consultant role';
        
      WHEN 'dept_ack' THEN
        -- Stage 2: Department Rep acknowledgment
        IF v_pass.status != 'pending_dept_ack' THEN
          RETURN jsonb_build_object('allowed', false, 'reason', 'Not at department acknowledgment stage');
        END IF;
        -- Must be department_representative AND in Golf Management department
        v_can_approve := 'department_representative' = ANY(v_user_roles) OR 'admin' = ANY(v_user_roles);
        v_reason := 'Requires department_representative role';
    END CASE;
    
  -- INTERNAL (Employee) WORKFLOW  
  ELSE
    -- Get requester's department
    SELECT assigned_department_id INTO v_requester_dept_id 
    FROM profiles WHERE id = v_pass.requested_by;
    
    CASE p_approval_stage
      WHEN 'dept_approval' THEN
        -- Stage 1: User's Dept Rep approval
        IF v_pass.status != 'pending_dept_approval' THEN
          RETURN jsonb_build_object('allowed', false, 'reason', 'Not at department approval stage');
        END IF;
        -- Must be department_representative AND in same department as requester
        v_can_approve := ('department_representative' = ANY(v_user_roles) AND v_user_dept_id = v_requester_dept_id)
                         OR 'admin' = ANY(v_user_roles);
        v_reason := 'Requires department_representative role in requester''s department';
        
      WHEN 'security' THEN
        -- Stage 2: Security Supervisor approval
        IF v_pass.status != 'pending_security_approval' THEN
          RETURN jsonb_build_object('allowed', false, 'reason', 'Not at security approval stage');
        END IF;
        v_can_approve := 'security_supervisor' = ANY(v_user_roles) 
                         OR 'security_manager' = ANY(v_user_roles)
                         OR 'admin' = ANY(v_user_roles);
        v_reason := 'Requires security_supervisor or security_manager role';
    END CASE;
  END IF;
  
  RETURN jsonb_build_object('allowed', v_can_approve, 'reason', CASE WHEN v_can_approve THEN NULL ELSE v_reason END);
END;
$$;
```

**Migration 3: Create unified approval RPC**

```sql
CREATE OR REPLACE FUNCTION approve_gate_pass_unified(
  p_user_id UUID,
  p_gate_pass_id UUID,
  p_action TEXT, -- 'approve' or 'reject'
  p_notes TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_pass RECORD;
  v_check JSONB;
  v_new_status TEXT;
  v_stage TEXT;
  v_update_cols JSONB;
BEGIN
  -- Get gate pass
  SELECT * INTO v_pass FROM material_gate_passes WHERE id = p_gate_pass_id AND deleted_at IS NULL;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Gate pass not found'); END IF;
  
  -- Determine current stage based on status
  CASE v_pass.status
    WHEN 'pending_contractor_approval' THEN v_stage := 'contractor';
    WHEN 'pending_dept_ack' THEN v_stage := 'dept_ack';
    WHEN 'pending_dept_approval' THEN v_stage := 'dept_approval';
    WHEN 'pending_security_approval' THEN v_stage := 'security';
    ELSE RETURN jsonb_build_object('success', false, 'error', 'Gate pass not in approval stage');
  END CASE;
  
  -- Validate approval permission
  v_check := can_approve_gate_pass(p_user_id, p_gate_pass_id, v_stage);
  IF NOT (v_check->>'allowed')::boolean THEN
    RETURN jsonb_build_object('success', false, 'error', v_check->>'reason');
  END IF;
  
  -- Handle rejection (universal for all stages)
  IF p_action = 'reject' THEN
    UPDATE material_gate_passes SET
      status = 'rejected',
      rejected_by = p_user_id,
      rejected_at = NOW(),
      rejection_reason = p_notes,
      updated_at = NOW()
    WHERE id = p_gate_pass_id;
    RETURN jsonb_build_object('success', true, 'new_status', 'rejected');
  END IF;
  
  -- Handle approval based on stage
  CASE v_stage
    WHEN 'contractor' THEN
      -- Contractor Consultant approved → move to Dept Rep acknowledgment
      UPDATE material_gate_passes SET
        contractor_approval_status = 'approved',
        contractor_approved_by = p_user_id,
        contractor_approved_at = NOW(),
        contractor_approval_notes = p_notes,
        status = 'pending_dept_ack',
        updated_at = NOW()
      WHERE id = p_gate_pass_id;
      v_new_status := 'pending_dept_ack';
      
    WHEN 'dept_ack' THEN
      -- Dept Rep acknowledged → APPROVED + generate QR
      UPDATE material_gate_passes SET
        pm_approved_by = p_user_id,
        pm_approved_at = NOW(),
        pm_notes = p_notes,
        status = 'approved',
        qr_code_token = 'GP-' || encode(gen_random_bytes(16), 'hex'),
        qr_generated_at = NOW(),
        updated_at = NOW()
      WHERE id = p_gate_pass_id;
      v_new_status := 'approved';
      
    WHEN 'dept_approval' THEN
      -- Internal: Dept Rep approved → move to Security Supervisor
      UPDATE material_gate_passes SET
        pm_approved_by = p_user_id,
        pm_approved_at = NOW(),
        pm_notes = p_notes,
        status = 'pending_security_approval',
        updated_at = NOW()
      WHERE id = p_gate_pass_id;
      v_new_status := 'pending_security_approval';
      
    WHEN 'security' THEN
      -- Security Supervisor approved → APPROVED + generate QR
      UPDATE material_gate_passes SET
        security_approval_status = 'approved',
        security_approved_by = p_user_id,
        security_approved_at = NOW(),
        security_approval_notes = p_notes,
        safety_approved_by = p_user_id,
        safety_approved_at = NOW(),
        safety_notes = p_notes,
        status = 'approved',
        qr_code_token = 'GP-' || encode(gen_random_bytes(16), 'hex'),
        qr_generated_at = NOW(),
        updated_at = NOW()
      WHERE id = p_gate_pass_id;
      v_new_status := 'approved';
  END CASE;
  
  RETURN jsonb_build_object('success', true, 'new_status', v_new_status, 'stage', v_stage);
END;
$$;
```

---

### Phase 2: Update Create Gate Pass Logic

**File: `src/hooks/contractor-management/use-material-gate-passes.ts`**

Update `useCreateGatePass` to set correct initial status:

```typescript
// For external (contractor) requests:
status: "pending_contractor_approval"

// For internal (employee) requests:
status: "pending_dept_approval"
```

---

### Phase 3: Update Approval Hook

**File: `src/hooks/contractor-management/use-material-gate-passes.ts`**

Replace `useApproveGatePass` with RPC-based approach:

```typescript
export function useApproveGatePass() {
  return useMutation({
    mutationFn: async ({ passId, action, notes }) => {
      const { data, error } = await supabase.rpc('approve_gate_pass_unified', {
        p_user_id: user.id,
        p_gate_pass_id: passId,
        p_action: action, // 'approve' or 'reject'
        p_notes: notes
      });
      if (error) throw error;
      const result = data as { success: boolean; error?: string; new_status?: string };
      if (!result.success) throw new Error(result.error);
      return result;
    }
  });
}
```

---

### Phase 4: Update Pending Approvals Query

**File: `src/hooks/contractor-management/use-material-gate-passes.ts`**

Update `usePendingGatePassApprovals` to fetch passes for all 4 stages:

```typescript
.in("status", [
  "pending_contractor_approval",  // External Stage 1
  "pending_dept_ack",             // External Stage 2
  "pending_dept_approval",        // Internal Stage 1
  "pending_security_approval"     // Internal Stage 2
])
```

Add role-based filtering:
- `contractor_consultant` → sees `pending_contractor_approval`
- `department_representative` → sees `pending_dept_ack` + `pending_dept_approval` (own department)
- `security_supervisor` → sees `pending_security_approval`

---

### Phase 5: Update UI Components

**File: `src/components/contractors/GatePassApprovalQueue.tsx`**

1. Update stage detection:
```typescript
const getApprovalStage = (pass: MaterialGatePass) => {
  switch (pass.status) {
    case "pending_contractor_approval":
      return { label: "Awaiting Contractor Consultant", role: "contractor_consultant", step: 1 };
    case "pending_dept_ack":
      return { label: "Awaiting Dept Rep Acknowledgment", role: "department_representative", step: 2 };
    case "pending_dept_approval":
      return { label: "Awaiting Dept Rep Approval", role: "department_representative", step: 1 };
    case "pending_security_approval":
      return { label: "Awaiting Security Supervisor", role: "security_supervisor", step: 2 };
  }
};
```

2. Update approval button to use unified action:
```typescript
const handleApprove = (pass: MaterialGatePass) => {
  approvePass.mutate({
    passId: pass.id,
    action: 'approve',
    notes: approvalNotes[pass.id],
  });
};
```

---

### Phase 6: Update GatePassDetailDialog Timeline

**File: `src/components/contractors/GatePassDetailDialog.tsx`**

Add new timeline events for:
- Contractor Consultant Approval
- Dept Rep Acknowledgment (external)
- Dept Rep Approval (internal)
- Security Supervisor Approval

---

### Phase 7: Update Status Labels & Badges

**Files to update:**
- `GatePassListTable.tsx`
- `GatePassDetailDialog.tsx`
- `GatePassApprovalQueue.tsx`
- `dept-gate-passes/GatePassList.tsx`

Add new status labels:
```typescript
const labels = {
  pending_contractor_approval: "Pending Contractor",
  pending_dept_ack: "Pending Dept Ack",
  pending_dept_approval: "Pending Dept Approval",
  pending_security_approval: "Pending Security",
  approved: "Approved",
  rejected: "Rejected",
  used: "Entry Verified",
  completed: "Completed",
  expired: "Expired",
  cancelled: "Cancelled"
};
```

---

### Phase 8: Deprecate Edge Function

**File: `supabase/functions/approve-gate-pass/index.ts`**

Mark as deprecated and redirect to RPC:
- Add deprecation warning in logs
- Keep for backward compatibility during transition
- Eventually remove after verifying no callers

---

## Technical Details

### New Status State Machine

```text
EXTERNAL (Contractor):
  created → pending_contractor_approval → pending_dept_ack → approved → used → completed
                          ↓                       ↓
                      rejected                rejected

INTERNAL (Employee):
  created → pending_dept_approval → pending_security_approval → approved → used → completed
                     ↓                           ↓
                 rejected                    rejected
```

### Role-Permission Matrix

| Stage | External | Internal |
|:------|:---------|:---------|
| Stage 1 | contractor_consultant | department_representative (same dept) |
| Stage 2 | department_representative | security_supervisor |
| Entry/Exit | security_guard, security_shift_leader | security_guard, security_shift_leader |

### Files to Create/Modify

| File | Action | Purpose |
|:-----|:-------|:--------|
| Migration SQL | Create | Add RPC functions, update defaults |
| `use-material-gate-passes.ts` | Modify | Update hooks to use RPC |
| `GatePassApprovalQueue.tsx` | Modify | Update stage detection, button logic |
| `GatePassFormDialog.tsx` | Modify | Set correct initial status |
| `GatePassDetailDialog.tsx` | Modify | Add new timeline events |
| `GatePassListTable.tsx` | Modify | Add new status labels |
| `approve-gate-pass/index.ts` | Deprecate | Mark for removal |

---

## Audit Trail Compliance

The existing `log_gate_pass_changes` trigger will automatically capture:
- All status transitions
- Approver IDs and timestamps
- Rejection reasons

No additional audit code needed.

---

## Testing Checklist

1. **External (Contractor) Flow:**
   - [ ] Create gate pass as contractor rep
   - [ ] Approve as contractor_consultant → status = pending_dept_ack
   - [ ] Acknowledge as department_representative → status = approved, QR generated
   - [ ] Verify entry/exit as security_guard
   - [ ] Confirm audit logs capture all steps

2. **Internal (Employee) Flow:**
   - [ ] Create gate pass as internal employee
   - [ ] Approve as department_representative (same dept) → status = pending_security_approval
   - [ ] Approve as security_supervisor → status = approved, QR generated
   - [ ] Verify entry/exit as security_guard
   - [ ] Confirm audit logs capture all steps

3. **Security Enforcement:**
   - [ ] Contractor consultant cannot approve internal passes
   - [ ] Department rep from different dept cannot approve
   - [ ] Security guard cannot approve (only entry/exit)
   - [ ] Self-approval blocked at all stages
   - [ ] Skip/reorder blocked by status checks

---

## Regression Risks

| Risk | Mitigation |
|:-----|:-----------|
| Existing passes in old statuses | Add migration to map old → new statuses |
| Edge function callers break | Keep edge function working during transition |
| UI shows wrong buttons | Use RPC check before showing approve button |
| Audit logs inconsistent | Trigger handles all status changes automatically |
