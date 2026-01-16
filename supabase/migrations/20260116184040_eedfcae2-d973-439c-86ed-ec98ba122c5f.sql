-- ============================================
-- OBSERVATION WORKFLOW RESTRUCTURE MIGRATION
-- ============================================
-- This migration implements the updated observation workflow with:
-- 1. New status values for routing
-- 2. Tracking columns for workflow state
-- 3. RPC functions for workflow transitions
-- 4. Auto-routing trigger for observations

-- ============================================
-- PART 1: ADD NEW TRACKING COLUMNS
-- ============================================

-- Add columns to track the new workflow stages
ALTER TABLE public.incidents ADD COLUMN IF NOT EXISTS consultant_screened_at timestamptz;
ALTER TABLE public.incidents ADD COLUMN IF NOT EXISTS consultant_screening_notes text;
ALTER TABLE public.incidents ADD COLUMN IF NOT EXISTS hsse_enforced_at timestamptz;
ALTER TABLE public.incidents ADD COLUMN IF NOT EXISTS hsse_enforced_by uuid REFERENCES public.profiles(id);
ALTER TABLE public.incidents ADD COLUMN IF NOT EXISTS action_dispute_reason text;
ALTER TABLE public.incidents ADD COLUMN IF NOT EXISTS dept_rep_acknowledged_at timestamptz;
ALTER TABLE public.incidents ADD COLUMN IF NOT EXISTS dept_rep_acknowledged_by uuid REFERENCES public.profiles(id);

-- ============================================
-- PART 2: RPC FUNCTIONS FOR WORKFLOW
-- ============================================

