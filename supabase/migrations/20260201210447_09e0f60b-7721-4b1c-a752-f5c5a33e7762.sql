-- Fix: Remove ura.deleted_at reference from 3-parameter can_approve_gate_pass function
-- Must drop first due to return type conflict

DROP FUNCTION IF EXISTS public.can_approve_gate_pass(uuid, uuid, text);

CREATE FUNCTION public.can_approve_gate_pass(
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
  v_is_approver boolean := false;
  v_tenant_id uuid;
BEGIN
  -- Get user's tenant
  SELECT tenant_id INTO v_tenant_id
  FROM profiles
  WHERE id = p_user_id;

  -- Get gate pass details
  SELECT gp.*, cc.consultant_id
  INTO v_gate_pass
  FROM gate_passes gp
  LEFT JOIN contractor_companies cc ON cc.id = gp.company_id
  WHERE gp.id = p_gate_pass_id
    AND gp.tenant_id = v_tenant_id
    AND gp.deleted_at IS NULL;

  IF v_gate_pass IS NULL THEN
    RETURN false;
  END IF;

  -- Get user roles (FIXED: removed ura.deleted_at reference)
  SELECT array_agg(r.code)
  INTO v_user_roles
  FROM user_role_assignments ura
  JOIN roles r ON r.id = ura.role_id AND r.is_active = true
  WHERE ura.user_id = p_user_id;

  IF v_user_roles IS NULL THEN
    v_user_roles := ARRAY[]::text[];
  END IF;

  -- Check based on approval stage
  CASE p_stage
    -- Department approval stage (internal requests)
    WHEN 'pending_dept_approval' THEN
      -- Department representative can approve
      IF 'department_representative' = ANY(v_user_roles) THEN
        -- Verify user is in the same department as the requester
        SELECT EXISTS (
          SELECT 1 FROM profiles req
          JOIN profiles approver ON approver.id = p_user_id
          WHERE req.id = v_gate_pass.requested_by
            AND req.department_id = approver.department_id
        ) INTO v_is_approver;
      END IF;
      
      -- Department manager can also approve
      IF NOT v_is_approver AND 'department_manager' = ANY(v_user_roles) THEN
        SELECT EXISTS (
          SELECT 1 FROM profiles req
          JOIN profiles approver ON approver.id = p_user_id
          WHERE req.id = v_gate_pass.requested_by
            AND req.department_id = approver.department_id
        ) INTO v_is_approver;
      END IF;

    -- Contractor approval stage (external requests)
    WHEN 'pending_contractor_approval' THEN
      -- Contractor consultant can approve
      IF 'contractor_consultant' = ANY(v_user_roles) THEN
        -- Check if user is the consultant for this company
        v_is_approver := (v_gate_pass.consultant_id = p_user_id);
      END IF;

    -- Club management acknowledgment stage
    WHEN 'pending_club_mgmt_ack' THEN
      -- Golf club department rep or manager can acknowledge
      IF 'department_representative' = ANY(v_user_roles) OR 'department_manager' = ANY(v_user_roles) THEN
        SELECT EXISTS (
          SELECT 1 FROM profiles p
          JOIN departments d ON d.id = p.department_id
          WHERE p.id = p_user_id
            AND d.code = 'GOLF_CLUB'
        ) INTO v_is_approver;
      END IF;

    -- Security approval stage (final approval)
    WHEN 'pending_security_approval' THEN
      -- Security supervisor can approve
      IF 'security_supervisor' = ANY(v_user_roles) THEN
        v_is_approver := true;
      END IF;
      
      -- Security manager can also approve
      IF NOT v_is_approver AND 'security_manager' = ANY(v_user_roles) THEN
        v_is_approver := true;
      END IF;

    ELSE
      v_is_approver := false;
  END CASE;

  RETURN v_is_approver;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.can_approve_gate_pass(uuid, uuid, text) TO authenticated;