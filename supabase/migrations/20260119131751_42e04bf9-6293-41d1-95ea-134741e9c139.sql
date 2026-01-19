-- =====================================================
-- SCHEMA CLEANUP BATCH 2: Drop and Recreate Non-RLS-Dependent Functions
-- =====================================================

-- These functions don't have RLS policies depending on them, so we can DROP CASCADE

-- Drop assign_team_task (no RLS dependencies)
DROP FUNCTION IF EXISTS public.assign_team_task(uuid, uuid, uuid, text, text, text, date, text) CASCADE;

-- Recreate assign_team_task with correct role check
CREATE OR REPLACE FUNCTION public.assign_team_task(
  p_task_id uuid,
  p_assignee_id uuid,
  p_assigned_by uuid,
  p_task_type text,
  p_priority text,
  p_description text,
  p_due_date date,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id uuid;
  v_can_assign boolean := false;
BEGIN
  -- Check if user can assign using correct schema
  SELECT EXISTS (
    SELECT 1 FROM user_role_assignments ura
    JOIN roles r ON r.id = ura.role_id
    WHERE ura.user_id = p_assigned_by
      AND r.code IN ('admin', 'hsse_manager', 'department_manager', 'team_lead')
      AND r.is_active = true
  ) INTO v_can_assign;
  
  IF NOT v_can_assign THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient permissions to assign tasks');
  END IF;
  
  SELECT tenant_id INTO v_tenant_id FROM profiles WHERE id = p_assigned_by AND deleted_at IS NULL;
  
  RETURN jsonb_build_object(
    'success', true,
    'task_id', p_task_id,
    'assignee_id', p_assignee_id
  );
END;
$$;

-- Drop dept_rep_reject_observation (no RLS dependencies)
DROP FUNCTION IF EXISTS public.dept_rep_reject_observation(uuid, uuid, text) CASCADE;

-- Recreate dept_rep_reject_observation with correct schema
CREATE OR REPLACE FUNCTION public.dept_rep_reject_observation(
  p_incident_id uuid,
  p_user_id uuid,
  p_rejection_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id uuid;
  v_branch_id uuid;
  v_old_status text;
  v_can_reject boolean := false;
BEGIN
  SELECT tenant_id, branch_id, status INTO v_tenant_id, v_branch_id, v_old_status
  FROM incidents WHERE id = p_incident_id AND deleted_at IS NULL;
  
  IF v_tenant_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Observation not found');
  END IF;
  
  -- Check role using CORRECT schema
  SELECT EXISTS (
    SELECT 1 FROM user_role_assignments ura
    JOIN roles r ON r.id = ura.role_id
    WHERE ura.user_id = p_user_id
      AND r.code = 'department_representative'
      AND r.is_active = true
  ) INTO v_can_reject;
  
  IF NOT v_can_reject THEN
    RETURN jsonb_build_object('success', false, 'error', 'User is not a department representative');
  END IF;
  
  UPDATE incidents SET
    status = 'rejected_by_dept_rep',
    rejection_reason = p_rejection_reason,
    rejected_by = p_user_id,
    rejected_at = now(),
    updated_at = now()
  WHERE id = p_incident_id;
  
  INSERT INTO audit_logs (tenant_id, branch_id, action, actor_id, entity_type, entity_id, old_value, new_value)
  VALUES (v_tenant_id, v_branch_id, 'dept_rep_rejection', p_user_id, 'incident', p_incident_id,
    jsonb_build_object('status', v_old_status),
    jsonb_build_object('status', 'rejected_by_dept_rep', 'reason', p_rejection_reason));
  
  RETURN jsonb_build_object('success', true, 'incident_id', p_incident_id, 'new_status', 'rejected_by_dept_rep');
END;
$$;

-- Drop can_view_pii (no RLS dependencies)
DROP FUNCTION IF EXISTS public.can_view_pii(uuid, uuid) CASCADE;

-- Recreate can_view_pii with correct schema
CREATE OR REPLACE FUNCTION public.can_view_pii(p_user_id uuid, p_target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_user_id = p_target_user_id THEN RETURN true; END IF;
  
  RETURN EXISTS (
    SELECT 1 FROM user_role_assignments ura
    JOIN roles r ON r.id = ura.role_id
    WHERE ura.user_id = p_user_id
      AND r.code IN ('admin', 'super_admin', 'hsse_manager', 'hr_manager')
      AND r.is_active = true
  );
END;
$$;

-- Drop submit_clinic_review (no RLS dependencies)
DROP FUNCTION IF EXISTS public.submit_clinic_review(uuid, uuid, text) CASCADE;

-- Recreate submit_clinic_review with correct schema
CREATE OR REPLACE FUNCTION public.submit_clinic_review(
  p_incident_id uuid,
  p_user_id uuid,
  p_review_notes text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id uuid;
  v_branch_id uuid;
  v_old_status text;
  v_can_review boolean := false;
BEGIN
  SELECT tenant_id, branch_id, status INTO v_tenant_id, v_branch_id, v_old_status
  FROM incidents WHERE id = p_incident_id AND deleted_at IS NULL;
  
  IF v_tenant_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Incident not found');
  END IF;
  
  SELECT EXISTS (
    SELECT 1 FROM user_role_assignments ura
    JOIN roles r ON r.id = ura.role_id
    WHERE ura.user_id = p_user_id
      AND r.code IN ('clinic_staff', 'medical_officer', 'hsse_manager', 'admin')
      AND r.is_active = true
  ) INTO v_can_review;
  
  IF NOT v_can_review THEN
    RETURN jsonb_build_object('success', false, 'error', 'User cannot perform clinic review');
  END IF;
  
  UPDATE incidents SET
    status = 'clinic_reviewed',
    clinic_review_notes = p_review_notes,
    clinic_reviewed_by = p_user_id,
    clinic_reviewed_at = now(),
    updated_at = now()
  WHERE id = p_incident_id;
  
  INSERT INTO audit_logs (tenant_id, branch_id, action, actor_id, entity_type, entity_id, old_value, new_value)
  VALUES (v_tenant_id, v_branch_id, 'clinic_review_submitted', p_user_id, 'incident', p_incident_id,
    jsonb_build_object('status', v_old_status),
    jsonb_build_object('status', 'clinic_reviewed', 'notes', p_review_notes));
  
  RETURN jsonb_build_object('success', true, 'incident_id', p_incident_id, 'new_status', 'clinic_reviewed');
END;
$$;

-- Drop hsse_validate_observation_closure (no RLS dependencies)
DROP FUNCTION IF EXISTS public.hsse_validate_observation_closure(uuid, uuid, text, text) CASCADE;

-- Recreate hsse_validate_observation_closure with correct schema
CREATE OR REPLACE FUNCTION public.hsse_validate_observation_closure(
  p_incident_id uuid,
  p_user_id uuid,
  p_validation_notes text,
  p_decision text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id uuid;
  v_branch_id uuid;
  v_old_status text;
  v_new_status text;
  v_can_validate boolean := false;
BEGIN
  SELECT tenant_id, branch_id, status INTO v_tenant_id, v_branch_id, v_old_status
  FROM incidents WHERE id = p_incident_id AND deleted_at IS NULL;
  
  IF v_tenant_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Observation not found');
  END IF;
  
  SELECT EXISTS (
    SELECT 1 FROM user_role_assignments ura
    JOIN roles r ON r.id = ura.role_id
    WHERE ura.user_id = p_user_id
      AND r.code IN ('hsse_manager', 'hsse_officer', 'admin', 'super_admin')
      AND r.is_active = true
  ) INTO v_can_validate;
  
  IF NOT v_can_validate THEN
    RETURN jsonb_build_object('success', false, 'error', 'User cannot validate observation closure');
  END IF;
  
  IF p_decision = 'approve' THEN
    v_new_status := 'closed';
  ELSE
    v_new_status := 'closure_rejected';
  END IF;
  
  UPDATE incidents SET
    status = v_new_status,
    hsse_validation_notes = p_validation_notes,
    hsse_validated_by = p_user_id,
    hsse_validated_at = now(),
    updated_at = now()
  WHERE id = p_incident_id;
  
  INSERT INTO audit_logs (tenant_id, branch_id, action, actor_id, entity_type, entity_id, old_value, new_value)
  VALUES (v_tenant_id, v_branch_id, 'hsse_observation_validation', p_user_id, 'incident', p_incident_id,
    jsonb_build_object('status', v_old_status),
    jsonb_build_object('status', v_new_status, 'decision', p_decision, 'notes', p_validation_notes));
  
  RETURN jsonb_build_object('success', true, 'incident_id', p_incident_id, 'new_status', v_new_status, 'decision', p_decision);
END;
$$;

-- Drop hsse_review_rejection (no RLS dependencies)
DROP FUNCTION IF EXISTS public.hsse_review_rejection(uuid, uuid, text, text) CASCADE;

-- Recreate hsse_review_rejection with correct audit columns
CREATE OR REPLACE FUNCTION public.hsse_review_rejection(
  p_incident_id uuid,
  p_user_id uuid,
  p_decision text,
  p_notes text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id uuid;
  v_branch_id uuid;
  v_old_status text;
  v_new_status text;
  v_can_review boolean := false;
BEGIN
  SELECT tenant_id, branch_id, status INTO v_tenant_id, v_branch_id, v_old_status
  FROM incidents WHERE id = p_incident_id AND deleted_at IS NULL;
  
  IF v_tenant_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Incident not found');
  END IF;
  
  SELECT EXISTS (
    SELECT 1 FROM user_role_assignments ura
    JOIN roles r ON r.id = ura.role_id
    WHERE ura.user_id = p_user_id
      AND r.code IN ('hsse_manager', 'hsse_officer', 'admin', 'super_admin')
      AND r.is_active = true
  ) INTO v_can_review;
  
  IF NOT v_can_review THEN
    RETURN jsonb_build_object('success', false, 'error', 'User cannot review rejection');
  END IF;
  
  IF p_decision = 'approve_rejection' THEN
    v_new_status := 'rejected_confirmed';
  ELSE
    v_new_status := 'pending_dept_rep_review';
  END IF;
  
  UPDATE incidents SET
    status = v_new_status,
    hsse_rejection_review_notes = p_notes,
    hsse_rejection_reviewed_by = p_user_id,
    hsse_rejection_reviewed_at = now(),
    updated_at = now()
  WHERE id = p_incident_id;
  
  INSERT INTO audit_logs (tenant_id, branch_id, action, actor_id, entity_type, entity_id, old_value, new_value)
  VALUES (v_tenant_id, v_branch_id, 'hsse_rejection_review', p_user_id, 'incident', p_incident_id,
    jsonb_build_object('status', v_old_status),
    jsonb_build_object('status', v_new_status, 'decision', p_decision, 'notes', p_notes));
  
  RETURN jsonb_build_object('success', true, 'incident_id', p_incident_id, 'new_status', v_new_status, 'decision', p_decision);
END;
$$;

-- Drop assign_investigation_team (no RLS dependencies)
DROP FUNCTION IF EXISTS public.assign_investigation_team(uuid, uuid, uuid, text, uuid, uuid[], text) CASCADE;

-- Recreate assign_investigation_team with correct audit columns
CREATE OR REPLACE FUNCTION public.assign_investigation_team(
  p_incident_id uuid,
  p_lead_investigator_id uuid,
  p_assigned_by uuid,
  p_assignment_notes text DEFAULT NULL,
  p_target_completion_date uuid DEFAULT NULL,
  p_team_member_ids uuid[] DEFAULT NULL,
  p_investigation_type text DEFAULT 'standard'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id uuid;
  v_branch_id uuid;
  v_investigation_id uuid;
  v_old_status text;
  v_member_id uuid;
BEGIN
  SELECT tenant_id, branch_id, status INTO v_tenant_id, v_branch_id, v_old_status
  FROM incidents WHERE id = p_incident_id AND deleted_at IS NULL;
  
  IF v_tenant_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Incident not found');
  END IF;
  
  INSERT INTO investigations (
    incident_id, lead_investigator_id, assigned_by, assignment_notes,
    investigation_type, status, tenant_id, branch_id
  ) VALUES (
    p_incident_id, p_lead_investigator_id, p_assigned_by, p_assignment_notes,
    p_investigation_type, 'assigned', v_tenant_id, v_branch_id
  ) RETURNING id INTO v_investigation_id;
  
  IF p_team_member_ids IS NOT NULL THEN
    FOREACH v_member_id IN ARRAY p_team_member_ids LOOP
      INSERT INTO investigation_team_members (investigation_id, user_id, tenant_id, branch_id)
      VALUES (v_investigation_id, v_member_id, v_tenant_id, v_branch_id);
    END LOOP;
  END IF;
  
  UPDATE incidents SET status = 'under_investigation', updated_at = now()
  WHERE id = p_incident_id;
  
  INSERT INTO audit_logs (tenant_id, branch_id, action, actor_id, entity_type, entity_id, old_value, new_value)
  VALUES (v_tenant_id, v_branch_id, 'investigation_assigned', p_assigned_by, 'incident', p_incident_id,
    jsonb_build_object('status', v_old_status),
    jsonb_build_object('status', 'under_investigation', 'investigation_id', v_investigation_id));
  
  RETURN jsonb_build_object('success', true, 'investigation_id', v_investigation_id, 'incident_id', p_incident_id);
END;
$$;