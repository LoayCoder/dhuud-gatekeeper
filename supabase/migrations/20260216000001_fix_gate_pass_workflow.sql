-- Fix workflow consolidation and security

-- Ensure pgcrypto for random generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 0. Add missing columns for proper separation of duties
ALTER TABLE material_gate_passes ADD COLUMN IF NOT EXISTS dept_approved_by UUID REFERENCES profiles(id);
ALTER TABLE material_gate_passes ADD COLUMN IF NOT EXISTS dept_approved_at TIMESTAMPTZ;
ALTER TABLE material_gate_passes ADD COLUMN IF NOT EXISTS dept_approval_notes TEXT;

-- 1. Update can_approve_gate_pass to handle legacy stages mapping and enforce stricter security
CREATE OR REPLACE FUNCTION public.can_approve_gate_pass(
  p_user_id uuid,
  p_gate_pass_id uuid,
  p_stage text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_gate_pass RECORD;
  v_user_tenant_id uuid;
  v_user_dept_id uuid;
  v_club_mgmt_dept_id uuid;
  v_is_contractor_consultant boolean := false;
  v_is_dept_rep boolean := false;
  v_is_dept_manager boolean := false;
  v_is_club_mgmt boolean := false;
  v_is_security_supervisor boolean := false;
  v_is_admin boolean := false;
BEGIN
  -- Get user's tenant and department
  SELECT tenant_id, assigned_department_id INTO v_user_tenant_id, v_user_dept_id
  FROM profiles WHERE id = p_user_id;

  -- Get gate pass details
  SELECT gp.*, gp.tenant_id as gp_tenant_id
  INTO v_gate_pass
  FROM material_gate_passes gp
  WHERE gp.id = p_gate_pass_id AND gp.deleted_at IS NULL;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'Gate pass not found');
  END IF;

  -- Verify same tenant
  IF v_user_tenant_id != v_gate_pass.gp_tenant_id THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'Access denied: different tenant');
  END IF;

  -- BLOCK SELF-APPROVAL
  IF p_user_id = v_gate_pass.requested_by THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'Cannot approve own request');
  END IF;

  -- Check user roles
  SELECT EXISTS (
    SELECT 1 FROM user_role_assignments ura
    JOIN roles r ON r.id = ura.role_id
    WHERE ura.user_id = p_user_id
      AND r.code = 'contractor_consultant'
      AND r.is_active = true
      AND ura.tenant_id = v_user_tenant_id
  ) INTO v_is_contractor_consultant;

  SELECT EXISTS (
    SELECT 1 FROM user_role_assignments ura
    JOIN roles r ON r.id = ura.role_id
    WHERE ura.user_id = p_user_id
      AND r.code = 'department_representative'
      AND r.is_active = true
      AND ura.tenant_id = v_user_tenant_id
  ) INTO v_is_dept_rep;

  SELECT EXISTS (
    SELECT 1 FROM user_role_assignments ura
    JOIN roles r ON r.id = ura.role_id
    WHERE ura.user_id = p_user_id
      AND r.code = 'department_manager'
      AND r.is_active = true
      AND ura.tenant_id = v_user_tenant_id
  ) INTO v_is_dept_manager;

  SELECT EXISTS (
    SELECT 1 FROM user_role_assignments ura
    JOIN roles r ON r.id = ura.role_id
    WHERE ura.user_id = p_user_id
      AND r.code IN ('club_management', 'golf_club_management')
      AND r.is_active = true
      AND ura.tenant_id = v_user_tenant_id
  ) INTO v_is_club_mgmt;

  SELECT EXISTS (
    SELECT 1 FROM user_role_assignments ura
    JOIN roles r ON r.id = ura.role_id
    WHERE ura.user_id = p_user_id
      AND r.code IN ('security_supervisor', 'security_manager')
      AND r.is_active = true
      AND ura.tenant_id = v_user_tenant_id
  ) INTO v_is_security_supervisor;

  SELECT EXISTS (
    SELECT 1 FROM user_role_assignments ura
    JOIN roles r ON r.id = ura.role_id
    WHERE ura.user_id = p_user_id
      AND r.code = 'admin'
      AND r.is_active = true
      AND ura.tenant_id = v_user_tenant_id
  ) INTO v_is_admin;

  -- Admins can approve anything
  IF v_is_admin THEN
     RETURN jsonb_build_object('allowed', true);
  END IF;

  -- Check authorization based on stage
  CASE p_stage
    WHEN 'contractor' THEN
      IF v_is_contractor_consultant THEN
        RETURN jsonb_build_object('allowed', true);
      END IF;
      RETURN jsonb_build_object('allowed', false, 'reason', 'Contractor consultant role required');

    -- Legacy PM mapping
    WHEN 'pm' THEN
      IF v_is_contractor_consultant THEN
        RETURN jsonb_build_object('allowed', true);
      END IF;
      RETURN jsonb_build_object('allowed', false, 'reason', 'Contractor consultant (PM) role required');

    WHEN 'dept_approval' THEN
      -- Strict check: Must be the assigned approver if set
      IF v_gate_pass.approval_from_id IS NOT NULL THEN
        IF v_gate_pass.approval_from_id = p_user_id THEN
           RETURN jsonb_build_object('allowed', true);
        END IF;
        RETURN jsonb_build_object('allowed', false, 'reason', 'Only the assigned approver can approve this request');
      END IF;

      IF v_is_dept_rep OR v_is_dept_manager THEN
        RETURN jsonb_build_object('allowed', true);
      END IF;
      RETURN jsonb_build_object('allowed', false, 'reason', 'Department representative or manager role required');

    WHEN 'dept_ack' THEN
      IF v_is_dept_rep OR v_is_dept_manager THEN
        RETURN jsonb_build_object('allowed', true);
      END IF;
      RETURN jsonb_build_object('allowed', false, 'reason', 'Department representative or manager role required');

    WHEN 'club_mgmt_ack' THEN
      -- Resolve Club Management Department
      SELECT id INTO v_club_mgmt_dept_id
      FROM departments
      WHERE (name ILIKE '%club%management%' OR name ILIKE '%golf%management%' OR name = 'Golf Club Management')
        AND deleted_at IS NULL
        AND tenant_id = v_user_tenant_id
      ORDER BY CASE WHEN name = 'Golf Club Management' THEN 0 ELSE 1 END
      LIMIT 1;

      IF v_is_club_mgmt THEN
        RETURN jsonb_build_object('allowed', true);
      END IF;

      -- If approving via Dept Rep/Manager role, MUST belong to Club Mgmt department
      IF (v_is_dept_rep OR v_is_dept_manager) AND v_user_dept_id = v_club_mgmt_dept_id THEN
        RETURN jsonb_build_object('allowed', true);
      END IF;

      RETURN jsonb_build_object('allowed', false, 'reason', 'Club management role or Club Management department affiliation required');

    WHEN 'security' THEN
      IF v_is_security_supervisor THEN
        RETURN jsonb_build_object('allowed', true);
      END IF;
      RETURN jsonb_build_object('allowed', false, 'reason', 'Security supervisor role required');

    -- Legacy Safety mapping
    WHEN 'safety' THEN
      IF v_is_security_supervisor THEN
        RETURN jsonb_build_object('allowed', true);
      END IF;
      RETURN jsonb_build_object('allowed', false, 'reason', 'Security supervisor (Safety) role required');

    ELSE
      RETURN jsonb_build_object('allowed', false, 'reason', 'Unknown approval stage: ' || p_stage);
  END CASE;
