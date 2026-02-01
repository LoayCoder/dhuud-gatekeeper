
# Fix Gate Pass Status Check Constraint Error

## Root Cause

The code in `use-material-gate-passes.ts` (line 282) sets status values that are NOT allowed by the database constraint:

| Request Type | Code Sets | Database Allows |
|:------------|:----------|:----------------|
| Internal | `pending_dept_approval` | NOT in constraint |
| External | `pending_contractor_approval` | NOT in constraint |

**Database Constraint Definition:**
```sql
CHECK (status = ANY (ARRAY[
  'pending_pm_approval', 
  'pending_safety_approval', 
  'approved', 
  'rejected', 
  'completed', 
  'used', 
  'expired', 
  'cancelled', 
  'pending_pm', 
  'pending_safety'
]))
```

The unified approval workflow statuses (`pending_dept_approval`, `pending_contractor_approval`, `pending_club_mgmt_ack`, `pending_security_approval`) were never added to this constraint.

---

## Solution

Update the database constraint to include all statuses from the unified approval workflow:

**New Status Values to Add:**
- `pending_dept_approval` - Internal requests start here
- `pending_contractor_approval` - External requests start here  
- `pending_club_mgmt_ack` - After contractor/dept approval
- `pending_security_approval` - Final security review

---

## Migration SQL

```sql
-- Drop the old constraint
ALTER TABLE material_gate_passes 
  DROP CONSTRAINT material_gate_passes_status_check;

-- Add new constraint with all valid statuses
ALTER TABLE material_gate_passes 
  ADD CONSTRAINT material_gate_passes_status_check 
  CHECK (status = ANY (ARRAY[
    -- Legacy statuses (keep for backward compatibility)
    'pending_pm_approval',
    'pending_safety_approval', 
    'pending_pm',
    'pending_safety',
    -- New unified workflow statuses
    'pending_dept_approval',
    'pending_contractor_approval',
    'pending_club_mgmt_ack',
    'pending_security_approval',
    -- Final statuses
    'approved',
    'rejected',
    'completed',
    'used',
    'expired',
    'cancelled'
  ]));

-- Add comment for documentation
COMMENT ON COLUMN material_gate_passes.status IS 
  'Gate pass workflow status: pending_dept_approval (internal start), pending_contractor_approval (external start), pending_club_mgmt_ack, pending_security_approval, approved, rejected, completed, used, expired, cancelled';
```

---

## Files to Modify

| File | Action | Description |
|:-----|:-------|:------------|
| Migration SQL | **Create** | Update the status check constraint |

---

## Status Workflow Reference

```text
INTERNAL REQUEST:
pending_dept_approval → pending_club_mgmt_ack → pending_security_approval → approved

EXTERNAL REQUEST:  
pending_contractor_approval → pending_club_mgmt_ack → pending_security_approval → approved
```

---

## Expected Result

After applying this migration:
- Internal gate pass creation will work with `pending_dept_approval` status
- External gate pass creation will work with `pending_contractor_approval` status
- The complete approval workflow will function correctly
