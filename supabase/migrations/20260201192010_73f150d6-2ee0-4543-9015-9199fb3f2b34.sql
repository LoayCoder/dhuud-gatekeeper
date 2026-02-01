-- Add club_mgmt_ack case to can_approve_gate_pass function
CREATE OR REPLACE FUNCTION public.can_approve_gate_pass(
  p_user_id UUID,
  p_gate_pass_id UUID,
  p_approval_stage TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pass RECORD;
  v_user_roles TEXT[];
  v_user_dept_id UUID;
  v_user_profile RECORD;
  v_is_project_manager BOOLEAN := FALSE;
  v_is_contractor_consultant BOOLEAN := FALSE;
  v_is_security_supervisor BOOLEAN := FALSE;
  v_can_approve BOOLEAN := FALSE;
  v_reason TEXT := '';
  v_club_mgmt_dept_id UUID;
BEGIN
  -- Get the gate pass
  SELECT * INTO v_pass
  FROM material_gate_passes
  WHERE id = p_gate_pass_id AND deleted_at IS NULL;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'Gate pass not found');
  END IF;
  
  -- Get user roles
  SELECT array_agg(r.code)
  INTO v_user_roles
  FROM user_role_assignments ura
  JOIN roles r ON r.id = ura.role_id AND r.is_active = true
  WHERE ura.user_id = p_user_id AND ura.deleted_at IS NULL;
  
  IF v_user_roles IS NULL THEN
    v_user_roles := ARRAY[]::TEXT[];
  END IF;
  
  -- Get user profile (including department assignment)
  SELECT p.id, p.tenant_id, p.assigned_department_id
  INTO v_user_profile
  FROM profiles p
  WHERE p.id = p_user_id;
  
  v_user_dept_id := v_user_profile.assigned_department_id;
  
  -- Check specific role flags
  v_is_project_manager := 'project_manager' = ANY(v_user_roles) OR 'department_manager' = ANY(v_user_roles);
  v_is_contractor_consultant := 'contractor_consultant' = ANY(v_user_roles);
  v_is_security_supervisor := 'security_supervisor' = ANY(v_user_roles) OR 'security_manager' = ANY(v_user_roles);
  
  -- Check approval based on stage
  CASE p_approval_stage
    WHEN 'contractor' THEN
      -- Stage: Contractor Consultant approval (External workflow stage 1)
      IF v_pass.status != 'pending_contractor_approval' THEN
        RETURN jsonb_build_object('allowed', false, 'reason', 'Not at contractor approval stage');
      END IF;
      -- Must be contractor_consultant
      v_can_approve := v_is_contractor_consultant OR 'admin' = ANY(v_user_roles);
      v_reason := 'Requires contractor_consultant role';
      
    WHEN 'dept_ack' THEN
      -- Stage: Dept Rep acknowledgment (External workflow stage 2)
      IF v_pass.status != 'pending_dept_ack' THEN
        RETURN jsonb_build_object('allowed', false, 'reason', 'Not at department acknowledgment stage');
      END IF;
      -- Must be department_representative
      v_can_approve := ('department_representative' = ANY(v_user_roles) OR 'department_manager' = ANY(v_user_roles))
                       OR 'admin' = ANY(v_user_roles);
      v_reason := 'Requires department_representative role';
      
    WHEN 'dept_approval' THEN
      -- Stage: Dept Rep/Manager approval (Internal workflow stage 1)
      IF v_pass.status != 'pending_dept_approval' THEN
        RETURN jsonb_build_object('allowed', false, 'reason', 'Not at department approval stage');
      END IF;
      -- User must be the designated approver (approval_from_id) OR be a dept rep/manager
      v_can_approve := (
        (v_pass.approval_from_id = p_user_id)
        OR (('department_representative' = ANY(v_user_roles) OR 'department_manager' = ANY(v_user_roles)) AND v_pass.requester_department_id = v_user_dept_id)
      ) OR 'admin' = ANY(v_user_roles);
      v_reason := 'Must be the designated approver or department representative of the requester''s department';
      
    WHEN 'club_mgmt_ack' THEN
      -- Stage: Golf Club Management acknowledgment (applies to BOTH internal and external paths)
      IF v_pass.status != 'pending_club_mgmt_ack' THEN
        RETURN jsonb_build_object('allowed', false, 'reason', 'Not at Golf Club Management acknowledgment stage');
      END IF;
      
      -- Find Golf Club Management department
      SELECT id INTO v_club_mgmt_dept_id 
      FROM departments 
      WHERE (name = 'Golf Club Management' OR name ILIKE '%golf%club%management%' OR name ILIKE '%club%management%')
        AND deleted_at IS NULL 
      ORDER BY CASE WHEN name = 'Golf Club Management' THEN 0 ELSE 1 END
      LIMIT 1;
      
      -- User must be department_representative or department_manager AND belong to Golf Club Management
      v_can_approve := (
        ('department_representative' = ANY(v_user_roles) OR 'department_manager' = ANY(v_user_roles))
        AND v_user_dept_id = v_club_mgmt_dept_id
      ) OR 'admin' = ANY(v_user_roles);
      
      v_reason := 'Requires department_representative role in Golf Club Management department';
      
    WHEN 'security' THEN
      -- Stage: Security Supervisor approval (Final stage for both workflows)
      IF v_pass.status != 'pending_security_approval' THEN
        RETURN jsonb_build_object('allowed', false, 'reason', 'Not at security approval stage');
      END IF;
      -- Must be security supervisor
      v_can_approve := v_is_security_supervisor OR 'admin' = ANY(v_user_roles);
      v_reason := 'Requires security_supervisor role';
      
    -- Legacy stages for backward compatibility
    WHEN 'pm' THEN
      IF v_pass.status != 'pending_pm_approval' THEN
        RETURN jsonb_build_object('allowed', false, 'reason', 'Not at PM approval stage');
      END IF;
      v_can_approve := v_is_project_manager OR 'admin' = ANY(v_user_roles);
      v_reason := 'Requires project_manager or department_manager role';
      
    WHEN 'safety' THEN
      IF v_pass.status != 'pending_safety_approval' THEN
        RETURN jsonb_build_object('allowed', false, 'reason', 'Not at safety approval stage');
      END IF;
      v_can_approve := 'hsse_officer' = ANY(v_user_roles) OR 'hsse_expert' = ANY(v_user_roles) 
                       OR 'hsse_manager' = ANY(v_user_roles) OR 'admin' = ANY(v_user_roles);
      v_reason := 'Requires HSSE role';
      
    ELSE
      RETURN jsonb_build_object('allowed', false, 'reason', 'Unknown approval stage: ' || p_approval_stage);
  END CASE;
  
  RETURN jsonb_build_object(
    'allowed', v_can_approve,
    'reason', CASE WHEN v_can_approve THEN 'Authorized' ELSE v_reason END,
    'user_roles', v_user_roles,
    'user_dept_id', v_user_dept_id
  );
