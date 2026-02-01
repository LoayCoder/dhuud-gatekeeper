-- Fix: Change 'gate_passes' to 'material_gate_passes' in can_approve_gate_pass(uuid, uuid, text)
-- This function validates if a user can approve a gate pass at a specific approval stage

CREATE OR REPLACE FUNCTION public.can_approve_gate_pass(
  p_user_id uuid,
  p_gate_pass_id uuid,
  p_stage text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_gate_pass RECORD;
  v_user_roles text[];
  v_user_branch_id uuid;
  v_user_department_id uuid;
BEGIN
  -- Get gate pass details - FIXED: Changed from 'gate_passes' to 'material_gate_passes'
  SELECT gp.*, cc.consultant_id
  INTO v_gate_pass
  FROM material_gate_passes gp
  LEFT JOIN contractor_companies cc ON cc.id = gp.company_id
  WHERE gp.id = p_gate_pass_id;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Get user's roles
  SELECT array_agg(r.code)
  INTO v_user_roles
  FROM user_role_assignments ura
  JOIN roles r ON r.id = ura.role_id AND r.is_active = true
  WHERE ura.user_id = p_user_id;

  -- Get user's branch and department
  SELECT branch_id, department_id
  INTO v_user_branch_id, v_user_department_id
  FROM profiles
  WHERE id = p_user_id;

  -- Check approval based on stage
  CASE p_stage
    WHEN 'pending_contractor_approval' THEN
      -- Contractor consultant can approve
      RETURN v_gate_pass.consultant_id = p_user_id 
             OR 'contractor_consultant' = ANY(v_user_roles)
             OR 'admin' = ANY(v_user_roles);

    WHEN 'pending_dept_approval' THEN
      -- Department representative or manager can approve
      RETURN v_gate_pass.approval_from = p_user_id
             OR 'department_representative' = ANY(v_user_roles)
             OR 'department_manager' = ANY(v_user_roles)
             OR 'admin' = ANY(v_user_roles);

    WHEN 'pending_club_mgmt_ack' THEN
      -- Golf club management can acknowledge
      RETURN 'golf_club_manager' = ANY(v_user_roles)
             OR 'golf_club_representative' = ANY(v_user_roles)
             OR 'department_representative' = ANY(v_user_roles)
             OR 'department_manager' = ANY(v_user_roles)
             OR 'admin' = ANY(v_user_roles);

    WHEN 'pending_security_approval' THEN
      -- Security supervisor can give final approval
      RETURN 'security_supervisor' = ANY(v_user_roles)
             OR 'security_manager' = ANY(v_user_roles)
             OR 'admin' = ANY(v_user_roles);

    ELSE
      RETURN false;
  END CASE;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.can_approve_gate_pass(uuid, uuid, text) TO authenticated;