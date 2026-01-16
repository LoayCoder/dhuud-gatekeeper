-- Phase 2: Database Functions for Incident Workflow

-- 2.1 Update process_dept_rep_incident_decision to route based on severity
CREATE OR REPLACE FUNCTION public.process_dept_rep_incident_decision(
  _incident_id UUID,
  _user_id UUID,
  _decision TEXT,
  _justification TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _can_review BOOLEAN;
  _new_status incident_status;
  _severity TEXT;
  _severity_level INTEGER;
BEGIN
  -- Validate decision
  IF _decision NOT IN ('approved', 'rejected') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid decision. Must be approved or rejected.');
  END IF;
  
  -- Validate justification length
  IF _justification IS NULL OR char_length(_justification) < 10 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Justification is required and must be at least 10 characters.');
  END IF;
  
  -- Check if user can review
  SELECT can_review_dept_rep_incident(_user_id, _incident_id) INTO _can_review;
  
  IF NOT _can_review THEN
    RETURN jsonb_build_object('success', false, 'error', 'User is not authorized to review this incident.');
  END IF;
  
  -- Get severity (using severity_v2 which is like 'Level 1', 'Level 2', etc.)
  SELECT severity_v2 INTO _severity FROM incidents WHERE id = _incident_id;
  
  -- Extract numeric level from severity_v2 (e.g., 'Level 3' -> 3)
  _severity_level := COALESCE(
    NULLIF(regexp_replace(_severity, '[^0-9]', '', 'g'), '')::INTEGER,
    1
  );
  
  -- Determine new status based on decision AND severity
  IF _decision = 'approved' THEN
    -- Level 1-2: Go directly to HSSE Expert for investigator assignment
    -- Level 3-5: Go to Department Manager first
    IF _severity_level <= 2 THEN
      _new_status := 'pending_expert_screening';
    ELSE
      _new_status := 'pending_department_manager_approval';
    END IF;
  ELSE
    _new_status := 'hsse_manager_escalation';
  END IF;
  
  -- Update incident
  UPDATE incidents
  SET 
    status = _new_status,
    dept_rep_decision = _decision,
    dept_rep_justification = _justification,
    dept_rep_reviewed_at = now(),
    dept_rep_reviewer_id = _user_id,
    updated_at = now()
  WHERE id = _incident_id;
  
  -- Log audit trail
  INSERT INTO incident_audit_logs (
    incident_id,
    action_type,
    performed_by,
    details,
    tenant_id
  )
  SELECT 
    _incident_id,
    CASE WHEN _decision = 'approved' THEN 'dept_rep_incident_approved' ELSE 'dept_rep_incident_rejected' END,
    _user_id,
    jsonb_build_object(
      'decision', _decision,
      'justification', _justification,
      'severity_level', _severity_level,
      'new_status', _new_status::text
    ),
    i.tenant_id
  FROM incidents i WHERE i.id = _incident_id;
  
  RETURN jsonb_build_object('success', true, 'new_status', _new_status::text, 'severity_level', _severity_level);
END;
$$;

-- 2.2 Function to process Department Manager incident approval
CREATE OR REPLACE FUNCTION public.process_dept_manager_incident_approval(
  _incident_id UUID,
  _user_id UUID,
  _decision TEXT,
  _notes TEXT DEFAULT NULL,
  _updated_description TEXT DEFAULT NULL,
  _updated_initial_actions TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _can_approve BOOLEAN;
  _new_status incident_status;
  _incident_dept_id UUID;
  _manager_dept_id UUID;
  _has_injuries BOOLEAN;
BEGIN
  -- Validate decision
  IF _decision NOT IN ('approved', 'rejected') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid decision. Must be approved or rejected.');
  END IF;
  
  -- Check if incident is in correct status
  IF NOT EXISTS (
    SELECT 1 FROM incidents 
    WHERE id = _incident_id 
    AND status = 'pending_department_manager_approval'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Incident is not pending department manager approval.');
  END IF;
  
  -- Get incident department (from reporter)
  SELECT p.assigned_department_id INTO _incident_dept_id
  FROM incidents i
  JOIN profiles p ON i.reporter_id = p.id
  WHERE i.id = _incident_id;
  
  -- Get manager's department
  SELECT assigned_department_id INTO _manager_dept_id
  FROM profiles WHERE id = _user_id;
  
  -- Check if user is department manager (security_manager role) for the same department
  SELECT EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = _user_id
    AND ur.role IN ('security_manager'::app_role, 'admin'::app_role)
  ) AND (_manager_dept_id = _incident_dept_id OR EXISTS (
    SELECT 1 FROM user_roles ur WHERE ur.user_id = _user_id AND ur.role = 'admin'::app_role
  ))
  INTO _can_approve;
  
  IF NOT _can_approve THEN
    RETURN jsonb_build_object('success', false, 'error', 'User is not authorized to approve this incident.');
  END IF;
  
  -- Check if incident has injuries requiring medical attention
  SELECT EXISTS (
    SELECT 1 FROM incident_injuries ii
    WHERE ii.incident_id = _incident_id
    AND ii.first_aid_given = true
    AND ii.deleted_at IS NULL
  ) INTO _has_injuries;
  
  -- Determine new status based on decision
  IF _decision = 'approved' THEN
    -- If has injuries requiring clinic review, route to clinic first
    IF _has_injuries THEN
      _new_status := 'pending_clinic_review';
    ELSE
      _new_status := 'pending_expert_screening';
    END IF;
  ELSE
    _new_status := 'hsse_manager_escalation';
  END IF;
  
  -- Update incident with optional edits
  UPDATE incidents
  SET 
    status = _new_status,
    dept_manager_approved_at = CASE WHEN _decision = 'approved' THEN now() ELSE NULL END,
    dept_manager_approved_by = CASE WHEN _decision = 'approved' THEN _user_id ELSE NULL END,
    dept_manager_notes = _notes,
    description = COALESCE(_updated_description, description),
    clinic_review_required = _has_injuries,
    updated_at = now()
  WHERE id = _incident_id;
  
  -- Log audit trail
  INSERT INTO incident_audit_logs (
    incident_id,
    action_type,
    performed_by,
    details,
    tenant_id
  )
  SELECT 
    _incident_id,
    CASE WHEN _decision = 'approved' THEN 'dept_manager_approved' ELSE 'dept_manager_rejected' END,
    _user_id,
    jsonb_build_object(
      'decision', _decision,
      'notes', _notes,
      'has_injuries', _has_injuries,
      'routed_to_clinic', _has_injuries AND _decision = 'approved',
      'new_status', _new_status::text
    ),
    i.tenant_id
  FROM incidents i WHERE i.id = _incident_id;
  
  RETURN jsonb_build_object(
    'success', true, 
    'new_status', _new_status::text,
    'routed_to_clinic', _has_injuries AND _decision = 'approved'
  );
END;
$$;

-- 2.3 Function to check if user can review as Department Manager
CREATE OR REPLACE FUNCTION public.can_review_as_dept_manager(
  _user_id UUID,
  _incident_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _incident_dept_id UUID;
  _manager_dept_id UUID;
BEGIN
  -- Check if incident is in correct status
  IF NOT EXISTS (
    SELECT 1 FROM incidents 
    WHERE id = _incident_id 
    AND status = 'pending_department_manager_approval'
  ) THEN
    RETURN false;
  END IF;
  
  -- Get incident department (from reporter)
  SELECT p.assigned_department_id INTO _incident_dept_id
  FROM incidents i
  JOIN profiles p ON i.reporter_id = p.id
  WHERE i.id = _incident_id;
  
  -- Get manager's department
  SELECT assigned_department_id INTO _manager_dept_id
  FROM profiles WHERE id = _user_id;
  
  -- Check if user is department manager (security_manager role) for the same department OR admin
  RETURN EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = _user_id
    AND ur.role IN ('security_manager'::app_role, 'admin'::app_role)
  ) AND (_manager_dept_id = _incident_dept_id OR EXISTS (
    SELECT 1 FROM user_roles ur WHERE ur.user_id = _user_id AND ur.role = 'admin'::app_role
  ));
END;
$$;

-- 2.4 Function to submit clinic review
CREATE OR REPLACE FUNCTION public.submit_clinic_review(
  _incident_id UUID,
  _user_id UUID,
  _notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _can_review BOOLEAN;
BEGIN
  -- Check if incident is in correct status
  IF NOT EXISTS (
    SELECT 1 FROM incidents 
    WHERE id = _incident_id 
    AND status = 'pending_clinic_review'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Incident is not pending clinic review.');
  END IF;
  
  -- Check if user has clinic_team role or is admin
  SELECT EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = _user_id
    AND ur.role IN ('admin'::app_role)
  ) OR EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = _user_id
    AND p.job_title ILIKE '%clinic%' OR p.job_title ILIKE '%doctor%' OR p.job_title ILIKE '%medical%'
  ) INTO _can_review;
  
  IF NOT _can_review THEN
    RETURN jsonb_build_object('success', false, 'error', 'User is not authorized to perform clinic review.');
  END IF;
  
  -- Update incident
  UPDATE incidents
  SET 
    status = 'pending_expert_screening',
    clinic_reviewed_at = now(),
    clinic_reviewed_by = _user_id,
    clinic_review_notes = _notes,
    updated_at = now()
  WHERE id = _incident_id;
  
  -- Log audit trail
  INSERT INTO incident_audit_logs (
    incident_id,
    action_type,
    performed_by,
    details,
    tenant_id
  )
  SELECT 
    _incident_id,
    'clinic_review_completed',
    _user_id,
    jsonb_build_object('notes', _notes),
    i.tenant_id
  FROM incidents i WHERE i.id = _incident_id;
  
  RETURN jsonb_build_object('success', true, 'new_status', 'pending_expert_screening');
END;
$$;

-- 2.5 Function to assign investigation team
CREATE OR REPLACE FUNCTION public.assign_investigation_team(
  _incident_id UUID,
  _user_id UUID,
  _investigation_type TEXT,
  _investigator_id UUID DEFAULT NULL,
  _team_leader_id UUID DEFAULT NULL,
  _team_member_ids UUID[] DEFAULT NULL,
  _assignment_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _tenant_id UUID;
  _severity_level INTEGER;
  _severity TEXT;
BEGIN
  -- Validate investigation type
  IF _investigation_type NOT IN ('single', 'team') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid investigation type. Must be single or team.');
  END IF;
  
  -- Get tenant_id and severity
  SELECT i.tenant_id, i.severity_v2 
  INTO _tenant_id, _severity
  FROM incidents i WHERE i.id = _incident_id;
  
  IF _tenant_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Incident not found.');
  END IF;
  
  -- Extract severity level
  _severity_level := COALESCE(
    NULLIF(regexp_replace(_severity, '[^0-9]', '', 'g'), '')::INTEGER,
    1
  );
  
  -- Validate: Level 4-5 MUST be team investigation
  IF _severity_level >= 4 AND _investigation_type = 'single' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Level 4 and Level 5 incidents require team investigation.');
  END IF;
  
  -- Validate based on type
  IF _investigation_type = 'single' THEN
    IF _investigator_id IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'Investigator ID is required for single investigation.');
    END IF;
  ELSE
    IF _team_leader_id IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'Team leader is required for team investigation.');
    END IF;
    IF _team_member_ids IS NULL OR array_length(_team_member_ids, 1) < 1 THEN
      RETURN jsonb_build_object('success', false, 'error', 'At least one team member is required for team investigation.');
    END IF;
  END IF;
  
  -- Update incident status
  UPDATE incidents
  SET 
    status = 'investigation_in_progress',
    updated_at = now()
  WHERE id = _incident_id;
  
  -- Create or update investigation record
  INSERT INTO investigations (
    incident_id,
    tenant_id,
    investigator_id,
    investigation_type,
    team_leader_id,
    team_member_ids,
    assigned_at,
    assigned_by,
    assignment_notes
  )
  VALUES (
    _incident_id,
    _tenant_id,
    COALESCE(_investigator_id, _team_leader_id),
    _investigation_type,
    _team_leader_id,
    _team_member_ids,
    now(),
    _user_id,
    _assignment_notes
  )
  ON CONFLICT (incident_id) 
  DO UPDATE SET
    investigator_id = COALESCE(_investigator_id, _team_leader_id),
    investigation_type = _investigation_type,
    team_leader_id = _team_leader_id,
    team_member_ids = _team_member_ids,
    assigned_at = now(),
    assigned_by = _user_id,
    assignment_notes = _assignment_notes,
    updated_at = now();
  
  -- Log audit trail
  INSERT INTO incident_audit_logs (
    incident_id,
    action_type,
    performed_by,
    details,
    tenant_id
  )
  VALUES (
    _incident_id,
    'investigation_team_assigned',
    _user_id,
    jsonb_build_object(
      'investigation_type', _investigation_type,
      'investigator_id', _investigator_id,
      'team_leader_id', _team_leader_id,
      'team_member_ids', _team_member_ids,
      'severity_level', _severity_level
    ),
    _tenant_id
  );
  
  RETURN jsonb_build_object(
    'success', true, 
    'investigation_type', _investigation_type,
    'severity_level', _severity_level
  );
END;
$$;

-- 2.6 Function to assign a team task
CREATE OR REPLACE FUNCTION public.assign_team_task(
  _investigation_id UUID,
  _user_id UUID,
  _assigned_to UUID,
  _task_type TEXT,
  _task_description TEXT,
  _target_area TEXT DEFAULT NULL,
  _due_date DATE DEFAULT NULL,
  _priority TEXT DEFAULT 'medium'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _tenant_id UUID;
  _branch_id UUID;
  _is_authorized BOOLEAN;
  _new_task_id UUID;
BEGIN
  -- Check if user is team leader or has HSSE role
  SELECT i.tenant_id, inc.branch_id,
    (i.team_leader_id = _user_id) OR EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = _user_id
      AND ur.role IN ('admin'::app_role, 'hsse_expert'::app_role, 'security_manager'::app_role)
    )
  INTO _tenant_id, _branch_id, _is_authorized
  FROM investigations i
  JOIN incidents inc ON i.incident_id = inc.id
  WHERE i.id = _investigation_id;
  
  IF NOT _is_authorized THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only team leader or HSSE can assign tasks.');
  END IF;
  
  -- Create the task
  INSERT INTO investigation_team_tasks (
    tenant_id,
    branch_id,
    investigation_id,
    assigned_to,
    assigned_by,
    task_type,
    task_description,
    target_area,
    due_date,
    priority
  )
  VALUES (
    _tenant_id,
    _branch_id,
    _investigation_id,
    _assigned_to,
    _user_id,
    _task_type,
    _task_description,
    _target_area,
    _due_date,
    _priority
  )
  RETURNING id INTO _new_task_id;
  
  RETURN jsonb_build_object('success', true, 'task_id', _new_task_id);
END;
$$;

-- 2.7 Function to complete a team task
CREATE OR REPLACE FUNCTION public.complete_team_task(
  _task_id UUID,
  _user_id UUID,
  _completion_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user is assigned to this task or is team leader
  IF NOT EXISTS (
    SELECT 1 FROM investigation_team_tasks t
    LEFT JOIN investigations i ON t.investigation_id = i.id
    WHERE t.id = _task_id
    AND (t.assigned_to = _user_id OR i.team_leader_id = _user_id)
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'User is not authorized to complete this task.');
  END IF;
  
  -- Update the task
  UPDATE investigation_team_tasks
  SET 
    status = 'completed',
    completion_notes = _completion_notes,
    completed_at = now(),
    updated_at = now()
  WHERE id = _task_id;
  
  RETURN jsonb_build_object('success', true);
END;
$$;

-- 2.8 Function to check if user can perform clinic review
CREATE OR REPLACE FUNCTION public.can_perform_clinic_review(
  _user_id UUID,
  _incident_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if incident is in correct status
  IF NOT EXISTS (
    SELECT 1 FROM incidents 
    WHERE id = _incident_id 
    AND status = 'pending_clinic_review'
  ) THEN
    RETURN false;
  END IF;
  
  -- Check if user is admin or has clinic/medical role
  RETURN EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = _user_id
    AND ur.role = 'admin'::app_role
  ) OR EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = _user_id
    AND (p.job_title ILIKE '%clinic%' OR p.job_title ILIKE '%doctor%' OR p.job_title ILIKE '%medical%' OR p.job_title ILIKE '%nurse%')
  );
END;
$$;