END;
$$;

-- Also update get_user_pending_gate_passes to include club_mgmt_ack stage
CREATE OR REPLACE FUNCTION public.get_user_pending_gate_passes(p_user_id UUID)
RETURNS SETOF material_gate_passes
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_roles TEXT[];
  v_user_profile RECORD;
  v_user_dept_id UUID;
  v_club_mgmt_dept_id UUID;
BEGIN
  -- Get user roles
  SELECT array_agg(r.code)
  INTO v_user_roles
  FROM user_role_assignments ura
  JOIN roles r ON r.id = ura.role_id AND r.is_active = true
  WHERE ura.user_id = p_user_id AND ura.deleted_at IS NULL;
  
  IF v_user_roles IS NULL THEN
    v_user_roles := ARRAY[]::TEXT[];
  END IF;
  
  -- Get user profile
  SELECT p.id, p.tenant_id, p.assigned_department_id
  INTO v_user_profile
  FROM profiles p
  WHERE p.id = p_user_id;
  
  v_user_dept_id := v_user_profile.assigned_department_id;
  
  -- Find Golf Club Management department for club_mgmt_ack stage
  SELECT id INTO v_club_mgmt_dept_id 
  FROM departments 
  WHERE (name = 'Golf Club Management' OR name ILIKE '%golf%club%management%' OR name ILIKE '%club%management%')
    AND deleted_at IS NULL 
  ORDER BY CASE WHEN name = 'Golf Club Management' THEN 0 ELSE 1 END
  LIMIT 1;
  
  RETURN QUERY
  SELECT gp.*
  FROM material_gate_passes gp
  WHERE gp.deleted_at IS NULL
    AND gp.tenant_id = v_user_profile.tenant_id
    AND gp.requested_by != p_user_id  -- Exclude own requests
    AND (
      -- Admin can see all pending
      ('admin' = ANY(v_user_roles))
      
      -- Contractor Consultant can see pending_contractor_approval
      OR (gp.status = 'pending_contractor_approval' AND 'contractor_consultant' = ANY(v_user_roles))
      
      -- Dept Rep can see pending_dept_ack
      OR (gp.status = 'pending_dept_ack' AND ('department_representative' = ANY(v_user_roles) OR 'department_manager' = ANY(v_user_roles)))
      
      -- Dept Rep/Manager can see pending_dept_approval for their department or if they're the designated approver
      OR (gp.status = 'pending_dept_approval' 
          AND (
            gp.approval_from_id = p_user_id
            OR (('department_representative' = ANY(v_user_roles) OR 'department_manager' = ANY(v_user_roles)) AND gp.requester_department_id = v_user_dept_id)
          ))
      
      -- Golf Club Management Dept Rep can see pending_club_mgmt_ack
      OR (gp.status = 'pending_club_mgmt_ack' 
          AND ('department_representative' = ANY(v_user_roles) OR 'department_manager' = ANY(v_user_roles))
          AND v_user_dept_id = v_club_mgmt_dept_id)
      
      -- Security Supervisor can see pending_security_approval
      OR (gp.status = 'pending_security_approval' AND ('security_supervisor' = ANY(v_user_roles) OR 'security_manager' = ANY(v_user_roles)))
      
      -- Legacy: PM can see pending_pm_approval
      OR (gp.status = 'pending_pm_approval' AND ('project_manager' = ANY(v_user_roles) OR 'department_manager' = ANY(v_user_roles)))
      
      -- Legacy: Safety can see pending_safety_approval
      OR (gp.status = 'pending_safety_approval' AND ('hsse_officer' = ANY(v_user_roles) OR 'hsse_expert' = ANY(v_user_roles) OR 'hsse_manager' = ANY(v_user_roles)))
    )
  ORDER BY gp.created_at DESC;
END;
$$;