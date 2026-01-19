-- ============================================================
-- COMPREHENSIVE WORKFLOW SCHEMA ALIGNMENT MIGRATION
-- Fixes: user_roles → user_role_assignments, profiles.role, audit log columns
-- ============================================================

-- Drop functions that need signature changes first
DROP FUNCTION IF EXISTS public.get_agent_workload();

-- ============================================================
-- PHASE 1: Core Helper Functions
-- ============================================================

-- Fix has_role (ensure only the correct version exists)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_role_assignments ura
    JOIN public.roles r ON r.id = ura.role_id
    WHERE ura.user_id = _user_id
      AND r.code = _role
      AND r.is_active = true
  )
$$;

-- Fix get_agent_workload
CREATE FUNCTION public.get_agent_workload()
RETURNS TABLE(
  agent_id uuid,
  full_name text,
  open_tickets bigint,
  avg_response_time numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id as agent_id,
    p.full_name,
    COUNT(t.id) FILTER (WHERE t.status IN ('open', 'in_progress')) as open_tickets,
    COALESCE(AVG(EXTRACT(EPOCH FROM (t.first_response_at - t.created_at)) / 60), 0) as avg_response_time
  FROM profiles p
  JOIN user_role_assignments ura ON ura.user_id = p.id
  JOIN roles r ON r.id = ura.role_id
  LEFT JOIN tickets t ON t.assigned_to = p.id
  WHERE r.code = 'admin'
    AND r.is_active = true
    AND p.deleted_at IS NULL
  GROUP BY p.id, p.full_name;
END;
$$;

-- Fix assign_team_task
CREATE OR REPLACE FUNCTION public.assign_team_task(
  p_task_id uuid,
  p_assignee_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_valid_assignee boolean;
BEGIN
  -- Check if assignee has appropriate role
  SELECT EXISTS (
    SELECT 1 FROM user_role_assignments ura
    JOIN roles r ON r.id = ura.role_id
    WHERE ura.user_id = p_assignee_id
      AND r.code IN ('admin', 'hsse_expert', 'hsse_manager', 'department_representative')
      AND r.is_active = true
  ) INTO v_is_valid_assignee;
  
  IF NOT v_is_valid_assignee THEN
    RAISE EXCEPTION 'Invalid assignee: user does not have required role';
  END IF;
  
  -- Perform assignment (assuming a tasks table exists)
  UPDATE tasks SET assigned_to = p_assignee_id WHERE id = p_task_id;
  
  RETURN true;
END;
$$;

-- Fix can_view_pii
CREATE OR REPLACE FUNCTION public.can_view_pii(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_role_assignments ura
    JOIN roles r ON r.id = ura.role_id
    WHERE ura.user_id = p_user_id
      AND r.code IN ('admin', 'super_admin', 'hsse_manager', 'hr_manager')
      AND r.is_active = true
  );
END;
$$;

-- ============================================================
-- PHASE 2: Workflow Functions with Full Rewrites
-- ============================================================

-- Fix hsse_validate_incident_closure (was using profiles.role)
CREATE OR REPLACE FUNCTION public.hsse_validate_incident_closure(
  p_incident_id uuid,
  p_decision text,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_has_hsse_role boolean;
  v_incident record;
  v_result jsonb;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  
  -- Check HSSE role using normalized structure
  SELECT EXISTS (
    SELECT 1 FROM user_role_assignments ura
    JOIN roles r ON r.id = ura.role_id
    WHERE ura.user_id = v_user_id
      AND r.code IN ('hsse_manager', 'admin', 'super_admin', 'hsse_expert')
      AND r.is_active = true
  ) INTO v_has_hsse_role;
  
  IF NOT v_has_hsse_role THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient permissions');
  END IF;
  
  -- Get incident
  SELECT * INTO v_incident FROM incidents WHERE id = p_incident_id AND deleted_at IS NULL;
  IF v_incident IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Incident not found');
  END IF;
  
  -- Process decision
  IF p_decision = 'approve' THEN
    UPDATE incidents 
    SET status = 'closed',
        closed_at = now(),
        closed_by = v_user_id,
        closure_notes = COALESCE(p_notes, closure_notes)
    WHERE id = p_incident_id;
    
    -- Log audit
    INSERT INTO incident_audit_logs (incident_id, action, actor_id, old_value, new_value, tenant_id)
    VALUES (
      p_incident_id,
      'closure_approved',
      v_user_id,
      jsonb_build_object('status', v_incident.status),
      jsonb_build_object('status', 'closed', 'notes', p_notes),
      v_incident.tenant_id
    );
    
    v_result := jsonb_build_object('success', true, 'status', 'closed');
  ELSIF p_decision = 'reject' THEN
    UPDATE incidents 
    SET status = 'closure_rejected',
        closure_notes = COALESCE(p_notes, closure_notes)
    WHERE id = p_incident_id;
    
    -- Log audit
    INSERT INTO incident_audit_logs (incident_id, action, actor_id, old_value, new_value, tenant_id)
    VALUES (
      p_incident_id,
      'closure_rejected',
      v_user_id,
      jsonb_build_object('status', v_incident.status),
      jsonb_build_object('status', 'closure_rejected', 'notes', p_notes),
      v_incident.tenant_id
    );
    
    v_result := jsonb_build_object('success', true, 'status', 'closure_rejected');
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Invalid decision');
  END IF;
  
  RETURN v_result;
END;
$$;

-- Fix hsse_validate_observation_closure
CREATE OR REPLACE FUNCTION public.hsse_validate_observation_closure(
  p_incident_id uuid,
  p_decision text,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_has_hsse_role boolean;
  v_incident record;
  v_result jsonb;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  
  -- Check HSSE role using normalized structure
  SELECT EXISTS (
    SELECT 1 FROM user_role_assignments ura
    JOIN roles r ON r.id = ura.role_id
    WHERE ura.user_id = v_user_id
      AND r.code IN ('hsse_manager', 'admin', 'super_admin', 'hsse_expert')
      AND r.is_active = true
  ) INTO v_has_hsse_role;
  
  IF NOT v_has_hsse_role THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient permissions');
  END IF;
  
  -- Get incident/observation
  SELECT * INTO v_incident FROM incidents WHERE id = p_incident_id AND deleted_at IS NULL;
  IF v_incident IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Observation not found');
  END IF;
  
  -- Process decision
  IF p_decision = 'approve' THEN
    UPDATE incidents 
    SET status = 'closed',
        closed_at = now(),
        closed_by = v_user_id,
        closure_notes = COALESCE(p_notes, closure_notes)
    WHERE id = p_incident_id;
    
    -- Log audit with correct column names
    INSERT INTO incident_audit_logs (incident_id, action, actor_id, old_value, new_value, tenant_id)
    VALUES (
      p_incident_id,
      'observation_closure_approved',
      v_user_id,
      jsonb_build_object('status', v_incident.status),
      jsonb_build_object('status', 'closed', 'notes', p_notes),
      v_incident.tenant_id
    );
    
    v_result := jsonb_build_object('success', true, 'status', 'closed');
  ELSIF p_decision = 'reject' THEN
    UPDATE incidents 
    SET status = 'pending_action_completion',
        closure_notes = COALESCE(p_notes, closure_notes)
    WHERE id = p_incident_id;
    
    -- Log audit with correct column names
    INSERT INTO incident_audit_logs (incident_id, action, actor_id, old_value, new_value, tenant_id)
    VALUES (
      p_incident_id,
      'observation_closure_rejected',
      v_user_id,
      jsonb_build_object('status', v_incident.status),
      jsonb_build_object('status', 'pending_action_completion', 'notes', p_notes),
      v_incident.tenant_id
    );
    
    v_result := jsonb_build_object('success', true, 'status', 'pending_action_completion');
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Invalid decision');
  END IF;
  
  RETURN v_result;
END;
$$;

-- Fix dept_rep_reject_observation (remove ur.deleted_at)
CREATE OR REPLACE FUNCTION public.dept_rep_reject_observation(
  p_incident_id uuid,
  p_rejection_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_has_role boolean;
  v_incident record;
  v_tenant_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  
  -- Get incident
  SELECT * INTO v_incident FROM incidents WHERE id = p_incident_id AND deleted_at IS NULL;
  IF v_incident IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Observation not found');
  END IF;
  
  v_tenant_id := v_incident.tenant_id;
  
  -- Check role using normalized structure (NO deleted_at on ura)
  SELECT EXISTS (
    SELECT 1 FROM user_role_assignments ura
    JOIN roles r ON r.id = ura.role_id
    WHERE ura.user_id = v_user_id
      AND ura.tenant_id = v_tenant_id
      AND r.code IN ('department_representative', 'admin', 'hsse_manager')
      AND r.is_active = true
  ) INTO v_has_role;
  
  IF NOT v_has_role THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient permissions');
  END IF;
  
  -- Update incident
  UPDATE incidents 
  SET status = 'rejected_by_dept_rep',
      rejection_reason = p_rejection_reason,
      rejected_by = v_user_id,
      rejected_at = now()
  WHERE id = p_incident_id;
  
  -- Log audit with correct column names
  INSERT INTO incident_audit_logs (incident_id, action, actor_id, old_value, new_value, tenant_id)
  VALUES (
    p_incident_id,
    'dept_rep_rejected',
    v_user_id,
    jsonb_build_object('status', v_incident.status),
    jsonb_build_object('status', 'rejected_by_dept_rep', 'reason', p_rejection_reason),
    v_tenant_id
  );
  
  RETURN jsonb_build_object('success', true, 'status', 'rejected_by_dept_rep');
END;
$$;

-- Fix process_dept_manager_incident_approval
CREATE OR REPLACE FUNCTION public.process_dept_manager_incident_approval(
  p_incident_id uuid,
  p_decision text,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_has_role boolean;
  v_incident record;
  v_new_status text;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  
  -- Get incident
  SELECT * INTO v_incident FROM incidents WHERE id = p_incident_id AND deleted_at IS NULL;
  IF v_incident IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Incident not found');
  END IF;
  
  -- Check role using normalized structure
  SELECT EXISTS (
    SELECT 1 FROM user_role_assignments ura
    JOIN roles r ON r.id = ura.role_id
    WHERE ura.user_id = v_user_id
      AND r.code IN ('department_manager', 'security_manager', 'admin', 'hsse_manager')
      AND r.is_active = true
  ) INTO v_has_role;
  
  IF NOT v_has_role THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient permissions');
  END IF;
  
  -- Process decision
  IF p_decision = 'approve' THEN
    v_new_status := 'pending_hsse_screening';
    UPDATE incidents 
    SET status = v_new_status,
        manager_approved_at = now(),
        manager_approved_by = v_user_id,
        manager_notes = COALESCE(p_notes, manager_notes)
    WHERE id = p_incident_id;
  ELSIF p_decision = 'reject' THEN
    v_new_status := 'rejected_by_manager';
    UPDATE incidents 
    SET status = v_new_status,
        rejection_reason = p_notes,
        rejected_by = v_user_id,
        rejected_at = now()
    WHERE id = p_incident_id;
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Invalid decision');
  END IF;
  
  -- Log audit with correct column names
  INSERT INTO incident_audit_logs (incident_id, action, actor_id, old_value, new_value, tenant_id)
  VALUES (
    p_incident_id,
    CASE WHEN p_decision = 'approve' THEN 'manager_approved' ELSE 'manager_rejected' END,
    v_user_id,
    jsonb_build_object('status', v_incident.status),
    jsonb_build_object('status', v_new_status, 'notes', p_notes),
    v_incident.tenant_id
  );
  
  RETURN jsonb_build_object('success', true, 'status', v_new_status);
END;
$$;

-- Fix submit_clinic_review
CREATE OR REPLACE FUNCTION public.submit_clinic_review(
  p_incident_id uuid,
  p_review_notes text,
  p_injury_confirmed boolean DEFAULT NULL,
  p_injury_classification text DEFAULT NULL,
  p_treatment_provided text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_has_role boolean;
  v_incident record;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  
  -- Get incident
  SELECT * INTO v_incident FROM incidents WHERE id = p_incident_id AND deleted_at IS NULL;
  IF v_incident IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Incident not found');
  END IF;
  
  -- Check role using normalized structure
  SELECT EXISTS (
    SELECT 1 FROM user_role_assignments ura
    JOIN roles r ON r.id = ura.role_id
    WHERE ura.user_id = v_user_id
      AND r.code IN ('clinic_staff', 'medical_officer', 'admin', 'hsse_manager')
      AND r.is_active = true
  ) INTO v_has_role;
  
  IF NOT v_has_role THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient permissions');
  END IF;
  
  -- Update incident with clinic review
  UPDATE incidents 
  SET status = 'pending_hsse_screening',
      clinic_reviewed_at = now(),
      clinic_reviewed_by = v_user_id,
      clinic_notes = p_review_notes,
      injury_confirmed = COALESCE(p_injury_confirmed, injury_confirmed),
      injury_classification = COALESCE(p_injury_classification, injury_classification),
      treatment_provided = COALESCE(p_treatment_provided, treatment_provided)
  WHERE id = p_incident_id;
  
  -- Log audit with correct column names
  INSERT INTO incident_audit_logs (incident_id, action, actor_id, old_value, new_value, tenant_id)
  VALUES (
    p_incident_id,
    'clinic_reviewed',
    v_user_id,
    jsonb_build_object('status', v_incident.status),
    jsonb_build_object('status', 'pending_hsse_screening', 'notes', p_review_notes),
    v_incident.tenant_id
  );
  
  RETURN jsonb_build_object('success', true, 'status', 'pending_hsse_screening');
END;
$$;

-- Fix assign_investigation_team
CREATE OR REPLACE FUNCTION public.assign_investigation_team(
  p_incident_id uuid,
  p_investigator_id uuid,
  p_team_members uuid[] DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_has_role boolean;
  v_incident record;
  v_investigation_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  
  -- Get incident
  SELECT * INTO v_incident FROM incidents WHERE id = p_incident_id AND deleted_at IS NULL;
  IF v_incident IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Incident not found');
  END IF;
  
  -- Check role using normalized structure
  SELECT EXISTS (
    SELECT 1 FROM user_role_assignments ura
    JOIN roles r ON r.id = ura.role_id
    WHERE ura.user_id = v_user_id
      AND r.code IN ('hsse_manager', 'admin', 'super_admin')
      AND r.is_active = true
  ) INTO v_has_role;
  
  IF NOT v_has_role THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient permissions');
  END IF;
  
  -- Create or update investigation
  INSERT INTO investigations (incident_id, investigator_id, assigned_by, tenant_id, branch_id)
  VALUES (p_incident_id, p_investigator_id, v_user_id, v_incident.tenant_id, v_incident.branch_id)
  ON CONFLICT (incident_id) 
  DO UPDATE SET investigator_id = p_investigator_id, assigned_by = v_user_id, updated_at = now()
  RETURNING id INTO v_investigation_id;
  
  -- Update incident status
  UPDATE incidents 
  SET status = 'under_investigation'
  WHERE id = p_incident_id;
  
  -- Log audit with correct column names
  INSERT INTO incident_audit_logs (incident_id, action, actor_id, old_value, new_value, tenant_id)
  VALUES (
    p_incident_id,
    'investigation_assigned',
    v_user_id,
    jsonb_build_object('status', v_incident.status),
    jsonb_build_object('status', 'under_investigation', 'investigator_id', p_investigator_id),
    v_incident.tenant_id
  );
  
  RETURN jsonb_build_object('success', true, 'investigation_id', v_investigation_id);
END;
$$;

-- Fix hsse_review_rejection (if exists)
CREATE OR REPLACE FUNCTION public.hsse_review_rejection(
  p_incident_id uuid,
  p_decision text,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_has_role boolean;
  v_incident record;
  v_new_status text;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  
  -- Get incident
  SELECT * INTO v_incident FROM incidents WHERE id = p_incident_id AND deleted_at IS NULL;
  IF v_incident IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Incident not found');
  END IF;
  
  -- Check role using normalized structure
  SELECT EXISTS (
    SELECT 1 FROM user_role_assignments ura
    JOIN roles r ON r.id = ura.role_id
    WHERE ura.user_id = v_user_id
      AND r.code IN ('hsse_manager', 'hsse_expert', 'admin')
      AND r.is_active = true
  ) INTO v_has_role;
  
  IF NOT v_has_role THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient permissions');
  END IF;
  
  -- Process decision
  IF p_decision = 'uphold' THEN
    v_new_status := 'closed_rejected';
  ELSIF p_decision = 'overturn' THEN
    v_new_status := 'pending_dept_rep_approval';
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Invalid decision');
  END IF;
  
  UPDATE incidents 
  SET status = v_new_status,
      hsse_review_notes = p_notes,
      hsse_reviewed_by = v_user_id,
      hsse_reviewed_at = now()
  WHERE id = p_incident_id;
  
  -- Log audit with correct column names
  INSERT INTO incident_audit_logs (incident_id, action, actor_id, old_value, new_value, tenant_id)
  VALUES (
    p_incident_id,
    'hsse_rejection_reviewed',
    v_user_id,
    jsonb_build_object('status', v_incident.status),
    jsonb_build_object('status', v_new_status, 'decision', p_decision, 'notes', p_notes),
    v_incident.tenant_id
  );
  
  RETURN jsonb_build_object('success', true, 'status', v_new_status);
END;
$$;