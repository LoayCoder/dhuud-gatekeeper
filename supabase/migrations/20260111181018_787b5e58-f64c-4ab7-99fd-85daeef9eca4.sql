-- 1. Drop the old pass_type constraint
ALTER TABLE material_gate_passes 
  DROP CONSTRAINT IF EXISTS material_gate_passes_pass_type_check;

-- 2. Add new pass_type constraint with correct values
ALTER TABLE material_gate_passes 
  ADD CONSTRAINT material_gate_passes_pass_type_check 
  CHECK (pass_type IN (
    'material_in', 'material_out', 
    'equipment_in', 'equipment_out',
    'in', 'out', 'in_out'
  ));

-- 3. Drop the old status constraint
ALTER TABLE material_gate_passes 
  DROP CONSTRAINT IF EXISTS material_gate_passes_status_check;

-- 4. Add new status constraint with correct values
ALTER TABLE material_gate_passes 
  ADD CONSTRAINT material_gate_passes_status_check 
  CHECK (status IN (
    'pending_pm_approval', 'pending_safety_approval', 
    'approved', 'rejected', 'completed',
    'used', 'expired', 'cancelled',
    'pending_pm', 'pending_safety'
  ));

-- 5. Migrate any existing data from old to new values
UPDATE material_gate_passes SET pass_type = 'material_in' WHERE pass_type = 'in';
UPDATE material_gate_passes SET pass_type = 'material_out' WHERE pass_type = 'out';
UPDATE material_gate_passes SET status = 'pending_pm_approval' WHERE status = 'pending_pm';
UPDATE material_gate_passes SET status = 'pending_safety_approval' WHERE status = 'pending_safety';
UPDATE material_gate_passes SET status = 'completed' WHERE status = 'used';