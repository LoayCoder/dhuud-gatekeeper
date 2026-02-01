-- Drop the old constraint
ALTER TABLE material_gate_passes 
  DROP CONSTRAINT IF EXISTS material_gate_passes_status_check;

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