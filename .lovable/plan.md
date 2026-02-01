

# Fix: Stage Name Mismatch in `can_approve_gate_pass` Function

## Problem Identified

The `approve_gate_pass_unified` function converts statuses to simplified stage names before calling `can_approve_gate_pass`:

| Status | Stage Passed to `can_approve_gate_pass` |
|:-------|:----------------------------------------|
| `pending_contractor_approval` | `contractor` |
| `pending_dept_approval` | `dept_approval` |
| `pending_club_mgmt_ack` | `club_mgmt_ack` |
| `pending_security_approval` | `security` |

But `can_approve_gate_pass` expects full status names (e.g., `pending_dept_approval`), causing the **"Unknown approval stage"** error.

---

## Solution

Update `can_approve_gate_pass(uuid, uuid, text)` to match the **simplified stage names** that `approve_gate_pass_unified` actually passes.

### Stage Name Corrections

| Current (Wrong) | Correct |
|:----------------|:--------|
| `pending_contractor_approval` | `contractor` |
| `pending_dept_approval` | `dept_approval` |
| `pending_club_mgmt_ack` | `club_mgmt_ack` |
| `pending_security_approval` | `security` |

---

## Database Migration

| File | Action | Description |
|:-----|:-------|:------------|
| New migration SQL file | **Create** | Fix stage name matching in `can_approve_gate_pass(uuid, uuid, text)` |

The migration will:
1. Drop the existing 3-parameter function
2. Recreate with corrected `CASE` stage names
3. Grant EXECUTE permission to authenticated role

---

## Technical Details

### Current Code (Wrong)
```sql
CASE p_stage
  WHEN 'pending_contractor_approval' THEN ...
  WHEN 'pending_dept_approval' THEN ...
  WHEN 'pending_club_mgmt_ack' THEN ...
  WHEN 'pending_security_approval' THEN ...
```

### Fixed Code
```sql
CASE p_stage
  WHEN 'contractor' THEN ...
  WHEN 'dept_approval' THEN ...
  WHEN 'club_mgmt_ack' THEN ...
  WHEN 'security' THEN ...
```

---

## Expected Result

After migration:
1. No more "Unknown approval stage: dept_approval" errors
2. Khalid Al Shuhail will be able to approve **GP-2026-00001**
3. Complete gate pass approval workflow will function correctly

