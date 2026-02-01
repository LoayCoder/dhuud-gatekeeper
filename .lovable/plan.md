
# Gate Pass Workflow Update: Club Management Acknowledgment Step

## Overview

This plan updates the Gate Pass approval workflow to add a mandatory **Club Management Department Representative acknowledgment** step before the final Security Supervisor approval.

---

## Current vs New Workflow

### Current Flow

```text
EXTERNAL (Contractor):
Request → [Contractor Consultant] → [Dept Rep Ack] → ✓ Approved

INTERNAL (Employee):
Request → [User's Dept Rep] → [Security Supervisor] → ✓ Approved
```

### New Flow (After Change)

```text
EXTERNAL (Contractor):
Request → [Contractor Consultant] → [Club Mgmt Dept Rep] → [Security Supervisor] → ✓ Approved

INTERNAL (Employee):
Request → [User's Dept Rep/Manager] → [Club Mgmt Dept Rep] → [Security Supervisor] → ✓ Approved
```

Both paths now converge at the **Club Management Department Representative** before reaching Security.

---

## Implementation Plan

### Phase 1: Database Schema Updates

#### 1.1 Add New Status Value

Add `pending_club_mgmt_ack` to the status constraint:

```sql
-- Drop existing constraint
ALTER TABLE material_gate_passes 
  DROP CONSTRAINT IF EXISTS material_gate_passes_status_check;

-- Add new constraint with all statuses including new one
ALTER TABLE material_gate_passes 
  ADD CONSTRAINT material_gate_passes_status_check 
  CHECK (status IN (
    'pending_contractor_approval',
    'pending_dept_approval',
    'pending_dept_ack',
    'pending_club_mgmt_ack',   -- NEW: Club Management acknowledgment
    'pending_security_approval',
    'pending_pm_approval',     -- Legacy
    'pending_safety_approval', -- Legacy
    'approved', 'rejected', 'completed',
    'used', 'expired', 'cancelled'
  ));
```

#### 1.2 Add Tracking Columns for Club Management Acknowledgment

```sql
ALTER TABLE material_gate_passes 
  ADD COLUMN IF NOT EXISTS club_mgmt_ack_by UUID REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS club_mgmt_ack_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS club_mgmt_ack_notes TEXT;
```

#### 1.3 Create Helper Function to Get Club Management Dept Rep

```sql
CREATE OR REPLACE FUNCTION get_club_mgmt_dept_representative()
RETURNS UUID
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dept_id UUID;
  v_rep_id UUID;
BEGIN
  -- Find the "Golf Club Management" department
  SELECT id INTO v_dept_id 
  FROM departments 
  WHERE name = 'Golf Club Management' 
    AND deleted_at IS NULL 
  LIMIT 1;
  
  IF v_dept_id IS NULL THEN
    -- Fallback: try to find any active department with "club" or "golf" in name
    SELECT id INTO v_dept_id 
    FROM departments 
    WHERE (name ILIKE '%club%management%' OR name ILIKE '%golf%management%')
      AND deleted_at IS NULL 
    LIMIT 1;
  END IF;
  
  IF v_dept_id IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Get the department representative for this department
  v_rep_id := get_department_representative(v_dept_id);
  RETURN v_rep_id;
END;
$$;
```

---

### Phase 2: Update Approval Validation Function

Modify `can_approve_gate_pass` to include the new `club_mgmt_ack` stage:

```sql
CREATE OR REPLACE FUNCTION can_approve_gate_pass(
  p_user_id UUID,
  p_gate_pass_id UUID,
  p_approval_stage TEXT
) RETURNS JSONB
-- ... existing code ...
  
  -- Add new case for Club Management acknowledgment
  WHEN 'club_mgmt_ack' THEN
    -- Stage: Club Management Dept Rep acknowledgment
    IF v_pass.status != 'pending_club_mgmt_ack' THEN
      RETURN jsonb_build_object('allowed', false, 'reason', 'Not at Club Management acknowledgment stage');
    END IF;
    
    -- Must be department_representative for Golf Club Management department
    v_can_approve := (
      'department_representative' = ANY(v_user_roles) 
      AND v_user_dept_id = (SELECT id FROM departments WHERE name = 'Golf Club Management' AND deleted_at IS NULL LIMIT 1)
    ) OR 'admin' = ANY(v_user_roles);
    v_reason := 'Requires Club Management department_representative role';
```

---

### Phase 3: Update Approval Workflow Function

Modify `approve_gate_pass_unified` to handle the new routing:

#### 3.1 Update Stage Detection

