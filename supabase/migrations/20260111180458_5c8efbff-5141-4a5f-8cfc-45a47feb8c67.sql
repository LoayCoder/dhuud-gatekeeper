-- Make company_id and project_id nullable to support internal requests
ALTER TABLE material_gate_passes 
  ALTER COLUMN company_id DROP NOT NULL,
  ALTER COLUMN project_id DROP NOT NULL;

-- Add a check constraint to ensure consistency:
-- Either it's an internal request (no project/company required)
-- OR it's an external request (project and company required)
ALTER TABLE material_gate_passes
  ADD CONSTRAINT material_gate_passes_request_type_check
  CHECK (
    (is_internal_request = true) OR 
    (is_internal_request = false AND project_id IS NOT NULL AND company_id IS NOT NULL)
  );