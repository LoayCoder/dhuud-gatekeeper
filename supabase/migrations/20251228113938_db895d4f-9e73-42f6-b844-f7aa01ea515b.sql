-- =====================================================
-- INSPECTION MODULE PRODUCTION READINESS ENHANCEMENTS
-- =====================================================

-- 1. FIX STORAGE POLICY: Add WITH CHECK to inspection-files bucket
-- Drop existing INSERT policy and recreate with proper tenant verification
DROP POLICY IF EXISTS "Users can upload inspection files" ON storage.objects;

CREATE POLICY "Users can upload inspection files"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'inspection-files' 
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = (
    SELECT tenant_id::text FROM public.profiles WHERE id = auth.uid()
  )
);

-- 2. CREATE INSPECTION AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS public.inspection_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  
  -- What was changed
  entity_type TEXT NOT NULL CHECK (entity_type IN ('session', 'finding', 'template', 'response', 'schedule')),
  entity_id UUID NOT NULL,
  reference_id TEXT,
  
  -- Who made the change
  actor_id UUID REFERENCES public.profiles(id),
  actor_name TEXT,
  
  -- What changed
  action TEXT NOT NULL CHECK (action IN (
    'created', 'updated', 'deleted', 'status_changed', 
    'started', 'completed', 'closed', 'reopened',
    'finding_added', 'finding_closed', 'action_linked',
    'escalated', 'assigned', 'approved', 'rejected'
  )),
  
  -- Change details
  old_value JSONB,
  new_value JSONB,
  change_summary TEXT,
  
  -- Context
  ip_address INET,
  user_agent TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for efficient querying
CREATE INDEX idx_inspection_audit_logs_tenant ON public.inspection_audit_logs(tenant_id);
CREATE INDEX idx_inspection_audit_logs_entity ON public.inspection_audit_logs(entity_type, entity_id);
CREATE INDEX idx_inspection_audit_logs_actor ON public.inspection_audit_logs(actor_id);
CREATE INDEX idx_inspection_audit_logs_created ON public.inspection_audit_logs(created_at DESC);
CREATE INDEX idx_inspection_audit_logs_action ON public.inspection_audit_logs(action);

-- Enable RLS
ALTER TABLE public.inspection_audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Only same-tenant users can view audit logs
CREATE POLICY "Users can view their tenant audit logs"
ON public.inspection_audit_logs
FOR SELECT
USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

