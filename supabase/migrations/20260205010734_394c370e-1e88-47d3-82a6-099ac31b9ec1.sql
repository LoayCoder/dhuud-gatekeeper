-- Drop the existing constraint
ALTER TABLE material_gate_passes 
  DROP CONSTRAINT IF EXISTS material_gate_passes_request_type_check;

-- Create updated constraint that handles:
-- 1. Internal requests (is_internal_request = true)
-- 2. External requests (project_id and company_id required)
-- 3. Public requests (is_public_request = true, no project/company needed)
ALTER TABLE material_gate_passes 
  ADD CONSTRAINT material_gate_passes_request_type_check 
  CHECK (
    (is_internal_request = true) OR
    (is_public_request = true) OR
    ((is_internal_request = false) AND (project_id IS NOT NULL) AND (company_id IS NOT NULL))
  );