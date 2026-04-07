
-- Fix JSONB version: replace is_admin column with RPC call
CREATE OR REPLACE FUNCTION public.can_approve_gate_pass(p_user_id uuid, p_gate_pass_id uuid, p_stage text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_gate_pass RECORD;
  v_user_tenant_id uuid;
  v_is_contractor_consultant boolean := false;
  v_is_dept_rep boolean := false;
  v_is_dept_manager boolean := false;
  v_is_manager boolean := false;
  v_is_club_mgmt boolean := false;
  v_is_security_supervisor boolean := false;
  v_is_admin boolean := false;
  v_is_super_admin boolean := false;
BEGIN
  -- Get user's tenant and super_admin flag (is_admin is an RPC, not a column)
  SELECT tenant_id, COALESCE(is_super_admin, false)
  INTO v_user_tenant_id, v_is_super_admin
  FROM profiles WHERE id = p_user_id;

  -- Use the RPC function for admin check
  v_is_admin := public.is_admin(p_user_id);

  -- Admin/Super Admin bypass
  IF v_is_admin OR v_is_super_admin THEN
    RETURN jsonb_build_object('allowed', true);
  END IF;

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

  -- Check user roles
  WITH user_roles_cte AS (
    SELECT r.code
    FROM user_role_assignments ura
    JOIN roles r ON r.id = ura.role_id
    WHERE ura.user_id = p_user_id
      AND r.is_active = true
      AND ura.tenant_id = v_user_tenant_id
  )
  SELECT
    EXISTS(SELECT 1 FROM user_roles_cte WHERE code = 'contractor_consultant'),
    EXISTS(SELECT 1 FROM user_roles_cte WHERE code = 'department_representative'),
    EXISTS(SELECT 1 FROM user_roles_cte WHERE code = 'department_manager'),
    EXISTS(SELECT 1 FROM user_roles_cte WHERE code = 'manager'),
    EXISTS(SELECT 1 FROM user_roles_cte WHERE code IN ('club_management', 'golf_club_management')),
    EXISTS(SELECT 1 FROM user_roles_cte WHERE code = 'security_supervisor')
  INTO
    v_is_contractor_consultant,
    v_is_dept_rep,
    v_is_dept_manager,
    v_is_manager,
    v_is_club_mgmt,
    v_is_security_supervisor;

  -- Check authorization based on stage
  CASE p_stage
    WHEN 'contractor' THEN
      IF v_is_contractor_consultant THEN
        RETURN jsonb_build_object('allowed', true);
      END IF;
      RETURN jsonb_build_object('allowed', false, 'reason', 'Contractor consultant role required');

    WHEN 'dept_approval' THEN
      IF v_is_manager OR v_is_dept_manager THEN
        RETURN jsonb_build_object('allowed', true);
      END IF;

      IF v_is_dept_rep AND EXISTS (
        SELECT 1 FROM profiles req, profiles approver
        WHERE approver.id = p_user_id
          AND req.id = v_gate_pass.requested_by
          AND req.assigned_department_id = approver.assigned_department_id
          AND approver.tenant_id = v_user_tenant_id
          AND req.tenant_id = v_user_tenant_id
      ) THEN
        RETURN jsonb_build_object('allowed', true);
      END IF;

      RETURN jsonb_build_object('allowed', false, 'reason', 'Manager role, or department representative in the same department as requester, required');

    WHEN 'dept_ack', 'club_mgmt_ack' THEN
      IF v_is_club_mgmt THEN
        RETURN jsonb_build_object('allowed', true);
      END IF;

      IF (v_is_dept_rep OR v_is_dept_manager) AND EXISTS (
        SELECT 1 FROM profiles p
        JOIN departments d ON d.id = p.assigned_department_id
        WHERE p.id = p_user_id
          AND (d.name = 'Golf Club Management'
               OR d.name ILIKE '%golf%club%management%'
               OR d.name ILIKE '%club%management%')
          AND d.tenant_id = v_user_tenant_id
          AND p.tenant_id = v_user_tenant_id
          AND d.deleted_at IS NULL
      ) THEN
        RETURN jsonb_build_object('allowed', true);
      END IF;

      RETURN jsonb_build_object('allowed', false, 'reason', 'Club management role or Golf Club Management department representative required');

    WHEN 'security', 'safety' THEN
      IF v_is_security_supervisor THEN
        RETURN jsonb_build_object('allowed', true);
      END IF;
      RETURN jsonb_build_object('allowed', false, 'reason', 'Security supervisor role required');

    WHEN 'pm' THEN
      IF v_is_manager OR v_is_dept_manager THEN
        RETURN jsonb_build_object('allowed', true);
      END IF;

      IF v_is_dept_rep AND EXISTS (
        SELECT 1 FROM profiles req, profiles approver
        WHERE approver.id = p_user_id
          AND req.id = v_gate_pass.requested_by
          AND req.assigned_department_id = approver.assigned_department_id
          AND approver.tenant_id = v_user_tenant_id
          AND req.tenant_id = v_user_tenant_id
      ) THEN
        RETURN jsonb_build_object('allowed', true);
      END IF;

      RETURN jsonb_build_object('allowed', false, 'reason', 'Manager role or department representative required');

    ELSE
      RETURN jsonb_build_object('allowed', false, 'reason', 'Unknown approval stage: ' || p_stage);
  END CASE;
END;
$$;

-- Fix boolean version: replace is_admin column with RPC call
DROP FUNCTION IF EXISTS public.can_approve_gate_pass(uuid, uuid);

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
  v_is_admin boolean := false;
  v_is_super_admin boolean := false;
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

  -- Get user's roles
  SELECT array_agg(r.code)
  INTO v_user_roles
  FROM user_role_assignments ura
  JOIN roles r ON r.id = ura.role_id AND r.is_active = true
  WHERE ura.user_id = p_user_id;

  IF v_user_roles IS NULL THEN
    RETURN false;
  END IF;

  -- Get user's profile info (is_admin via RPC, not column)
  SELECT tenant_id, branch_id, site_id, department_id,
         COALESCE(is_super_admin, false)
  INTO v_user_tenant_id, v_user_branch_id, v_user_site_id, v_user_department_id,
       v_is_super_admin
  FROM profiles
  WHERE id = p_user_id AND is_deleted = false;

  -- Use the RPC function for admin check
  v_is_admin := public.is_admin(p_user_id);

  -- Tenant isolation check
  IF v_user_tenant_id != v_gate_pass.tenant_id THEN
    RETURN false;
  END IF;

  -- Admin/Super Admin bypass
  IF v_is_admin OR v_is_super_admin THEN
    RETURN true;
  END IF;

  -- Check based on current status and request type
  CASE v_gate_pass.status
    WHEN 'pending_contractor_approval' THEN
      RETURN 'contractor_consultant' = ANY(v_user_roles);

    WHEN 'pending_dept_approval' THEN
      RETURN ('department_representative' = ANY(v_user_roles)
              OR 'department_manager' = ANY(v_user_roles)
              OR 'manager' = ANY(v_user_roles));

    WHEN 'pending_club_mgmt_ack' THEN
      RETURN ('department_representative' = ANY(v_user_roles)
              OR 'department_manager' = ANY(v_user_roles));

    WHEN 'pending_security_approval' THEN
      RETURN ('security_supervisor' = ANY(v_user_roles)
              OR 'security_manager' = ANY(v_user_roles));

    ELSE
      RETURN false;
  END CASE;
END;
$$;
