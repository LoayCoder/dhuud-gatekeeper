-- Step 1: Add missing performance indexes on material_gate_passes
CREATE INDEX IF NOT EXISTS idx_material_gate_passes_company_id 
  ON public.material_gate_passes (company_id) 
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_material_gate_passes_status 
  ON public.material_gate_passes (status) 
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_material_gate_passes_requested_by 
  ON public.material_gate_passes (requested_by) 
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_material_gate_passes_tenant_id 
  ON public.material_gate_passes (tenant_id) 
  WHERE deleted_at IS NULL;

-- Step 2: Add submitted_at tracking column
ALTER TABLE public.material_gate_passes 
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz;