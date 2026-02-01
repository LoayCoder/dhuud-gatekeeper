-- Drop existing function first to allow return type change
DROP FUNCTION IF EXISTS approve_gate_pass_unified(UUID, UUID, TEXT, TEXT);

-- Recreate approve_gate_pass_unified to handle new workflow
CREATE OR REPLACE FUNCTION approve_gate_pass_unified(
  p_user_id UUID,
  p_gate_pass_id UUID,
  p_action TEXT,
  p_notes TEXT DEFAULT NULL
) RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pass RECORD;
  v_stage TEXT;
  v_new_status TEXT;
  v_qr_token TEXT;
  v_can_approve JSONB;
BEGIN
  SELECT * INTO v_pass FROM material_gate_passes WHERE id = p_gate_pass_id AND deleted_at IS NULL;
  IF v_pass IS NULL THEN
    RAISE EXCEPTION 'Gate pass not found';
  END IF;

  CASE v_pass.status
    WHEN 'pending_contractor_approval' THEN v_stage := 'contractor';
    WHEN 'pending_dept_approval' THEN v_stage := 'dept_approval';
    WHEN 'pending_dept_ack' THEN v_stage := 'dept_ack';
    WHEN 'pending_club_mgmt_ack' THEN v_stage := 'club_mgmt_ack';
    WHEN 'pending_security_approval' THEN v_stage := 'security';
    WHEN 'pending_pm_approval' THEN v_stage := 'pm';
    WHEN 'pending_safety_approval' THEN v_stage := 'safety';
    ELSE
      RAISE EXCEPTION 'Gate pass is not in a pending approval state: %', v_pass.status;
  END CASE;

  v_can_approve := can_approve_gate_pass(p_user_id, p_gate_pass_id, v_stage);
  IF NOT (v_can_approve->>'allowed')::BOOLEAN THEN
    RAISE EXCEPTION 'Not authorized to approve: %', v_can_approve->>'reason';
  END IF;

  IF p_action = 'reject' THEN
    UPDATE material_gate_passes SET
      status = 'rejected',
      rejected_by = p_user_id,
      rejected_at = NOW(),
      rejection_reason = p_notes,
      updated_at = NOW()
    WHERE id = p_gate_pass_id;
    RETURN 'rejected';
  END IF;

  CASE v_stage
    WHEN 'contractor' THEN
      UPDATE material_gate_passes SET
        contractor_approved_by = p_user_id,
        contractor_approved_at = NOW(),
        contractor_approval_notes = p_notes,
        status = 'pending_club_mgmt_ack',
        updated_at = NOW()
      WHERE id = p_gate_pass_id;
      v_new_status := 'pending_club_mgmt_ack';
      
    WHEN 'dept_approval' THEN
      UPDATE material_gate_passes SET
        pm_approved_by = p_user_id,
        pm_approved_at = NOW(),
        pm_notes = p_notes,
        status = 'pending_club_mgmt_ack',
        updated_at = NOW()
      WHERE id = p_gate_pass_id;
      v_new_status := 'pending_club_mgmt_ack';

    WHEN 'dept_ack' THEN
      UPDATE material_gate_passes SET
        pm_approved_by = p_user_id,
        pm_approved_at = NOW(),
        pm_notes = p_notes,
        status = 'pending_security_approval',
        updated_at = NOW()
      WHERE id = p_gate_pass_id;
      v_new_status := 'pending_security_approval';

    WHEN 'club_mgmt_ack' THEN
      UPDATE material_gate_passes SET
        club_mgmt_ack_by = p_user_id,
        club_mgmt_ack_at = NOW(),
        club_mgmt_ack_notes = p_notes,
        status = 'pending_security_approval',
        updated_at = NOW()
      WHERE id = p_gate_pass_id;
      v_new_status := 'pending_security_approval';

    WHEN 'security' THEN
      v_qr_token := encode(gen_random_bytes(32), 'hex');
      UPDATE material_gate_passes SET
        security_approved_by = p_user_id,
        security_approved_at = NOW(),
        security_approval_notes = p_notes,
        status = 'approved',
        qr_code_token = v_qr_token,
        updated_at = NOW()
      WHERE id = p_gate_pass_id;
      v_new_status := 'approved';

    WHEN 'pm' THEN
      UPDATE material_gate_passes SET
        pm_approved_by = p_user_id,
        pm_approved_at = NOW(),
        pm_notes = p_notes,
        status = 'pending_safety_approval',
        updated_at = NOW()
      WHERE id = p_gate_pass_id;
      v_new_status := 'pending_safety_approval';

    WHEN 'safety' THEN
      v_qr_token := encode(gen_random_bytes(32), 'hex');
      UPDATE material_gate_passes SET
        safety_approved_by = p_user_id,
        safety_approved_at = NOW(),
        safety_notes = p_notes,
        status = 'approved',
        qr_code_token = v_qr_token,
        updated_at = NOW()
      WHERE id = p_gate_pass_id;
      v_new_status := 'approved';
  END CASE;

  RETURN v_new_status;
