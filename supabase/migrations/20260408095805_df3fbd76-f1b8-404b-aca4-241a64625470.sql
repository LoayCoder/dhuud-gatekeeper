
-- 1. Insert gate_pass_acknowledger role
INSERT INTO public.roles (code, name, category, description, is_active)
VALUES ('gate_pass_acknowledger', 'Gate Pass Acknowledger', 'security', 'Can acknowledge gate passes before security approval', true)
ON CONFLICT (code) DO NOTHING;

-- 2. Replace approve_gate_pass_unified
CREATE OR REPLACE FUNCTION public.approve_gate_pass_unified(
  p_user_id uuid, p_gate_pass_id uuid, p_action text, p_notes text DEFAULT NULL::text
) RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE
  v_pass RECORD; v_stage TEXT; v_new_status TEXT; v_qr_token TEXT; v_can_approve JSONB;
BEGIN
  SELECT * INTO v_pass FROM material_gate_passes WHERE id = p_gate_pass_id AND deleted_at IS NULL;
  IF v_pass IS NULL THEN RAISE EXCEPTION 'Gate pass not found'; END IF;

  CASE v_pass.status
    WHEN 'pending_contractor_approval' THEN v_stage := 'contractor';
    WHEN 'pending_dept_approval' THEN v_stage := 'dept_approval';
    WHEN 'pending_dept_ack' THEN v_stage := 'dept_approval';
    WHEN 'pending_acknowledgment' THEN v_stage := 'acknowledgment';
    WHEN 'pending_club_mgmt_ack' THEN v_stage := 'acknowledgment';
    WHEN 'pending_security_approval' THEN v_stage := 'security';
    ELSE RAISE EXCEPTION 'Gate pass is not in a pending approval state: %', v_pass.status;
  END CASE;

  v_can_approve := can_approve_gate_pass(p_user_id, p_gate_pass_id, v_stage);
  IF NOT (v_can_approve->>'allowed')::BOOLEAN THEN
    RAISE EXCEPTION 'Not authorized to approve: %', v_can_approve->>'reason';
  END IF;

  IF p_action = 'reject' THEN
    UPDATE material_gate_passes SET status = 'rejected', rejected_by = p_user_id, rejected_at = NOW(), rejection_reason = p_notes, updated_at = NOW() WHERE id = p_gate_pass_id;
    RETURN 'rejected';
  END IF;

  CASE v_stage
    WHEN 'contractor' THEN
      UPDATE material_gate_passes SET contractor_approved_by = p_user_id, contractor_approved_at = NOW(), contractor_approval_notes = p_notes, status = 'pending_acknowledgment', updated_at = NOW() WHERE id = p_gate_pass_id;
      v_new_status := 'pending_acknowledgment';
    WHEN 'dept_approval' THEN
      UPDATE material_gate_passes SET pm_approved_by = p_user_id, pm_approved_at = NOW(), pm_notes = p_notes, status = 'pending_acknowledgment', updated_at = NOW() WHERE id = p_gate_pass_id;
      v_new_status := 'pending_acknowledgment';
    WHEN 'acknowledgment' THEN
      UPDATE material_gate_passes SET club_mgmt_ack_by = p_user_id, club_mgmt_ack_at = NOW(), club_mgmt_ack_notes = p_notes, status = 'pending_security_approval', updated_at = NOW() WHERE id = p_gate_pass_id;
      v_new_status := 'pending_security_approval';
    WHEN 'security' THEN
      v_qr_token := encode(extensions.gen_random_bytes(32), 'hex');
      UPDATE material_gate_passes SET security_approved_by = p_user_id, security_approved_at = NOW(), security_approval_notes = p_notes, status = 'approved', qr_code_token = v_qr_token, updated_at = NOW() WHERE id = p_gate_pass_id;
      v_new_status := 'approved';
  END CASE;
  RETURN v_new_status;
END;
$function$;

