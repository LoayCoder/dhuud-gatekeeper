-- Fix gen_random_bytes reference in approve_gate_pass_unified
-- The pgcrypto extension is installed in 'extensions' schema, not 'public'

CREATE OR REPLACE FUNCTION public.approve_gate_pass_unified(
  p_user_id uuid,
  p_gate_pass_id uuid,
  p_action text,
  p_notes text DEFAULT NULL::text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
      -- FIXED: Use extensions.gen_random_bytes instead of gen_random_bytes
      v_qr_token := encode(extensions.gen_random_bytes(32), 'hex');
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
      -- FIXED: Use extensions.gen_random_bytes instead of gen_random_bytes
      v_qr_token := encode(extensions.gen_random_bytes(32), 'hex');
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
$function$;