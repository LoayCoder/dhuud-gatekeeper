
# Update Gate Pass Workflow: Golf Club Management Acknowledgment

## Overview

This plan completes the implementation of the Golf Club Management acknowledgment step by:
1. Adding the missing `club_mgmt_ack` case to the `can_approve_gate_pass` function
2. Adding all missing translation keys with full "Golf Club Management" name
3. Updating component fallback strings

---

## Current Issue

The `can_approve_gate_pass` function is missing the `club_mgmt_ack` stage case, which prevents users from the Golf Club Management department from taking action on gate passes at this stage.

**Missing in `can_approve_gate_pass`:**
- No case for `club_mgmt_ack` stage
- Logic should check: User has `department_representative` role AND belongs to Golf Club Management department

---

## Implementation Plan

### Phase 1: Database Migration - Add Missing Approval Stage

Create a new migration to update `can_approve_gate_pass` function with the `club_mgmt_ack` case:

```sql
CREATE OR REPLACE FUNCTION can_approve_gate_pass(
  p_user_id UUID,
  p_gate_pass_id UUID,
  p_approval_stage TEXT
) RETURNS JSONB
-- Add new variable
DECLARE
  v_club_mgmt_dept_id UUID;
  -- ... existing variables

-- Add new case for club_mgmt_ack (applies to BOTH internal and external paths)
WHEN 'club_mgmt_ack' THEN
  IF v_pass.status != 'pending_club_mgmt_ack' THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'Not at Golf Club Management acknowledgment stage');
  END IF;
  
  -- Find Golf Club Management department
  SELECT id INTO v_club_mgmt_dept_id 
  FROM departments 
  WHERE (name = 'Golf Club Management' OR name ILIKE '%club%management%' OR name ILIKE '%golf%management%')
    AND deleted_at IS NULL 
  ORDER BY CASE WHEN name = 'Golf Club Management' THEN 0 ELSE 1 END
  LIMIT 1;
  
  -- User must be department_representative AND belong to Golf Club Management
  v_can_approve := (
    ('department_representative' = ANY(v_user_roles) OR 'department_manager' = ANY(v_user_roles))
    AND v_user_dept_id = v_club_mgmt_dept_id
  ) OR 'admin' = ANY(v_user_roles);
  
  v_reason := 'Requires department_representative role in Golf Club Management department';
```

**Key Logic:**
- User must have `department_representative` OR `department_manager` role
- User must be assigned to the Golf Club Management department (`assigned_department_id`)
- Admins can always approve as fallback

---

### Phase 2: Add Translation Keys

#### English (`src/locales/en/translation.json`)

Add these keys:

```json
"contractors": {
  "passStatus": {
    "pendingClubMgmtAck": "Pending Golf Club Management"
  },
  "gatePasses": {
    "awaitingClubMgmtAck": "Awaiting Golf Club Management Acknowledgment"
  },
  "gatePassDetail": {
    "timeline": {
      "clubMgmtAck": "Golf Club Management acknowledged"
    }
  }
}
```

```json
"gatePasses": {
  "status": {
    "pending_club_mgmt_ack": "Pending Golf Club Management"
  }
}
```

#### Arabic (`src/locales/ar/translation.json`)

Add these keys:

```json
"contractors": {
  "passStatus": {
    "pendingClubMgmtAck": "بانتظار إدارة نادي الجولف"
  },
  "gatePasses": {
    "awaitingClubMgmtAck": "بانتظار إقرار إدارة نادي الجولف"
  },
  "gatePassDetail": {
    "timeline": {
      "clubMgmtAck": "أقرت إدارة نادي الجولف"
    }
  }
}
```

```json
"gatePasses": {
  "status": {
    "pending_club_mgmt_ack": "بانتظار إدارة نادي الجولف"
  }
}
```

---

### Phase 3: Update Component Fallback Strings

#### GatePassApprovalQueue.tsx (line 85)

**Current:**
```typescript
case "pending_club_mgmt_ack":
  return { label: t("contractors.gatePasses.awaitingClubMgmtAck", "Awaiting Club Mgmt Ack"), step: 2, role: "club_mgmt_department_representative" };
```

**Update to:**
```typescript
case "pending_club_mgmt_ack":
  return { label: t("contractors.gatePasses.awaitingClubMgmtAck", "Awaiting Golf Club Management"), step: 2, role: "golf_club_management_department_representative" };
```

#### GatePassListTable.tsx

Update status labels map:
```typescript
pending_club_mgmt_ack: t("contractors.passStatus.pendingClubMgmtAck", "Pending Golf Club Management"),
```

#### GatePassDetailDialog.tsx

Update status badge labels:
```typescript
pending_club_mgmt_ack: t("contractors.passStatus.pendingClubMgmtAck", "Pending Golf Club Management"),
```

#### my-gate-passes/List.tsx

Update status config:
```typescript
pending_club_mgmt_ack: t("contractors.passStatus.pendingClubMgmtAck", "Pending Golf Club Management"),
```

---

## Files to Create/Modify

| File | Action | Description |
|:-----|:-------|:------------|
| New Migration SQL | Create | Update `can_approve_gate_pass` with `club_mgmt_ack` case |
| `src/locales/en/translation.json` | Modify | Add `pendingClubMgmtAck`, `awaitingClubMgmtAck`, `clubMgmtAck` (timeline) keys |
| `src/locales/ar/translation.json` | Modify | Add same keys with Arabic translations |
| `src/components/contractors/GatePassApprovalQueue.tsx` | Modify | Update fallback string and role identifier |
| `src/components/contractors/GatePassListTable.tsx` | Modify | Update fallback string |
| `src/components/contractors/GatePassDetailDialog.tsx` | Modify | Update fallback string + add timeline label |
| `src/pages/my-gate-passes/List.tsx` | Modify | Update fallback string |

---

## Access Control Summary

| Stage | Who Can Approve | Validation |
|:------|:----------------|:-----------|
| `pending_club_mgmt_ack` | Users with `department_representative` or `department_manager` role who belong to Golf Club Management department | Checked via `v_user_dept_id = v_club_mgmt_dept_id` |

---

## Label Summary

| Context | English | Arabic |
|:--------|:--------|:-------|
| Status Badge | Pending Golf Club Management | بانتظار إدارة نادي الجولف |
| Approval Queue | Awaiting Golf Club Management Acknowledgment | بانتظار إقرار إدارة نادي الجولف |
| Timeline Event | Golf Club Management acknowledged | أقرت إدارة نادي الجولف |

---

## Workflow Diagram

```text
EXTERNAL (Contractor):
Request → Contractor Consultant → Golf Club Management Rep → Security Supervisor → APPROVED

INTERNAL (Employee):
Request → User's Dept Rep/Manager → Golf Club Management Rep → Security Supervisor → APPROVED
```

**Who is "Golf Club Management Rep"?**
- Any user with `department_representative` or `department_manager` role
- Who is assigned to the "Golf Club Management" department (`profiles.assigned_department_id`)