```sql
CASE v_pass.status
  -- ... existing cases ...
  WHEN 'pending_club_mgmt_ack' THEN v_stage := 'club_mgmt_ack';
END CASE;
```

#### 3.2 Update Stage Transitions

**External Path:**
- `pending_contractor_approval` → `pending_club_mgmt_ack` (was: `pending_dept_ack`)
- `pending_club_mgmt_ack` → `pending_security_approval` (NEW)

**Internal Path:**
- `pending_dept_approval` → `pending_club_mgmt_ack` (was: `pending_security_approval`)
- `pending_club_mgmt_ack` → `pending_security_approval` (NEW)

```sql
CASE v_stage
  WHEN 'contractor' THEN
    -- Contractor Consultant approved → move to Club Management Ack
    UPDATE material_gate_passes SET
      contractor_approved_by = p_user_id,
      contractor_approved_at = NOW(),
      contractor_approval_notes = p_notes,
      status = 'pending_club_mgmt_ack',  -- CHANGED from 'pending_dept_ack'
      updated_at = NOW()
    WHERE id = p_gate_pass_id;
    v_new_status := 'pending_club_mgmt_ack';
    
  WHEN 'dept_approval' THEN
    -- Internal: User's Dept Rep approved → move to Club Management Ack
    UPDATE material_gate_passes SET
      pm_approved_by = p_user_id,
      pm_approved_at = NOW(),
      pm_notes = p_notes,
      status = 'pending_club_mgmt_ack',  -- CHANGED from 'pending_security_approval'
      updated_at = NOW()
    WHERE id = p_gate_pass_id;
    v_new_status := 'pending_club_mgmt_ack';
    
  WHEN 'club_mgmt_ack' THEN
    -- Club Management Dept Rep acknowledged → move to Security Supervisor
    UPDATE material_gate_passes SET
      club_mgmt_ack_by = p_user_id,
      club_mgmt_ack_at = NOW(),
      club_mgmt_ack_notes = p_notes,
      status = 'pending_security_approval',
      updated_at = NOW()
    WHERE id = p_gate_pass_id;
    v_new_status := 'pending_security_approval';
    
  WHEN 'security' THEN
    -- Security Supervisor approved → APPROVED + generate QR
    -- ... existing code (no change)
```

---

### Phase 4: Update Pending Passes Query

Modify `get_user_pending_gate_passes` to include the new stage:

```sql
-- Add case for Club Management acknowledgment
WHEN gp.status = 'pending_club_mgmt_ack' 
     AND ('department_representative' = ANY(v_user_roles))
     AND v_user_dept_id = (SELECT id FROM departments WHERE name = 'Golf Club Management' AND deleted_at IS NULL LIMIT 1)
     AND gp.requested_by != p_user_id THEN TRUE
```

---

### Phase 5: Frontend Updates

#### 5.1 Add Status Labels to Translations

**English (`src/locales/en/translation.json`):**
```json
"gatePasses": {
  "status": {
    "pending_club_mgmt_ack": "Pending Club Mgmt"
  }
},
"contractors": {
  "passStatus": {
    "pendingClubMgmtAck": "Pending Club Mgmt"
  },
  "gatePasses": {
    "awaitingClubMgmtAck": "Awaiting Club Management Acknowledgment"
  }
}
```

**Arabic (`src/locales/ar/translation.json`):**
```json
"gatePasses": {
  "status": {
    "pending_club_mgmt_ack": "بانتظار إدارة النادي"
  }
},
"contractors": {
  "passStatus": {
    "pendingClubMgmtAck": "بانتظار إدارة النادي"
  },
  "gatePasses": {
    "awaitingClubMgmtAck": "بانتظار إقرار إدارة النادي"
  }
}
```

#### 5.2 Update Status Badge Components

**Files to update:**
- `src/components/contractors/GatePassListTable.tsx`
- `src/components/contractors/GatePassDetailDialog.tsx`
- `src/components/contractors/GatePassApprovalQueue.tsx`
- `src/pages/my-gate-passes/List.tsx`

Add the new status to status maps:
```typescript
const statusVariants = {
  // ... existing
  pending_club_mgmt_ack: "secondary",
};

const statusLabels = {
  // ... existing
  pending_club_mgmt_ack: t("contractors.passStatus.pendingClubMgmtAck", "Pending Club Mgmt"),
};
```

#### 5.3 Update Approval Stage Indicator

