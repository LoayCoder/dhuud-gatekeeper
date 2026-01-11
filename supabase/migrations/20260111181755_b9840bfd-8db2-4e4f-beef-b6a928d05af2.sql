-- 1. Drop the old foreign key constraint
ALTER TABLE material_gate_passes 
  DROP CONSTRAINT IF EXISTS material_gate_passes_requested_by_fkey;

-- 2. Add new foreign key referencing profiles table
ALTER TABLE material_gate_passes 
  ADD CONSTRAINT material_gate_passes_requested_by_fkey 
  FOREIGN KEY (requested_by) REFERENCES profiles(id);