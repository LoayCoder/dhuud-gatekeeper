-- Drop and recreate with correct schema - no department_id in profiles
DROP FUNCTION IF EXISTS public.can_approve_gate_pass(uuid, uuid, text);

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
  v_user_roles text[];
  v_is_admin boolean := false;
  v_is_security_supervisor boolean := false;
  v_is_contractor_consultant boolean := false;
  v_is_dept_rep boolean := false;
  v_is_dept_manager boolean := false;
  v_is_club_mgmt boolean := false;
BEGIN
  -- Fetch gate pass with company info
  SELECT gp.*, cc.assigned_client_pm_id AS consultant_id
  INTO v_gate_pass
  FROM material_gate_passes gp
  LEFT JOIN contractor_companies cc ON cc.id = gp.company_id
  WHERE gp.id = p_gate_pass_id
    AND gp.deleted_at IS NULL;

  IF v_gate_pass IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'Gate pass not found');
  END IF;

  -- Get user roles
  SELECT ARRAY_AGG(DISTINCT r.code)
  INTO v_user_roles
  FROM user_role_assignments ura
  JOIN roles r ON r.id = ura.role_id AND r.is_active = true
  WHERE ura.user_id = p_user_id;

  v_user_roles := COALESCE(v_user_roles, ARRAY[]::text[]);

  -- Determine role flags
  v_is_admin := v_user_roles && ARRAY['admin', 'super_admin', 'tenant_admin'];
  v_is_security_supervisor := v_user_roles && ARRAY['security_supervisor', 'security_manager'];
  v_is_contractor_consultant := v_user_roles && ARRAY['contractor_consultant'];
  v_is_dept_rep := v_user_roles && ARRAY['department_representative'];
  v_is_dept_manager := v_user_roles && ARRAY['department_manager'];
  v_is_club_mgmt := v_user_roles && ARRAY['golf_club_manager', 'golf_club_representative'];

  -- Admin can approve anything
  IF v_is_admin THEN
    RETURN jsonb_build_object('allowed', true);
  END IF;

  -- Stage-specific authorization
  CASE p_stage
    WHEN 'pending_contractor_approval' THEN
      -- Contractor consultant can approve if assigned to the company
      IF v_is_contractor_consultant THEN
        IF v_gate_pass.consultant_id = p_user_id THEN
          RETURN jsonb_build_object('allowed', true);
        ELSE
          RETURN jsonb_build_object('allowed', false, 'reason', 'Not assigned as consultant for this contractor');
        END IF;
      END IF;
      RETURN jsonb_build_object('allowed', false, 'reason', 'Contractor consultant role required');

    WHEN 'pending_dept_approval' THEN
      -- Department rep or manager can approve (role-based, same tenant)
      IF v_is_dept_rep OR v_is_dept_manager THEN
        RETURN jsonb_build_object('allowed', true);
      END IF;
      RETURN jsonb_build_object('allowed', false, 'reason', 'Department representative or manager role required');

    WHEN 'pending_club_mgmt_ack' THEN
      -- Golf club management can acknowledge
      IF v_is_club_mgmt THEN
        RETURN jsonb_build_object('allowed', true);
      END IF;
      RETURN jsonb_build_object('allowed', false, 'reason', 'Golf club management role required');

    WHEN 'pending_security_approval' THEN
      -- Security supervisor can give final approval
      IF v_is_security_supervisor THEN
        RETURN jsonb_build_object('allowed', true);
      END IF;
      RETURN jsonb_build_object('allowed', false, 'reason', 'Security supervisor role required');

    ELSE
      RETURN jsonb_build_object('allowed', false, 'reason', 'Unknown approval stage: ' || COALESCE(p_stage, 'null'));
  END CASE;

  RETURN jsonb_build_object('allowed', false, 'reason', 'No matching authorization rule');
END;
$$;

GRANT EXECUTE ON FUNCTION public.can_approve_gate_pass(uuid, uuid, text) TO authenticated;