END;
$$;


-- 2. Update approve_gate_pass_unified to route legacy stages to new workflow
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

    -- Legacy PM maps to contractor logic -> Club Mgmt
    WHEN 'pm' THEN
      UPDATE material_gate_passes SET
        pm_approved_by = p_user_id,
        pm_approved_at = NOW(),
        pm_notes = p_notes,
        status = 'pending_club_mgmt_ack',
        updated_at = NOW()
      WHERE id = p_gate_pass_id;
      v_new_status := 'pending_club_mgmt_ack';

    WHEN 'dept_approval' THEN
      UPDATE material_gate_passes SET
        dept_approved_by = p_user_id,
        dept_approved_at = NOW(),
        dept_approval_notes = p_notes,
        status = 'pending_club_mgmt_ack',
        updated_at = NOW()
      WHERE id = p_gate_pass_id;
      v_new_status := 'pending_club_mgmt_ack';

    WHEN 'dept_ack' THEN
      UPDATE material_gate_passes SET
        dept_approved_by = p_user_id,
        dept_approved_at = NOW(),
        dept_approval_notes = p_notes,
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

    -- Legacy Safety maps to Security logic -> Approved
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


-- 3. Update get_user_pending_gate_passes to fix security hole and include legacy roles
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

  -- Resolve Club Management Department
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
      -- Contractor Approval
      (gp.status = 'pending_contractor_approval' AND 'contractor_consultant' = ANY(v_user_roles))

      -- Legacy PM Approval (mapped to Contractor Consultant)
      OR (gp.status = 'pending_pm_approval' AND 'contractor_consultant' = ANY(v_user_roles))

      -- Dept Approval
      OR (gp.status = 'pending_dept_approval' AND (
        gp.approval_from_id = p_user_id OR
        -- Fallback if no specific approver assigned
        (gp.approval_from_id IS NULL AND (
          'department_representative' = ANY(v_user_roles) OR
          'department_manager' = ANY(v_user_roles)
        ))
      ))

      -- Dept Ack
      OR (gp.status = 'pending_dept_ack' AND 'department_representative' = ANY(v_user_roles))

      -- Club Mgmt Ack
      OR (gp.status = 'pending_club_mgmt_ack' AND (
        ('department_representative' = ANY(v_user_roles) OR 'department_manager' = ANY(v_user_roles))
        AND v_user_dept_id = v_club_mgmt_dept_id
      ))

      -- Security Approval
      OR (gp.status = 'pending_security_approval' AND (
        'security_supervisor' = ANY(v_user_roles) OR 'security_manager' = ANY(v_user_roles)
      ))

      -- Legacy Safety Approval (mapped to Security Supervisor)
      OR (gp.status = 'pending_safety_approval' AND (
        'security_supervisor' = ANY(v_user_roles) OR 'security_manager' = ANY(v_user_roles)
      ))

      -- Admin Override
      OR 'admin' = ANY(v_user_roles)
    )
  ORDER BY gp.created_at DESC;
END;
$$;