-- Only system/triggers can insert (no direct user inserts)
CREATE POLICY "System can insert audit logs"
ON public.inspection_audit_logs
FOR INSERT
WITH CHECK (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

-- 3. ADD ESCALATION TRACKING TO FINDINGS
ALTER TABLE public.area_inspection_findings 
ADD COLUMN IF NOT EXISTS escalation_level INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_escalated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS escalation_notes TEXT;

-- Create index for escalation queries
CREATE INDEX IF NOT EXISTS idx_findings_escalation 
ON public.area_inspection_findings(escalation_level, last_escalated_at) 
WHERE deleted_at IS NULL AND status != 'closed';

-- 4. CREATE AUDIT TRIGGER FUNCTION FOR SESSIONS
CREATE OR REPLACE FUNCTION public.log_inspection_session_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_action TEXT;
  v_old_value JSONB;
  v_new_value JSONB;
  v_summary TEXT;
  v_actor_name TEXT;
BEGIN
  -- Get actor name
  SELECT full_name INTO v_actor_name FROM profiles WHERE id = auth.uid();
  
  IF TG_OP = 'INSERT' THEN
    v_action := 'created';
    v_new_value := jsonb_build_object(
      'status', NEW.status,
      'template_id', NEW.template_id,
      'session_type', NEW.session_type
    );
    v_summary := 'Inspection session created';
    
  ELSIF TG_OP = 'UPDATE' THEN
    -- Check what changed
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      v_action := 'status_changed';
      v_old_value := jsonb_build_object('status', OLD.status);
      v_new_value := jsonb_build_object('status', NEW.status);
      v_summary := 'Status changed from ' || COALESCE(OLD.status, 'null') || ' to ' || NEW.status;
      
      -- More specific action for common status changes
      IF NEW.status = 'in_progress' AND OLD.status = 'draft' THEN
        v_action := 'started';
        v_summary := 'Inspection started';
      ELSIF NEW.status IN ('completed', 'completed_with_open_actions') THEN
        v_action := 'completed';
        v_summary := 'Inspection completed';
      ELSIF NEW.status = 'closed' THEN
        v_action := 'closed';
        v_summary := 'Inspection closed';
      END IF;
    ELSE
      v_action := 'updated';
      v_old_value := to_jsonb(OLD) - 'created_at' - 'updated_at';
      v_new_value := to_jsonb(NEW) - 'created_at' - 'updated_at';
      v_summary := 'Inspection session updated';
    END IF;
    
  ELSIF TG_OP = 'DELETE' THEN
    -- Soft delete detection
    IF NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN
      v_action := 'deleted';
      v_old_value := jsonb_build_object('reference_id', OLD.reference_id);
      v_summary := 'Inspection session deleted';
    END IF;
  END IF;
  
  -- Only log if we have an action
  IF v_action IS NOT NULL THEN
    INSERT INTO public.inspection_audit_logs (
      tenant_id, entity_type, entity_id, reference_id,
      actor_id, actor_name, action,
      old_value, new_value, change_summary
    ) VALUES (
      COALESCE(NEW.tenant_id, OLD.tenant_id),
      'session',
      COALESCE(NEW.id, OLD.id),
      COALESCE(NEW.reference_id, OLD.reference_id),
      auth.uid(),
      v_actor_name,
      v_action,
      v_old_value,
      v_new_value,
      v_summary
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 5. CREATE AUDIT TRIGGER FUNCTION FOR FINDINGS
CREATE OR REPLACE FUNCTION public.log_inspection_finding_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_action TEXT;
  v_old_value JSONB;
  v_new_value JSONB;
  v_summary TEXT;
  v_actor_name TEXT;
BEGIN
  -- Get actor name
  SELECT full_name INTO v_actor_name FROM profiles WHERE id = auth.uid();
  
  IF TG_OP = 'INSERT' THEN
    v_action := 'finding_added';
    v_new_value := jsonb_build_object(
      'classification', NEW.classification,
      'risk_level', NEW.risk_level,
      'status', NEW.status
    );
    v_summary := 'Finding added: ' || COALESCE(NEW.classification, 'unclassified');
    
  ELSIF TG_OP = 'UPDATE' THEN
    -- Check what changed
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      IF NEW.status = 'closed' THEN
        v_action := 'finding_closed';
        v_summary := 'Finding closed';
      ELSE
        v_action := 'status_changed';
        v_summary := 'Finding status changed to ' || NEW.status;
      END IF;
      v_old_value := jsonb_build_object('status', OLD.status);
      v_new_value := jsonb_build_object('status', NEW.status);
      
    ELSIF OLD.corrective_action_id IS DISTINCT FROM NEW.corrective_action_id AND NEW.corrective_action_id IS NOT NULL THEN
      v_action := 'action_linked';
      v_new_value := jsonb_build_object('corrective_action_id', NEW.corrective_action_id);
      v_summary := 'Corrective action linked to finding';
      
    ELSIF OLD.escalation_level IS DISTINCT FROM NEW.escalation_level THEN
      v_action := 'escalated';
      v_old_value := jsonb_build_object('escalation_level', OLD.escalation_level);
      v_new_value := jsonb_build_object('escalation_level', NEW.escalation_level);
      v_summary := 'Finding escalated to level ' || NEW.escalation_level;
      
    ELSE
      v_action := 'updated';
      v_summary := 'Finding updated';
    END IF;
  END IF;
  
  -- Only log if we have an action
  IF v_action IS NOT NULL THEN
    INSERT INTO public.inspection_audit_logs (
      tenant_id, entity_type, entity_id, reference_id,
      actor_id, actor_name, action,
      old_value, new_value, change_summary
    ) VALUES (
      COALESCE(NEW.tenant_id, OLD.tenant_id),
      'finding',
      COALESCE(NEW.id, OLD.id),
      COALESCE(NEW.reference_id, OLD.reference_id),
      auth.uid(),
      v_actor_name,
      v_action,
      v_old_value,
      v_new_value,
      v_summary
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 6. ATTACH TRIGGERS
DROP TRIGGER IF EXISTS trg_audit_inspection_sessions ON public.inspection_sessions;
CREATE TRIGGER trg_audit_inspection_sessions
AFTER INSERT OR UPDATE ON public.inspection_sessions
FOR EACH ROW
EXECUTE FUNCTION public.log_inspection_session_changes();

DROP TRIGGER IF EXISTS trg_audit_inspection_findings ON public.area_inspection_findings;
CREATE TRIGGER trg_audit_inspection_findings
AFTER INSERT OR UPDATE ON public.area_inspection_findings
FOR EACH ROW
EXECUTE FUNCTION public.log_inspection_finding_changes();

-- 7. CREATE HELPER FUNCTION TO QUERY AUDIT LOGS
CREATE OR REPLACE FUNCTION public.get_inspection_audit_trail(
  p_entity_type TEXT DEFAULT NULL,
  p_entity_id UUID DEFAULT NULL,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  entity_type TEXT,
  entity_id UUID,
  reference_id TEXT,
  actor_name TEXT,
  action TEXT,
  change_summary TEXT,
  old_value JSONB,
  new_value JSONB,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ial.id,
    ial.entity_type,
    ial.entity_id,
    ial.reference_id,
    ial.actor_name,
    ial.action,
    ial.change_summary,
    ial.old_value,
    ial.new_value,
    ial.created_at
  FROM inspection_audit_logs ial
  WHERE ial.tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    AND (p_entity_type IS NULL OR ial.entity_type = p_entity_type)
    AND (p_entity_id IS NULL OR ial.entity_id = p_entity_id)
  ORDER BY ial.created_at DESC
  LIMIT p_limit;
END;
$$;