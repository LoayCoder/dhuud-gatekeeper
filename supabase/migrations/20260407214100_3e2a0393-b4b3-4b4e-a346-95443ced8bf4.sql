
-- =============================================
-- 1. Fix can_approve_gate_pass (JSONB version)
-- =============================================
DROP FUNCTION IF EXISTS public.can_approve_gate_pass(uuid, uuid, text);

CREATE OR REPLACE FUNCTION public.can_approve_gate_pass(p_user_id uuid, p_gate_pass_id uuid, p_stage text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
  -- Get user's tenant and admin flags
  SELECT tenant_id, COALESCE(is_admin, false), COALESCE(is_super_admin, false)
  INTO v_user_tenant_id, v_is_admin, v_is_super_admin
  FROM profiles WHERE id = p_user_id;

  -- Admin/Super Admin bypass — they can approve any stage
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
      -- Managers can approve without department restriction (broader authority)
      IF v_is_manager OR v_is_dept_manager THEN
        RETURN jsonb_build_object('allowed', true);
      END IF;

      -- Department representatives require same department as requester
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
      -- Managers can approve without department restriction
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

    ELSE
      RETURN jsonb_build_object('allowed', false, 'reason', 'Unknown approval stage: ' || p_stage);
  END CASE;
END;
$function$;

-- =============================================
-- 2. Fix can_approve_gate_pass (boolean version)
-- =============================================
DROP FUNCTION IF EXISTS public.can_approve_gate_pass(uuid, uuid);

CREATE OR REPLACE FUNCTION public.can_approve_gate_pass(p_user_id uuid, p_gate_pass_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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

  -- Get user's profile info
  SELECT tenant_id, branch_id, site_id, department_id,
         COALESCE(is_admin, false), COALESCE(is_super_admin, false)
  INTO v_user_tenant_id, v_user_branch_id, v_user_site_id, v_user_department_id,
       v_is_admin, v_is_super_admin
  FROM profiles
  WHERE id = p_user_id AND is_deleted = false;

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
$function$;

-- =============================================
-- 3. Fix get_auto_approver_for_gate_pass
-- =============================================
DROP FUNCTION IF EXISTS public.get_auto_approver_for_gate_pass(uuid);

CREATE OR REPLACE FUNCTION public.get_auto_approver_for_gate_pass(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_dept_id UUID;
  v_is_dept_rep_or_manager BOOLEAN := FALSE;
  v_approver_id UUID;
  v_approver_name TEXT;
  v_approver_job_title TEXT;
  v_approver_role TEXT;
BEGIN
  -- Get user's assigned department
  SELECT assigned_department_id INTO v_user_dept_id
  FROM profiles
  WHERE id = p_user_id AND is_active = TRUE AND is_deleted = FALSE;

  IF v_user_dept_id IS NULL THEN
    RETURN jsonb_build_object(
      'auto_resolved', false,
      'reason', 'no_department_assigned',
      'approver_id', NULL,
      'approver_name', NULL,
      'approver_job_title', NULL,
      'approver_role', NULL
    );
  END IF;

  -- Check if user is a department_representative or department_manager
  SELECT EXISTS(
    SELECT 1
    FROM user_role_assignments ura
    JOIN roles r ON r.id = ura.role_id
    WHERE ura.user_id = p_user_id
      AND r.code IN ('department_representative', 'department_manager')
  ) INTO v_is_dept_rep_or_manager;

  IF v_is_dept_rep_or_manager THEN
    -- User is dept rep/manager → find their manager from manager_team
    SELECT mt.manager_id, p.full_name, p.job_title, 'manager'
    INTO v_approver_id, v_approver_name, v_approver_job_title, v_approver_role
    FROM manager_team mt
    JOIN profiles p ON p.id = mt.manager_id
    WHERE mt.user_id = p_user_id
      AND mt.deleted_at IS NULL
      AND p.is_active = TRUE
      AND p.is_deleted = FALSE
    LIMIT 1;

    IF v_approver_id IS NOT NULL THEN
      RETURN jsonb_build_object(
        'auto_resolved', true,
        'reason', 'routed_to_manager',
        'approver_id', v_approver_id,
        'approver_name', v_approver_name,
        'approver_job_title', v_approver_job_title,
        'approver_role', v_approver_role
      );
    ELSE
      RETURN jsonb_build_object(
        'auto_resolved', false,
        'reason', 'no_manager_assigned',
        'approver_id', NULL,
        'approver_name', NULL,
        'approver_job_title', NULL,
        'approver_role', NULL
      );
    END IF;
  ELSE
    -- Normal employee → Step 1: Find dept_representative in same department
    SELECT p.id, p.full_name, p.job_title, r.code
    INTO v_approver_id, v_approver_name, v_approver_job_title, v_approver_role
    FROM profiles p
    JOIN user_role_assignments ura ON ura.user_id = p.id
    JOIN roles r ON r.id = ura.role_id
    WHERE p.assigned_department_id = v_user_dept_id
      AND r.code IN ('department_representative', 'department_manager')
      AND p.is_active = TRUE
      AND p.is_deleted = FALSE
      AND p.id != p_user_id
    ORDER BY 
      CASE WHEN r.code = 'department_representative' THEN 0 ELSE 1 END,
      p.full_name
    LIMIT 1;

    IF v_approver_id IS NOT NULL THEN
      RETURN jsonb_build_object(
        'auto_resolved', true,
        'reason', 'routed_to_dept_rep',
        'approver_id', v_approver_id,
        'approver_name', v_approver_name,
        'approver_job_title', v_approver_job_title,
        'approver_role', v_approver_role
      );
    END IF;

    -- Step 2: No dept rep found → Find manager role user in same department
    SELECT p.id, p.full_name, p.job_title, 'manager'
    INTO v_approver_id, v_approver_name, v_approver_job_title, v_approver_role
    FROM profiles p
    JOIN user_role_assignments ura ON ura.user_id = p.id
    JOIN roles r ON r.id = ura.role_id
    WHERE p.assigned_department_id = v_user_dept_id
      AND r.code = 'manager'
      AND p.is_active = TRUE
      AND p.is_deleted = FALSE
      AND p.id != p_user_id
    ORDER BY p.full_name
    LIMIT 1;

    IF v_approver_id IS NOT NULL THEN
      RETURN jsonb_build_object(
        'auto_resolved', true,
        'reason', 'routed_to_dept_manager',
        'approver_id', v_approver_id,
        'approver_name', v_approver_name,
        'approver_job_title', v_approver_job_title,
        'approver_role', v_approver_role
      );
    END IF;

    -- Step 3: No one in department → Find user's manager via manager_team
    SELECT mt.manager_id, p.full_name, p.job_title, 'manager'
    INTO v_approver_id, v_approver_name, v_approver_job_title, v_approver_role
    FROM manager_team mt
    JOIN profiles p ON p.id = mt.manager_id
    WHERE mt.user_id = p_user_id
      AND mt.deleted_at IS NULL
      AND p.is_active = TRUE
      AND p.is_deleted = FALSE
    LIMIT 1;

    IF v_approver_id IS NOT NULL THEN
      RETURN jsonb_build_object(
        'auto_resolved', true,
        'reason', 'routed_to_manager',
        'approver_id', v_approver_id,
        'approver_name', v_approver_name,
        'approver_job_title', v_approver_job_title,
        'approver_role', v_approver_role
      );
    END IF;

    -- Step 4: No approver found at all → manual selection
    RETURN jsonb_build_object(
      'auto_resolved', false,
      'reason', 'no_dept_rep_found',
      'approver_id', NULL,
      'approver_name', NULL,
      'approver_job_title', NULL,
      'approver_role', NULL
    );
  END IF;
END;
$function$;