-- Function: Route observation to consultant (contractor observations)
CREATE OR REPLACE FUNCTION public.route_observation_to_consultant_screening(
  p_incident_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id uuid;
  v_old_status text;
  v_new_status text := 'pending_consultant_screening';
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  
  -- Get incident details
  SELECT tenant_id, status INTO v_tenant_id, v_old_status
  FROM incidents
  WHERE id = p_incident_id AND deleted_at IS NULL;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Incident not found');
  END IF;
  
  -- Update status
  UPDATE incidents
  SET 
    status = v_new_status,
    updated_at = now()
  WHERE id = p_incident_id;
  
  -- Log audit
  INSERT INTO incident_audit_logs (incident_id, tenant_id, actor_id, action, details)
  VALUES (
    p_incident_id, 
    v_tenant_id, 
    v_user_id, 
    'routed_to_consultant_screening',
    jsonb_build_object(
      'previous_status', v_old_status,
      'new_status', v_new_status,
      'auto_routed', true
    )
  );
  
  RETURN jsonb_build_object('success', true, 'new_status', v_new_status);
END;
$$;

-- Function: Route observation to department rep (normal observations)
CREATE OR REPLACE FUNCTION public.route_observation_to_dept_rep_review(
  p_incident_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id uuid;
  v_old_status text;
  v_new_status text := 'pending_dept_rep_review';
  v_dept_id uuid;
  v_dept_rep_id uuid;
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  
  -- Get incident details
  SELECT tenant_id, status, department_id INTO v_tenant_id, v_old_status, v_dept_id
  FROM incidents
  WHERE id = p_incident_id AND deleted_at IS NULL;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Incident not found');
  END IF;
  
  -- Try to find department representative
  IF v_dept_id IS NOT NULL THEN
    SELECT id INTO v_dept_rep_id
    FROM profiles
    WHERE department_id = v_dept_id 
      AND role = 'department_representative'
      AND deleted_at IS NULL
    LIMIT 1;
  END IF;
  
  -- Update status and assign dept rep if found
  UPDATE incidents
  SET 
    status = v_new_status,
    approval_manager_id = COALESCE(v_dept_rep_id, approval_manager_id),
    updated_at = now()
  WHERE id = p_incident_id;
  
  -- Log audit
  INSERT INTO incident_audit_logs (incident_id, tenant_id, actor_id, action, details)
  VALUES (
    p_incident_id, 
    v_tenant_id, 
    v_user_id, 
    'routed_to_dept_rep_review',
    jsonb_build_object(
      'previous_status', v_old_status,
      'new_status', v_new_status,
      'auto_routed', true,
      'assigned_dept_rep', v_dept_rep_id
    )
  );
  
  RETURN jsonb_build_object('success', true, 'new_status', v_new_status, 'dept_rep_id', v_dept_rep_id);
END;
$$;

-- Function: Consultant complete screening with severity-based routing
CREATE OR REPLACE FUNCTION public.consultant_complete_screening(
  p_incident_id uuid,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id uuid;
  v_old_status text;
  v_new_status text;
  v_severity text;
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  
  -- Get incident details including severity
  SELECT tenant_id, status, severity_v2 INTO v_tenant_id, v_old_status, v_severity
  FROM incidents
  WHERE id = p_incident_id AND deleted_at IS NULL;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Incident not found');
  END IF;
  
  -- Check status
  IF v_old_status != 'pending_consultant_screening' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Observation not in consultant screening stage');
  END IF;
  
  -- Severity-based routing: Level 1-2 -> Site Client, Level 3+ -> HSSE Expert
  IF v_severity IN ('level_1', 'level_2') THEN
    v_new_status := 'pending_site_client_approval';
  ELSE
    v_new_status := 'pending_hsse_expert_review';
  END IF;
  
  -- Update incident
  UPDATE incidents
  SET 
    status = v_new_status,
    consultant_screened_at = now(),
    consultant_screening_notes = p_notes,
    updated_at = now()
  WHERE id = p_incident_id;
  
  -- Log audit
  INSERT INTO incident_audit_logs (incident_id, tenant_id, actor_id, action, details)
  VALUES (
    p_incident_id, 
    v_tenant_id, 
    v_user_id, 
    'consultant_screening_complete',
    jsonb_build_object(
      'previous_status', v_old_status,
      'new_status', v_new_status,
      'severity', v_severity,
      'routed_to', CASE WHEN v_new_status = 'pending_site_client_approval' THEN 'site_client' ELSE 'hsse_expert' END,
      'notes', p_notes
    )
  );
  
  RETURN jsonb_build_object('success', true, 'new_status', v_new_status, 'routed_to', 
    CASE WHEN v_new_status = 'pending_site_client_approval' THEN 'site_client' ELSE 'hsse_expert' END);
END;
$$;

-- Function: Department rep acknowledge observation (normal observations)
CREATE OR REPLACE FUNCTION public.dept_rep_acknowledge_observation(
  p_incident_id uuid,
  p_notes text DEFAULT NULL,
  p_close_on_spot boolean DEFAULT false,
  p_evidence jsonb DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id uuid;
  v_old_status text;
  v_new_status text;
  v_severity text;
  v_user_id uuid;
  v_actions_count int;
BEGIN
  v_user_id := auth.uid();
  
  -- Get incident details
  SELECT tenant_id, status, severity_v2 INTO v_tenant_id, v_old_status, v_severity
  FROM incidents
  WHERE id = p_incident_id AND deleted_at IS NULL;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Incident not found');
  END IF;
  
  -- Check status
  IF v_old_status != 'pending_dept_rep_review' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Observation not in department rep review stage');
  END IF;
  
  -- For Level 3+, always escalate to HSSE Expert
  IF v_severity NOT IN ('level_1', 'level_2') THEN
    v_new_status := 'pending_hsse_expert_review';
    
    UPDATE incidents
    SET 
      status = v_new_status,
      dept_rep_acknowledged_at = now(),
      dept_rep_acknowledged_by = v_user_id,
      dept_rep_notes = p_notes,
      updated_at = now()
    WHERE id = p_incident_id;
    
    -- Log audit
    INSERT INTO incident_audit_logs (incident_id, tenant_id, actor_id, action, details)
    VALUES (
      p_incident_id, 
      v_tenant_id, 
      v_user_id, 
      'dept_rep_escalate_to_hsse',
      jsonb_build_object(
        'previous_status', v_old_status,
        'new_status', v_new_status,
        'severity', v_severity,
        'notes', p_notes,
        'reason', 'Level 3+ requires HSSE Expert review'
      )
    );
    
    RETURN jsonb_build_object('success', true, 'new_status', v_new_status, 'action', 'escalated_to_hsse');
  END IF;
  
  -- For Level 1-2: Check for close on spot
  IF p_close_on_spot THEN
    -- Validate evidence exists
    IF p_evidence IS NULL OR jsonb_array_length(p_evidence) = 0 THEN
      RETURN jsonb_build_object('success', false, 'error', 'Evidence required for close on spot');
    END IF;
    
    v_new_status := 'closed';
    
    UPDATE incidents
    SET 
      status = v_new_status,
      dept_rep_acknowledged_at = now(),
      dept_rep_acknowledged_by = v_user_id,
      dept_rep_notes = p_notes,
      closed_at = now(),
      closed_by = v_user_id,
      updated_at = now()
    WHERE id = p_incident_id;
    
    -- Log audit
    INSERT INTO incident_audit_logs (incident_id, tenant_id, actor_id, action, details)
    VALUES (
      p_incident_id, 
      v_tenant_id, 
      v_user_id, 
      'dept_rep_close_on_spot',
      jsonb_build_object(
        'previous_status', v_old_status,
        'new_status', v_new_status,
        'severity', v_severity,
        'notes', p_notes,
        'evidence_count', jsonb_array_length(p_evidence)
      )
    );
    
    RETURN jsonb_build_object('success', true, 'new_status', v_new_status, 'action', 'closed_on_spot');
  END IF;
  
  -- Level 1-2 with actions: proceed to action pending
  SELECT COUNT(*) INTO v_actions_count
  FROM corrective_actions
  WHERE incident_id = p_incident_id AND deleted_at IS NULL;
  
  IF v_actions_count > 0 THEN
    v_new_status := 'observation_actions_pending';
    
    -- Release actions
    UPDATE corrective_actions
    SET released_at = now()
    WHERE incident_id = p_incident_id AND deleted_at IS NULL AND released_at IS NULL;
  ELSE
    v_new_status := 'closed';
  END IF;
  
  UPDATE incidents
  SET 
    status = v_new_status,
    dept_rep_acknowledged_at = now(),
    dept_rep_acknowledged_by = v_user_id,
    dept_rep_notes = p_notes,
    closed_at = CASE WHEN v_new_status = 'closed' THEN now() ELSE closed_at END,
    closed_by = CASE WHEN v_new_status = 'closed' THEN v_user_id ELSE closed_by END,
    updated_at = now()
  WHERE id = p_incident_id;
  
  -- Log audit
  INSERT INTO incident_audit_logs (incident_id, tenant_id, actor_id, action, details)
  VALUES (
    p_incident_id, 
    v_tenant_id, 
    v_user_id, 
    CASE WHEN v_new_status = 'closed' THEN 'dept_rep_acknowledge_and_close' ELSE 'dept_rep_acknowledge_with_actions' END,
    jsonb_build_object(
      'previous_status', v_old_status,
      'new_status', v_new_status,
      'severity', v_severity,
      'notes', p_notes,
      'actions_released', v_actions_count
    )
  );
  
  RETURN jsonb_build_object('success', true, 'new_status', v_new_status, 'actions_released', v_actions_count);
END;
$$;

-- Function: HSSE Expert enforce decision (final authority)
CREATE OR REPLACE FUNCTION public.hsse_expert_enforce_decision(
  p_incident_id uuid,
  p_decision text, -- 'approve', 'reject', 'return_to_consultant', 'return_to_dept_rep'
  p_notes text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id uuid;
  v_old_status text;
  v_new_status text;
  v_is_contractor boolean;
  v_user_id uuid;
  v_actions_count int;
BEGIN
  v_user_id := auth.uid();
  
  -- Verify user is HSSE expert
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = v_user_id 
      AND (role IN ('hsse_expert', 'hsse_manager', 'admin') OR is_admin = true)
      AND deleted_at IS NULL
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: HSSE Expert role required');
  END IF;
  
  -- Get incident details
  SELECT tenant_id, status, (related_contractor_company_id IS NOT NULL)
  INTO v_tenant_id, v_old_status, v_is_contractor
  FROM incidents
  WHERE id = p_incident_id AND deleted_at IS NULL;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Incident not found');
  END IF;
  
  -- Check if already enforced
  IF EXISTS (SELECT 1 FROM incidents WHERE id = p_incident_id AND hsse_enforced_at IS NOT NULL) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Decision already enforced - no further changes allowed');
  END IF;
  
  -- Determine new status based on decision
  CASE p_decision
    WHEN 'approve' THEN
      -- Check for actions
      SELECT COUNT(*) INTO v_actions_count
      FROM corrective_actions
      WHERE incident_id = p_incident_id AND deleted_at IS NULL;
      
      IF v_actions_count > 0 THEN
        IF v_is_contractor THEN
          v_new_status := 'pending_site_client_approval';
        ELSE
          v_new_status := 'observation_actions_pending';
          -- Release actions
          UPDATE corrective_actions
          SET released_at = now()
          WHERE incident_id = p_incident_id AND deleted_at IS NULL AND released_at IS NULL;
        END IF;
      ELSE
        v_new_status := 'closed';
      END IF;
      
    WHEN 'reject' THEN
      v_new_status := 'hsse_enforced';
      
    WHEN 'return_to_consultant' THEN
      IF NOT v_is_contractor THEN
        RETURN jsonb_build_object('success', false, 'error', 'Cannot return to consultant - not a contractor observation');
      END IF;
      v_new_status := 'pending_consultant_screening';
      
    WHEN 'return_to_dept_rep' THEN
      IF v_is_contractor THEN
        RETURN jsonb_build_object('success', false, 'error', 'Cannot return to dept rep - this is a contractor observation');
      END IF;
      v_new_status := 'pending_dept_rep_review';
      
    ELSE
      RETURN jsonb_build_object('success', false, 'error', 'Invalid decision');
  END CASE;
  
  -- Update incident with enforcement
  UPDATE incidents
  SET 
    status = v_new_status,
    hsse_enforced_at = CASE WHEN p_decision IN ('approve', 'reject') THEN now() ELSE NULL END,
    hsse_enforced_by = CASE WHEN p_decision IN ('approve', 'reject') THEN v_user_id ELSE NULL END,
    expert_screened_at = now(),
    expert_screened_by = v_user_id,
    expert_screening_notes = p_notes,
    closed_at = CASE WHEN v_new_status = 'closed' OR v_new_status = 'hsse_enforced' THEN now() ELSE closed_at END,
    closed_by = CASE WHEN v_new_status = 'closed' OR v_new_status = 'hsse_enforced' THEN v_user_id ELSE closed_by END,
    updated_at = now()
  WHERE id = p_incident_id;
  
  -- Log audit with special enforcement marker
  INSERT INTO incident_audit_logs (incident_id, tenant_id, actor_id, action, details)
  VALUES (
    p_incident_id, 
    v_tenant_id, 
    v_user_id, 
    'hsse_expert_enforce_decision',
    jsonb_build_object(
      'previous_status', v_old_status,
      'new_status', v_new_status,
      'decision', p_decision,
      'notes', p_notes,
      'is_final', p_decision IN ('approve', 'reject'),
      'no_appeal_allowed', p_decision IN ('approve', 'reject')
    )
  );
  
  RETURN jsonb_build_object(
    'success', true, 
    'new_status', v_new_status, 
    'decision', p_decision,
    'is_final', p_decision IN ('approve', 'reject')
  );
END;
$$;

-- Function: Contractor submit action dispute
CREATE OR REPLACE FUNCTION public.contractor_submit_action_dispute(
  p_action_id uuid,
  p_dispute_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_incident_id uuid;
  v_tenant_id uuid;
  v_old_status text;
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  
  -- Get action and incident details
  SELECT ca.incident_id, i.tenant_id, i.status
  INTO v_incident_id, v_tenant_id, v_old_status
  FROM corrective_actions ca
  JOIN incidents i ON i.id = ca.incident_id
  WHERE ca.id = p_action_id AND ca.deleted_at IS NULL;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Action not found');
  END IF;
  
  -- Update action with dispute
  UPDATE corrective_actions
  SET 
    status = 'disputed',
    dispute_reason = p_dispute_reason,
    disputed_at = now(),
    disputed_by = v_user_id,
    updated_at = now()
  WHERE id = p_action_id;
  
  -- Update incident status to pending action dispute review
  UPDATE incidents
  SET 
    status = 'pending_action_dispute_review',
    action_dispute_reason = p_dispute_reason,
    updated_at = now()
  WHERE id = v_incident_id;
  
  -- Log audit
  INSERT INTO incident_audit_logs (incident_id, tenant_id, actor_id, action, details)
  VALUES (
    v_incident_id, 
    v_tenant_id, 
    v_user_id, 
    'contractor_action_dispute',
    jsonb_build_object(
      'action_id', p_action_id,
      'previous_status', v_old_status,
      'new_status', 'pending_action_dispute_review',
      'dispute_reason', p_dispute_reason,
      'routed_to', 'consultant'
    )
  );
  
  RETURN jsonb_build_object('success', true, 'new_status', 'pending_action_dispute_review');
END;
$$;

-- Function: Consultant resolve action dispute
CREATE OR REPLACE FUNCTION public.consultant_resolve_action_dispute(
  p_incident_id uuid,
  p_decision text, -- 'resolve', 'modify', 'escalate_to_hsse'
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id uuid;
  v_old_status text;
  v_new_status text;
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  
  -- Get incident details
  SELECT tenant_id, status INTO v_tenant_id, v_old_status
  FROM incidents
  WHERE id = p_incident_id AND deleted_at IS NULL;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Incident not found');
  END IF;
  
  IF v_old_status != 'pending_action_dispute_review' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Observation not in action dispute review stage');
  END IF;
  
  -- Determine new status based on decision
  CASE p_decision
    WHEN 'resolve' THEN
      v_new_status := 'pending_contractor_implementation';
      -- Clear dispute on actions
      UPDATE corrective_actions
      SET status = 'in_progress', dispute_reason = NULL
      WHERE incident_id = p_incident_id AND status = 'disputed';
      
    WHEN 'modify' THEN
      v_new_status := 'pending_contractor_implementation';
      -- Actions should be updated separately
      
    WHEN 'escalate_to_hsse' THEN
      v_new_status := 'pending_hsse_expert_review';
      
    ELSE
      RETURN jsonb_build_object('success', false, 'error', 'Invalid decision');
  END CASE;
  
  -- Update incident
  UPDATE incidents
  SET 
    status = v_new_status,
    action_dispute_reason = NULL,
    updated_at = now()
  WHERE id = p_incident_id;
  
  -- Log audit
  INSERT INTO incident_audit_logs (incident_id, tenant_id, actor_id, action, details)
  VALUES (
    p_incident_id, 
    v_tenant_id, 
    v_user_id, 
    'consultant_resolve_action_dispute',
    jsonb_build_object(
      'previous_status', v_old_status,
      'new_status', v_new_status,
      'decision', p_decision,
      'notes', p_notes
    )
  );
  
  RETURN jsonb_build_object('success', true, 'new_status', v_new_status, 'decision', p_decision);
END;
$$;

-- ============================================
-- PART 3: AUTO-ROUTING TRIGGER
-- ============================================

-- Function for auto-routing observations on submit
CREATE OR REPLACE FUNCTION public.auto_route_observation_on_submit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_contractor boolean;
  v_new_status text;
BEGIN
  -- Only process observations that just became 'submitted'
  IF NEW.event_type = 'observation' 
     AND NEW.status = 'submitted' 
     AND (OLD IS NULL OR OLD.status != 'submitted') THEN
    
    v_is_contractor := NEW.related_contractor_company_id IS NOT NULL;
    
    IF v_is_contractor THEN
      -- Route to consultant screening
      v_new_status := 'pending_consultant_screening';
    ELSE
      -- Route to department rep review
      v_new_status := 'pending_dept_rep_review';
    END IF;
    
    NEW.status := v_new_status;
    
    -- Log the auto-routing
    INSERT INTO incident_audit_logs (incident_id, tenant_id, actor_id, action, details)
    VALUES (
      NEW.id, 
      NEW.tenant_id, 
      auth.uid(), 
      'auto_routed_observation',
      jsonb_build_object(
        'is_contractor', v_is_contractor,
        'routed_to', CASE WHEN v_is_contractor THEN 'consultant' ELSE 'dept_rep' END,
        'new_status', v_new_status
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create or replace the trigger
DROP TRIGGER IF EXISTS trigger_auto_route_observation ON public.incidents;
CREATE TRIGGER trigger_auto_route_observation
  BEFORE INSERT OR UPDATE ON public.incidents
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_route_observation_on_submit();

-- ============================================
-- PART 4: ADD DISPUTE COLUMNS TO CORRECTIVE ACTIONS IF NOT EXISTS
-- ============================================

ALTER TABLE public.corrective_actions ADD COLUMN IF NOT EXISTS dispute_reason text;
ALTER TABLE public.corrective_actions ADD COLUMN IF NOT EXISTS disputed_at timestamptz;
ALTER TABLE public.corrective_actions ADD COLUMN IF NOT EXISTS disputed_by uuid REFERENCES public.profiles(id);

-- ============================================
-- PART 5: GRANT EXECUTE PERMISSIONS
-- ============================================

GRANT EXECUTE ON FUNCTION public.route_observation_to_consultant_screening(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.route_observation_to_dept_rep_review(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.consultant_complete_screening(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.dept_rep_acknowledge_observation(uuid, text, boolean, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.hsse_expert_enforce_decision(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.contractor_submit_action_dispute(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.consultant_resolve_action_dispute(uuid, text, text) TO authenticated;