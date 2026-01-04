-- Add new workflow status values for rejection handling
ALTER TYPE incident_status ADD VALUE IF NOT EXISTS 'pending_hsse_rejection_review';
ALTER TYPE incident_status ADD VALUE IF NOT EXISTS 'pending_dept_rep_mandatory_action';
ALTER TYPE incident_status ADD VALUE IF NOT EXISTS 'closed_rejected_approved_by_hsse';

-- Add rejection tracking columns to incidents table
ALTER TABLE incidents
ADD COLUMN IF NOT EXISTS dept_rep_rejection_reason TEXT,
ADD COLUMN IF NOT EXISTS dept_rep_rejected_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS dept_rep_rejected_by UUID REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS hsse_rejection_reviewed_by UUID REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS hsse_rejection_reviewed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS hsse_rejection_decision TEXT,
ADD COLUMN IF NOT EXISTS hsse_rejection_notes TEXT,
ADD COLUMN IF NOT EXISTS rejection_return_count INTEGER DEFAULT 0;

-- Create RPC function to validate dept rep approval (backend enforcement)
CREATE OR REPLACE FUNCTION validate_dept_rep_observation_approval(
  p_incident_id UUID,
  p_user_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_incident RECORD;
  v_action_count INTEGER;
  v_user_tenant_id UUID;
BEGIN
  -- Get user's tenant
  SELECT tenant_id INTO v_user_tenant_id
  FROM profiles
  WHERE id = p_user_id;

  -- Get incident details
  SELECT id, event_type, status, tenant_id
  INTO v_incident
  FROM incidents
  WHERE id = p_incident_id
    AND deleted_at IS NULL;

  IF v_incident IS NULL THEN
    RETURN json_build_object('valid', false, 'error', 'Incident not found');
  END IF;

  -- Tenant isolation check
  IF v_incident.tenant_id != v_user_tenant_id THEN
    RETURN json_build_object('valid', false, 'error', 'Access denied');
  END IF;

  -- Must be observation
  IF v_incident.event_type != 'observation' THEN
    RETURN json_build_object('valid', false, 'error', 'This workflow only applies to observations');
  END IF;

  -- Count corrective actions
  SELECT COUNT(*)
  INTO v_action_count
  FROM corrective_actions
  WHERE incident_id = p_incident_id
    AND deleted_at IS NULL;

  IF v_action_count < 1 THEN
    RETURN json_build_object(
      'valid', false, 
      'error', 'You must add at least one corrective action before approving this observation',
      'action_count', v_action_count
    );
  END IF;

  RETURN json_build_object('valid', true, 'action_count', v_action_count);
END;
$$;

-- Create RPC function to check if user can review HSSE rejection
CREATE OR REPLACE FUNCTION can_review_hsse_rejection(
  p_user_id UUID,
  p_incident_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_incident RECORD;
  v_user_tenant_id UUID;
  v_has_role BOOLEAN;
BEGIN
  -- Get user's tenant
  SELECT tenant_id INTO v_user_tenant_id
  FROM profiles
  WHERE id = p_user_id;

  -- Get incident
  SELECT id, status, tenant_id, event_type
  INTO v_incident
  FROM incidents
  WHERE id = p_incident_id
    AND deleted_at IS NULL;

  IF v_incident IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Tenant isolation
  IF v_incident.tenant_id != v_user_tenant_id THEN
    RETURN FALSE;
  END IF;

  -- Must be observation in pending_hsse_rejection_review status
  IF v_incident.event_type != 'observation' OR v_incident.status != 'pending_hsse_rejection_review' THEN
    RETURN FALSE;
  END IF;

  -- Check if user has HSSE Expert or Manager role
  SELECT EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = p_user_id
      AND ur.tenant_id = v_user_tenant_id
      AND ur.deleted_at IS NULL
      AND r.code IN ('hsse_expert', 'hsse_manager')
  ) INTO v_has_role;

  RETURN v_has_role;
END;
$$;

-- Create RPC function for dept rep to reject observation
CREATE OR REPLACE FUNCTION dept_rep_reject_observation(
  p_incident_id UUID,
  p_user_id UUID,
  p_rejection_reason TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_incident RECORD;
  v_user_tenant_id UUID;
  v_has_role BOOLEAN;
BEGIN
  -- Validate rejection reason length
  IF LENGTH(COALESCE(p_rejection_reason, '')) < 20 THEN
    RETURN json_build_object('success', false, 'error', 'Rejection reason must be at least 20 characters');
  END IF;

  -- Get user's tenant
  SELECT tenant_id INTO v_user_tenant_id
  FROM profiles
  WHERE id = p_user_id;

  -- Get incident
  SELECT id, status, tenant_id, event_type
  INTO v_incident
  FROM incidents
  WHERE id = p_incident_id
    AND deleted_at IS NULL;

  IF v_incident IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Incident not found');
  END IF;

  -- Tenant isolation
  IF v_incident.tenant_id != v_user_tenant_id THEN
    RETURN json_build_object('success', false, 'error', 'Access denied');
  END IF;

  -- Must be observation
  IF v_incident.event_type != 'observation' THEN
    RETURN json_build_object('success', false, 'error', 'This workflow only applies to observations');
  END IF;

  -- Cannot reject if already in mandatory action status (no second rejection)
  IF v_incident.status = 'pending_dept_rep_mandatory_action' THEN
    RETURN json_build_object('success', false, 'error', 'You cannot reject this observation again. You must take action or escalate.');
  END IF;

  -- Check if user is department representative
  SELECT EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = p_user_id
      AND ur.tenant_id = v_user_tenant_id
      AND ur.deleted_at IS NULL
      AND r.code = 'department_representative'
  ) INTO v_has_role;

  IF NOT v_has_role THEN
    RETURN json_build_object('success', false, 'error', 'You do not have permission to reject this observation');
  END IF;

  -- Update incident
  UPDATE incidents
  SET 
    status = 'pending_hsse_rejection_review',
    dept_rep_rejection_reason = p_rejection_reason,
    dept_rep_rejected_by = p_user_id,
    dept_rep_rejected_at = NOW(),
    updated_at = NOW()
  WHERE id = p_incident_id;

  -- Create audit log
  INSERT INTO incident_audit_logs (
    incident_id,
    tenant_id,
    action,
    performed_by,
    old_value,
    new_value,
    created_at
  ) VALUES (
    p_incident_id,
    v_user_tenant_id,
    'dept_rep_reject_observation',
    p_user_id,
    jsonb_build_object('status', v_incident.status),
    jsonb_build_object(
      'status', 'pending_hsse_rejection_review',
      'rejection_reason', p_rejection_reason
    ),
    NOW()
  );

  RETURN json_build_object('success', true);
END;
$$;

-- Create RPC function for HSSE expert to review rejection
CREATE OR REPLACE FUNCTION hsse_review_rejection(
  p_incident_id UUID,
  p_user_id UUID,
  p_decision TEXT,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_incident RECORD;
  v_user_tenant_id UUID;
  v_can_review BOOLEAN;
  v_new_status TEXT;
BEGIN
  -- Validate decision
  IF p_decision NOT IN ('approve_rejection', 'reject_rejection') THEN
    RETURN json_build_object('success', false, 'error', 'Invalid decision');
  END IF;

  -- Check permission
  SELECT can_review_hsse_rejection(p_user_id, p_incident_id) INTO v_can_review;
  
  IF NOT v_can_review THEN
    RETURN json_build_object('success', false, 'error', 'You do not have permission to review this rejection');
  END IF;

  -- Get user's tenant
  SELECT tenant_id INTO v_user_tenant_id
  FROM profiles
  WHERE id = p_user_id;

  -- Get incident
  SELECT id, status, rejection_return_count
  INTO v_incident
  FROM incidents
  WHERE id = p_incident_id;

  -- Determine new status
  IF p_decision = 'approve_rejection' THEN
    v_new_status := 'closed_rejected_approved_by_hsse';
  ELSE
    v_new_status := 'pending_dept_rep_mandatory_action';
  END IF;

  -- Update incident
  UPDATE incidents
  SET 
    status = v_new_status,
    hsse_rejection_reviewed_by = p_user_id,
    hsse_rejection_reviewed_at = NOW(),
    hsse_rejection_decision = p_decision,
    hsse_rejection_notes = p_notes,
    rejection_return_count = CASE 
      WHEN p_decision = 'reject_rejection' THEN COALESCE(rejection_return_count, 0) + 1
      ELSE rejection_return_count
    END,
    closed_at = CASE WHEN p_decision = 'approve_rejection' THEN NOW() ELSE NULL END,
    updated_at = NOW()
  WHERE id = p_incident_id;

  -- Create audit log
  INSERT INTO incident_audit_logs (
    incident_id,
    tenant_id,
    action,
    performed_by,
    old_value,
    new_value,
    created_at
  ) VALUES (
    p_incident_id,
    v_user_tenant_id,
    'hsse_review_rejection',
    p_user_id,
    jsonb_build_object('status', v_incident.status),
    jsonb_build_object(
      'status', v_new_status,
      'decision', p_decision,
      'notes', p_notes
    ),
    NOW()
  );

  RETURN json_build_object('success', true, 'new_status', v_new_status);
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION validate_dept_rep_observation_approval(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION can_review_hsse_rejection(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION dept_rep_reject_observation(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION hsse_review_rejection(UUID, UUID, TEXT, TEXT) TO authenticated;