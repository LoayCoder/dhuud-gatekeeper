-- Fix can_approve_gate_pass function: Remove invalid ura.deleted_at reference
-- The user_role_assignments table does not have a deleted_at column

CREATE OR REPLACE FUNCTION public.can_approve_gate_pass(p_user_id uuid, p_gate_pass_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_gate_pass RECORD;
  v_user_roles text[];
  v_user_tenant_id uuid;
  v_user_branch_id uuid;
  v_user_site_id uuid;
  v_user_department_id uuid;
BEGIN
  -- Get gate pass details
  SELECT 
    gp.status,
    gp.tenant_id,
    gp.branch_id,
    gp.site_id,
    gp.request_type,
    gp.project_id
  INTO v_gate_pass
  FROM material_gate_passes gp
  WHERE gp.id = p_gate_pass_id AND gp.deleted_at IS NULL;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Get user's roles (FIXED: removed ura.deleted_at reference)
  SELECT array_agg(r.code)
  INTO v_user_roles
  FROM user_role_assignments ura
  JOIN roles r ON r.id = ura.role_id AND r.is_active = true
  WHERE ura.user_id = p_user_id;

  IF v_user_roles IS NULL THEN
    RETURN false;
  END IF;

  -- Get user's profile info
  SELECT tenant_id, branch_id, site_id, department_id
  INTO v_user_tenant_id, v_user_branch_id, v_user_site_id, v_user_department_id
  FROM profiles
  WHERE id = p_user_id AND is_deleted = false;

  -- Tenant isolation check
  IF v_user_tenant_id != v_gate_pass.tenant_id THEN
    RETURN false;
  END IF;

  -- Check based on current status and request type
  CASE v_gate_pass.status
    -- External workflow: Contractor Consultant approval
    WHEN 'pending_contractor_approval' THEN
      RETURN 'contractor_consultant' = ANY(v_user_roles);

    -- Internal workflow: Department Representative/Manager approval
    WHEN 'pending_dept_approval' THEN
      RETURN ('department_representative' = ANY(v_user_roles) OR 'department_manager' = ANY(v_user_roles));

    -- Golf Club Management acknowledgment (both workflows)
    WHEN 'pending_club_mgmt_ack' THEN
      RETURN ('department_representative' = ANY(v_user_roles) OR 'department_manager' = ANY(v_user_roles));

    -- Security Supervisor final approval (both workflows)
    WHEN 'pending_security_approval' THEN
      RETURN ('security_supervisor' = ANY(v_user_roles) OR 'security_manager' = ANY(v_user_roles));

    ELSE
      RETURN false;
  END CASE;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.can_approve_gate_pass(uuid, uuid) TO authenticated;