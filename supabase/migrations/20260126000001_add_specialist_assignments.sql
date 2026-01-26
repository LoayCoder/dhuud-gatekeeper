-- Migration: Add specialist assignment columns to incidents table
-- This supports the workflow requirement for explicit role assignments for:
-- 1. Clinic User (Injury Tab)
-- 2. Tech Evaluator (Property Damage Tab)
-- 3. Environmental Expert (Environmental Impact Tab)

-- Add assignment columns to incidents table
ALTER TABLE incidents
  ADD COLUMN IF NOT EXISTS assigned_clinic_user_id UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS assigned_tech_evaluator_id UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS assigned_environmental_expert_id UUID REFERENCES auth.users(id);

-- Add index for efficient querying of specialist assignments
CREATE INDEX IF NOT EXISTS idx_incidents_specialist_assignments
  ON incidents(assigned_clinic_user_id, assigned_tech_evaluator_id, assigned_environmental_expert_id)
  WHERE assigned_clinic_user_id IS NOT NULL
     OR assigned_tech_evaluator_id IS NOT NULL
     OR assigned_environmental_expert_id IS NOT NULL;

-- Add new roles for clinic user and tech evaluator (environmental_expert already exists)
INSERT INTO roles (code, name, category, description, module_access, sort_order)
VALUES
  ('clinic_user', 'Clinic User', 'hsse', 'Medical professional for injury documentation and assessment', ARRAY['hsse_core'], 25),
  ('tech_evaluator', 'Tech Evaluator', 'hsse', 'Technical evaluator for property and asset damage assessment', ARRAY['hsse_core'], 26)
ON CONFLICT (code) DO NOTHING;

-- Add comment explaining the columns
COMMENT ON COLUMN incidents.assigned_clinic_user_id IS 'Clinic user assigned to complete injury assessment for this incident';
COMMENT ON COLUMN incidents.assigned_tech_evaluator_id IS 'Technical evaluator assigned to assess property damage for this incident';
COMMENT ON COLUMN incidents.assigned_environmental_expert_id IS 'Environmental expert assigned to assess environmental impact for this incident';
