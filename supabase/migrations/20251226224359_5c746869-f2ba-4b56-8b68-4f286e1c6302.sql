-- Update function to scope open_investigations and overdue_actions by user role
CREATE OR REPLACE FUNCTION public.get_dashboard_quick_action_counts()
RETURNS JSONB
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_tenant_id UUID;
  v_user_id UUID;
  v_pending_approvals INTEGER := 0;
  v_open_investigations INTEGER := 0;
  v_overdue_actions INTEGER := 0;
  v_my_actions INTEGER := 0;
  v_is_hsse_expert BOOLEAN := FALSE;
  v_is_hsse_manager BOOLEAN := FALSE;
  v_user_department_id UUID;
BEGIN
  v_tenant_id := get_auth_tenant_id();
  v_user_id := auth.uid();
  
  -- Check user roles
  SELECT EXISTS (
    SELECT 1 FROM user_role_assignments ura
    JOIN roles r ON ura.role_id = r.id
    WHERE ura.user_id = v_user_id AND r.code = 'hsse_expert'
  ) INTO v_is_hsse_expert;
  
  SELECT EXISTS (
    SELECT 1 FROM user_role_assignments ura
    JOIN roles r ON ura.role_id = r.id
    WHERE ura.user_id = v_user_id AND r.code = 'hsse_manager'
  ) INTO v_is_hsse_manager;
  
  -- Get user's department
  SELECT department_id INTO v_user_department_id
  FROM profiles
  WHERE id = v_user_id;
  
  -- Pending approvals for this user (already user-specific)
  SELECT COUNT(*) INTO v_pending_approvals
  FROM incidents
  WHERE tenant_id = v_tenant_id
    AND deleted_at IS NULL
    AND (
      (status = 'pending_manager_approval' AND approval_manager_id = v_user_id)
      OR (status = 'pending_dept_rep_approval' AND approval_manager_id = v_user_id)
      OR (status IN ('pending_closure', 'pending_final_closure') AND v_is_hsse_manager)
    );
  
  -- Open investigations - scoped by role
  -- HSSE experts/managers see all, others see only where they're assigned as investigator
  IF v_is_hsse_expert OR v_is_hsse_manager THEN
    SELECT COUNT(*) INTO v_open_investigations
    FROM incidents
    WHERE tenant_id = v_tenant_id
      AND deleted_at IS NULL
      AND status IN ('investigation_in_progress', 'investigation_pending');
  ELSE
    SELECT COUNT(*) INTO v_open_investigations
    FROM incidents
    WHERE tenant_id = v_tenant_id
      AND deleted_at IS NULL
      AND status IN ('investigation_in_progress', 'investigation_pending')
      AND (
        investigator_id = v_user_id
        OR reported_by = v_user_id
        OR (v_user_department_id IS NOT NULL AND department_id = v_user_department_id)
      );
  END IF;
  
  -- Overdue actions - scoped by role
  -- HSSE experts/managers see all, others see only actions assigned to them or in their department
  IF v_is_hsse_expert OR v_is_hsse_manager THEN
    SELECT COUNT(*) INTO v_overdue_actions
    FROM corrective_actions
    WHERE tenant_id = v_tenant_id
      AND deleted_at IS NULL
      AND status NOT IN ('verified', 'closed', 'rejected')
      AND due_date < CURRENT_DATE;
  ELSE
    SELECT COUNT(*) INTO v_overdue_actions
    FROM corrective_actions ca
    WHERE ca.tenant_id = v_tenant_id
      AND ca.deleted_at IS NULL
      AND ca.status NOT IN ('verified', 'closed', 'rejected')
      AND ca.due_date < CURRENT_DATE
      AND (
        ca.assigned_to = v_user_id
        OR ca.verifier_id = v_user_id
        OR (v_user_department_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM incidents i 
          WHERE i.id = ca.incident_id 
          AND i.department_id = v_user_department_id
        ))
      );
  END IF;
  
  -- My actions (already user-specific)
  SELECT COUNT(*) INTO v_my_actions
  FROM corrective_actions
  WHERE tenant_id = v_tenant_id
    AND deleted_at IS NULL
    AND assigned_to = v_user_id
    AND status NOT IN ('verified', 'closed', 'rejected');
  
  RETURN jsonb_build_object(
    'pending_approvals', v_pending_approvals,
    'open_investigations', v_open_investigations,
    'overdue_actions', v_overdue_actions,
    'my_actions', v_my_actions
  );
END;
$function$;