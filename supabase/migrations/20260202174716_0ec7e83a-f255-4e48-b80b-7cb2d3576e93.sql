-- RPC function to auto-resolve approver for internal gate passes
-- Logic:
-- 1. If user is dept_rep/manager → route to their manager from manager_team
-- 2. Else → route to dept_rep in user's assigned_department_id
-- 3. Fallback → return null (UI shows dropdown)

CREATE OR REPLACE FUNCTION public.get_auto_approver_for_gate_pass(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_dept_id UUID;
  v_is_dept_rep_or_manager BOOLEAN := FALSE;
  v_approver_id UUID;
  v_approver_name TEXT;
  v_approver_job_title TEXT;
  v_approver_role TEXT;
  v_result JSONB;
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
      -- No manager found in manager_team
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
    -- Normal employee → find dept rep in their department
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
    ELSE
      -- No dept rep found
      RETURN jsonb_build_object(
        'auto_resolved', false,
        'reason', 'no_dept_rep_found',
        'approver_id', NULL,
        'approver_name', NULL,
        'approver_job_title', NULL,
        'approver_role', NULL
      );
    END IF;
  END IF;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_auto_approver_for_gate_pass(UUID) TO authenticated;