END;
$$;

-- Update get_user_pending_gate_passes to include club_mgmt_ack stage
DROP FUNCTION IF EXISTS get_user_pending_gate_passes(UUID);

CREATE OR REPLACE FUNCTION get_user_pending_gate_passes(p_user_id UUID)
RETURNS SETOF material_gate_passes
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_roles TEXT[];
  v_user_dept_id UUID;
  v_club_mgmt_dept_id UUID;
  v_tenant_id UUID;
BEGIN
  SELECT ARRAY_AGG(r.code) INTO v_user_roles
  FROM user_role_assignments ura
  JOIN roles r ON r.id = ura.role_id AND r.is_active = TRUE
  WHERE ura.user_id = p_user_id AND ura.deleted_at IS NULL;
  
  IF v_user_roles IS NULL THEN v_user_roles := ARRAY[]::TEXT[]; END IF;

  SELECT assigned_department_id, tenant_id INTO v_user_dept_id, v_tenant_id 
  FROM profiles WHERE id = p_user_id;
  
  SELECT id INTO v_club_mgmt_dept_id 
  FROM departments 
  WHERE (name ILIKE '%club%management%' OR name ILIKE '%golf%management%' OR name = 'Golf Club Management')
    AND deleted_at IS NULL 
    AND tenant_id = v_tenant_id
  ORDER BY CASE WHEN name = 'Golf Club Management' THEN 0 ELSE 1 END
  LIMIT 1;

  RETURN QUERY
  SELECT gp.*
  FROM material_gate_passes gp
  WHERE gp.deleted_at IS NULL
    AND gp.tenant_id = v_tenant_id
    AND gp.requested_by != p_user_id
    AND (
      (gp.status = 'pending_contractor_approval' AND 'contractor_consultant' = ANY(v_user_roles))
      OR (gp.status = 'pending_dept_approval' AND (
        gp.approval_from_id = p_user_id OR
        'department_representative' = ANY(v_user_roles) OR
        'department_manager' = ANY(v_user_roles)
      ))
      OR (gp.status = 'pending_dept_ack' AND 'department_representative' = ANY(v_user_roles))
      OR (gp.status = 'pending_club_mgmt_ack' AND (
        ('department_representative' = ANY(v_user_roles) OR 'department_manager' = ANY(v_user_roles))
        AND v_user_dept_id = v_club_mgmt_dept_id
      ))
      OR (gp.status = 'pending_security_approval' AND (
        'security_supervisor' = ANY(v_user_roles) OR 'security_manager' = ANY(v_user_roles)
      ))
      OR (gp.status = 'pending_pm_approval')
      OR (gp.status = 'pending_safety_approval')
      OR 'admin' = ANY(v_user_roles)
    )
  ORDER BY gp.created_at DESC;
END;
$$;