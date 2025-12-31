-- Fix get_hsse_contact_for_location function: remove incorrect ura.deleted_at reference
CREATE OR REPLACE FUNCTION public.get_hsse_contact_for_location(p_branch_id uuid)
RETURNS TABLE(
  id uuid,
  full_name text,
  phone_number text,
  role_name text,
  role_code text,
  avatar_url text
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT ON (p.id)
    p.id,
    p.full_name,
    p.phone_number,
    r.name as role_name,
    r.code as role_code,
    p.avatar_url
  FROM public.profiles p
  JOIN public.user_role_assignments ura ON p.id = ura.user_id
  JOIN public.roles r ON ura.role_id = r.id
  WHERE p.assigned_branch_id = p_branch_id
    AND r.code IN ('hsse_officer', 'hsse_expert', 'hsse_manager')
    AND p.is_active = true
    AND p.deleted_at IS NULL
    AND p.tenant_id = public.get_auth_tenant_id()
  ORDER BY p.id,
    CASE r.code 
      WHEN 'hsse_officer' THEN 1
      WHEN 'hsse_expert' THEN 2
      WHEN 'hsse_manager' THEN 3
    END
  LIMIT 1;
END;
$$;

-- Create dashboard stats function for Department Representatives
CREATE OR REPLACE FUNCTION public.get_dept_rep_event_dashboard_stats()
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = 'public'
AS $$
DECLARE
  v_user_id uuid;
  v_tenant_id uuid;
  v_dept_id uuid;
  v_new_count integer;
  v_in_progress_count integer;
  v_overdue_count integer;
  v_total_count integer;
BEGIN
  v_user_id := auth.uid();
  v_tenant_id := get_auth_tenant_id();
  
  -- Get user's assigned department
  SELECT assigned_department_id INTO v_dept_id
  FROM profiles WHERE id = v_user_id AND deleted_at IS NULL;
  
  IF v_dept_id IS NULL THEN
    RETURN jsonb_build_object(
      'new_count', 0,
      'in_progress_count', 0,
      'overdue_count', 0,
      'total_count', 0,
      'has_department', false
    );
  END IF;
  
  -- Count NEW (pending dept rep approval)
  SELECT COUNT(*) INTO v_new_count
  FROM incidents i
  LEFT JOIN profiles reporter ON reporter.id = i.reporter_id
  WHERE i.tenant_id = v_tenant_id
    AND i.deleted_at IS NULL
    AND i.status = 'pending_dept_rep_approval'
    AND (i.department_id = v_dept_id OR reporter.assigned_department_id = v_dept_id);
  
  -- Count IN PROGRESS (observation_actions_pending status in same department)
  SELECT COUNT(*) INTO v_in_progress_count
  FROM incidents i
  LEFT JOIN profiles reporter ON reporter.id = i.reporter_id
  WHERE i.tenant_id = v_tenant_id
    AND i.deleted_at IS NULL
    AND i.status = 'observation_actions_pending'
    AND (i.department_id = v_dept_id OR reporter.assigned_department_id = v_dept_id);
  
  -- Count OVERDUE (actions past due date based on SLA)
  SELECT COUNT(DISTINCT i.id) INTO v_overdue_count
  FROM incidents i
  LEFT JOIN profiles reporter ON reporter.id = i.reporter_id
  LEFT JOIN corrective_actions ca ON ca.incident_id = i.id AND ca.deleted_at IS NULL
  WHERE i.tenant_id = v_tenant_id
    AND i.deleted_at IS NULL
    AND i.status IN ('pending_dept_rep_approval', 'observation_actions_pending')
    AND (i.department_id = v_dept_id OR reporter.assigned_department_id = v_dept_id)
    AND ca.due_date < CURRENT_DATE
    AND ca.status NOT IN ('completed', 'verified', 'closed');
  
  -- Total pending items (new + in progress)
  v_total_count := v_new_count + v_in_progress_count;
  
  RETURN jsonb_build_object(
    'new_count', v_new_count,
    'in_progress_count', v_in_progress_count,
    'overdue_count', v_overdue_count,
    'total_count', v_total_count,
    'has_department', true
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_dept_rep_event_dashboard_stats() TO authenticated;