-- 3. Replace can_approve_gate_pass (JSONB version)
CREATE OR REPLACE FUNCTION public.can_approve_gate_pass(
  p_user_id uuid, p_gate_pass_id uuid, p_stage text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE
  v_gate_pass RECORD; v_user_tenant_id uuid;
  v_is_contractor_consultant boolean := false; v_is_dept_rep boolean := false;
  v_is_dept_manager boolean := false; v_is_manager boolean := false;
  v_is_gate_pass_acknowledger boolean := false; v_is_security_supervisor boolean := false;
  v_is_admin boolean := false; v_is_super_admin boolean := false;
BEGIN
  SELECT tenant_id, COALESCE(is_super_admin, false) INTO v_user_tenant_id, v_is_super_admin FROM profiles WHERE id = p_user_id;
  v_is_admin := public.is_admin(p_user_id);
  IF v_is_admin OR v_is_super_admin THEN RETURN jsonb_build_object('allowed', true); END IF;

  SELECT gp.*, gp.tenant_id as gp_tenant_id INTO v_gate_pass FROM material_gate_passes gp WHERE gp.id = p_gate_pass_id AND gp.deleted_at IS NULL;
  IF NOT FOUND THEN RETURN jsonb_build_object('allowed', false, 'reason', 'Gate pass not found'); END IF;
  IF v_user_tenant_id != v_gate_pass.gp_tenant_id THEN RETURN jsonb_build_object('allowed', false, 'reason', 'Access denied: different tenant'); END IF;

  WITH user_roles_cte AS (
    SELECT r.code FROM user_role_assignments ura JOIN roles r ON r.id = ura.role_id WHERE ura.user_id = p_user_id AND r.is_active = true AND ura.tenant_id = v_user_tenant_id
  )
  SELECT
    EXISTS(SELECT 1 FROM user_roles_cte WHERE code = 'contractor_consultant'),
    EXISTS(SELECT 1 FROM user_roles_cte WHERE code = 'department_representative'),
    EXISTS(SELECT 1 FROM user_roles_cte WHERE code = 'department_manager'),
    EXISTS(SELECT 1 FROM user_roles_cte WHERE code = 'manager'),
    EXISTS(SELECT 1 FROM user_roles_cte WHERE code = 'gate_pass_acknowledger'),
    EXISTS(SELECT 1 FROM user_roles_cte WHERE code = 'security_supervisor')
  INTO v_is_contractor_consultant, v_is_dept_rep, v_is_dept_manager, v_is_manager, v_is_gate_pass_acknowledger, v_is_security_supervisor;

  CASE p_stage
    WHEN 'contractor' THEN
      IF v_is_contractor_consultant THEN RETURN jsonb_build_object('allowed', true); END IF;
      RETURN jsonb_build_object('allowed', false, 'reason', 'Contractor consultant role required');
    WHEN 'dept_approval' THEN
      IF v_is_manager OR v_is_dept_manager THEN RETURN jsonb_build_object('allowed', true); END IF;
      IF v_is_dept_rep AND EXISTS (
        SELECT 1 FROM profiles req, profiles approver WHERE approver.id = p_user_id AND req.id = v_gate_pass.requested_by AND req.assigned_department_id = approver.assigned_department_id AND approver.tenant_id = v_user_tenant_id AND req.tenant_id = v_user_tenant_id
      ) THEN RETURN jsonb_build_object('allowed', true); END IF;
      RETURN jsonb_build_object('allowed', false, 'reason', 'Manager role, or department representative in the same department as requester, required');
    WHEN 'acknowledgment' THEN
      IF v_is_gate_pass_acknowledger THEN RETURN jsonb_build_object('allowed', true); END IF;
      RETURN jsonb_build_object('allowed', false, 'reason', 'Gate pass acknowledger role required');
    WHEN 'security' THEN
      IF v_is_security_supervisor THEN RETURN jsonb_build_object('allowed', true); END IF;
      RETURN jsonb_build_object('allowed', false, 'reason', 'Security supervisor role required');
    ELSE
      RETURN jsonb_build_object('allowed', false, 'reason', 'Unknown approval stage: ' || p_stage);
  END CASE;
END;
$function$;

-- 4. Replace can_approve_gate_pass (boolean version)
CREATE OR REPLACE FUNCTION public.can_approve_gate_pass(
  p_user_id uuid, p_gate_pass_id uuid
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE
  v_gate_pass RECORD; v_user_roles text[]; v_user_tenant_id uuid;
  v_is_admin boolean := false; v_is_super_admin boolean := false;
BEGIN
  SELECT gp.status, gp.tenant_id INTO v_gate_pass FROM material_gate_passes gp WHERE gp.id = p_gate_pass_id AND gp.deleted_at IS NULL;
  IF NOT FOUND THEN RETURN false; END IF;

  SELECT array_agg(r.code) INTO v_user_roles FROM user_role_assignments ura JOIN roles r ON r.id = ura.role_id AND r.is_active = true WHERE ura.user_id = p_user_id;
  IF v_user_roles IS NULL THEN RETURN false; END IF;

  SELECT tenant_id, COALESCE(is_super_admin, false) INTO v_user_tenant_id, v_is_super_admin FROM profiles WHERE id = p_user_id AND is_deleted = false;
  v_is_admin := public.is_admin(p_user_id);
  IF v_user_tenant_id != v_gate_pass.tenant_id THEN RETURN false; END IF;
  IF v_is_admin OR v_is_super_admin THEN RETURN true; END IF;

  CASE v_gate_pass.status
    WHEN 'pending_contractor_approval' THEN RETURN 'contractor_consultant' = ANY(v_user_roles);
    WHEN 'pending_dept_approval' THEN RETURN ('department_representative' = ANY(v_user_roles) OR 'department_manager' = ANY(v_user_roles) OR 'manager' = ANY(v_user_roles));
    WHEN 'pending_acknowledgment' THEN RETURN 'gate_pass_acknowledger' = ANY(v_user_roles);
    WHEN 'pending_security_approval' THEN RETURN ('security_supervisor' = ANY(v_user_roles) OR 'security_manager' = ANY(v_user_roles));
    ELSE RETURN false;
  END CASE;
END;
$function$;

-- 5. Migrate stuck passes
UPDATE material_gate_passes SET status = 'pending_acknowledgment', updated_at = NOW() WHERE status = 'pending_club_mgmt_ack' AND deleted_at IS NULL;