In `GatePassApprovalQueue.tsx`, update the `getApprovalStage` function:
```typescript
case "pending_club_mgmt_ack":
  return { 
    label: t("contractors.gatePasses.awaitingClubMgmtAck", "Awaiting Club Mgmt Ack"), 
    step: 2, 
    role: "club_mgmt_department_representative" 
  };
```

#### 5.4 Update Timeline Labels in Detail Dialog

Add timeline translation for the new step:
```typescript
"timeline": {
  "clubMgmtAck": "Club Management acknowledged"
}
```

Arabic:
```typescript
"timeline": {
  "clubMgmtAck": "أقرت إدارة النادي"
}
```

---

## Updated Workflow Diagram

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                         GATE PASS APPROVAL WORKFLOW                          │
└─────────────────────────────────────────────────────────────────────────────┘

EXTERNAL (Contractor) PATH:
┌──────────────┐     ┌──────────────────────┐     ┌─────────────────────┐     ┌──────────────────┐     ┌──────────┐
│   Request    │────▶│ Contractor Consultant│────▶│ Club Mgmt Dept Rep  │────▶│ Security Superv. │────▶│ APPROVED │
│   Created    │     │ pending_contractor_  │     │ pending_club_mgmt_  │     │ pending_security_│     │          │
│              │     │ approval             │     │ ack                 │     │ approval         │     │          │
└──────────────┘     └──────────────────────┘     └─────────────────────┘     └──────────────────┘     └──────────┘

INTERNAL (Employee) PATH:
┌──────────────┐     ┌──────────────────────┐     ┌─────────────────────┐     ┌──────────────────┐     ┌──────────┐
│   Request    │────▶│ User's Dept Rep or   │────▶│ Club Mgmt Dept Rep  │────▶│ Security Superv. │────▶│ APPROVED │
│   Created    │     │ Manager              │     │ pending_club_mgmt_  │     │ pending_security_│     │          │
│              │     │ pending_dept_approval│     │ ack                 │     │ approval         │     │          │
└──────────────┘     └──────────────────────┘     └─────────────────────┘     └──────────────────┘     └──────────┘

                                                        ↓
                                              BOTH PATHS MERGE HERE
```

---

## Files to Create/Modify

| File | Action | Description |
|:-----|:-------|:------------|
| Migration SQL | Create | Add new status, columns, update functions |
| `src/locales/ar/translation.json` | Modify | Add `pending_club_mgmt_ack` translations |
| `src/locales/en/translation.json` | Modify | Add `pending_club_mgmt_ack` translations |
| `src/components/contractors/GatePassListTable.tsx` | Modify | Add new status to variants/labels |
| `src/components/contractors/GatePassDetailDialog.tsx` | Modify | Add new status to variants/labels |
| `src/components/contractors/GatePassApprovalQueue.tsx` | Modify | Add new stage to `getApprovalStage` |
| `src/pages/my-gate-passes/List.tsx` | Modify | Add new status to status config |

---

## Technical Notes

### Role-Based Access for Club Management Step

The Club Management acknowledgment is validated by checking:
1. User has `department_representative` role
2. User's `assigned_department_id` matches the "Golf Club Management" department ID

### Fallback Behavior

If no "Golf Club Management" department exists:
- The `get_club_mgmt_dept_representative()` function returns NULL
- System should fallback to allowing any `department_representative` with `admin` role to approve
- A warning should be logged

### Existing Data Migration

Passes currently in `pending_dept_ack` (External) will be migrated to `pending_club_mgmt_ack` to use the new flow:
```sql
UPDATE material_gate_passes 
SET status = 'pending_club_mgmt_ack' 
WHERE status = 'pending_dept_ack' 
  AND deleted_at IS NULL;
```

---

## Testing Checklist

1. **External (Contractor) Flow:**
   - Create external pass → status = `pending_contractor_approval`
   - Contractor Consultant approves → status = `pending_club_mgmt_ack`
   - Club Mgmt Dept Rep acknowledges → status = `pending_security_approval`
   - Security Supervisor approves → status = `approved` + QR generated

2. **Internal (Employee) Flow:**
   - Create internal pass → status = `pending_dept_approval`
   - User's Dept Rep approves → status = `pending_club_mgmt_ack`
   - Club Mgmt Dept Rep acknowledges → status = `pending_security_approval`
   - Security Supervisor approves → status = `approved` + QR generated

3. **Rejection at Any Stage:**
   - Verify rejection works at each stage
   - Status becomes `rejected`, workflow stops

4. **UI Verification:**
   - Approval queue shows correct stage labels
   - Status badges display correctly in all languages
   - Detail dialog timeline shows all approval steps
