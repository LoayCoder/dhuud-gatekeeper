
-- ==============================================
-- PHASE 1: RCA MODULE DATABASE SCHEMA ENHANCEMENTS
-- ==============================================

-- 1.1 Extend investigations table for multiple root causes and AI summary
ALTER TABLE public.investigations 
ADD COLUMN IF NOT EXISTS root_causes jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS ai_summary text,
ADD COLUMN IF NOT EXISTS ai_summary_generated_at timestamptz,
ADD COLUMN IF NOT EXISTS ai_summary_language text DEFAULT 'en';

-- Add comment for root_causes structure
COMMENT ON COLUMN public.investigations.root_causes IS 'Array of root causes: [{ id: uuid, text: string, added_at: timestamp, added_by: uuid }]';

-- 1.2 Extend corrective_actions table for linking, categories, and verification
ALTER TABLE public.corrective_actions 
ADD COLUMN IF NOT EXISTS linked_root_cause_id text,
ADD COLUMN IF NOT EXISTS category text DEFAULT 'administrative',
ADD COLUMN IF NOT EXISTS responsible_department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS start_date date,
ADD COLUMN IF NOT EXISTS rejection_notes text,
ADD COLUMN IF NOT EXISTS rejected_at timestamptz,
ADD COLUMN IF NOT EXISTS rejected_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Add check constraint for category values
ALTER TABLE public.corrective_actions 
DROP CONSTRAINT IF EXISTS corrective_actions_category_check;

ALTER TABLE public.corrective_actions 
ADD CONSTRAINT corrective_actions_category_check 
CHECK (category IN ('engineering', 'administrative', 'ppe', 'training', 'procedures_update', 'environmental'));

-- 1.3 Create action_evidence table for evidence linked to corrective actions
CREATE TABLE IF NOT EXISTS public.action_evidence (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  action_id uuid NOT NULL REFERENCES public.corrective_actions(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  storage_path text NOT NULL,
  file_size integer,
  mime_type text,
  description text,
  uploaded_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

-- Enable RLS on action_evidence
ALTER TABLE public.action_evidence ENABLE ROW LEVEL SECURITY;

-- RLS policies for action_evidence
CREATE POLICY "Users can view evidence in their tenant"
ON public.action_evidence
FOR SELECT
USING (tenant_id = get_auth_tenant_id() AND deleted_at IS NULL);

CREATE POLICY "HSSE users can create evidence"
ON public.action_evidence
FOR INSERT
WITH CHECK (tenant_id = get_auth_tenant_id() AND has_hsse_incident_access(auth.uid()));

CREATE POLICY "HSSE users can update evidence"
ON public.action_evidence
FOR UPDATE
USING (tenant_id = get_auth_tenant_id() AND deleted_at IS NULL AND has_hsse_incident_access(auth.uid()));

-- 1.4 Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_investigations_root_causes ON public.investigations USING GIN (root_causes);
CREATE INDEX IF NOT EXISTS idx_corrective_actions_linked_root_cause ON public.corrective_actions(linked_root_cause_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_corrective_actions_category ON public.corrective_actions(category) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_action_evidence_action_id ON public.action_evidence(action_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_action_evidence_tenant_id ON public.action_evidence(tenant_id) WHERE deleted_at IS NULL;

-- 1.5 Function to check if all actions for an incident are verified/closed
CREATE OR REPLACE FUNCTION public.can_close_investigation(p_incident_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_total_actions integer;
  v_verified_actions integer;
  v_pending_actions jsonb;
BEGIN
  -- Count total and verified actions
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE status IN ('verified', 'closed'))
  INTO v_total_actions, v_verified_actions
  FROM corrective_actions
  WHERE incident_id = p_incident_id AND deleted_at IS NULL;

  -- Get list of pending actions
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', id,
    'title', title,
    'status', status
  )), '[]'::jsonb)
  INTO v_pending_actions
  FROM corrective_actions
  WHERE incident_id = p_incident_id 
    AND deleted_at IS NULL 
    AND status NOT IN ('verified', 'closed');

  RETURN jsonb_build_object(
    'can_close', v_total_actions > 0 AND v_total_actions = v_verified_actions,
    'total_actions', v_total_actions,
    'verified_actions', v_verified_actions,
    'pending_actions', v_pending_actions
  );
END;
$$;
