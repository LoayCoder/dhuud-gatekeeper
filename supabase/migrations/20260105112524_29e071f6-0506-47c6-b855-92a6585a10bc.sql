-- Personal Dashboard Stats RPC Function
-- Returns user-specific dashboard statistics for the logged-in user

CREATE OR REPLACE FUNCTION public.get_personal_dashboard_stats()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_tenant_id UUID;
  v_result JSONB;
BEGIN
  -- Get user's tenant
  SELECT tenant_id INTO v_tenant_id
  FROM profiles
  WHERE id = v_user_id;
  
  IF v_tenant_id IS NULL THEN
    RETURN NULL;
  END IF;
  
  SELECT jsonb_build_object(
    'actions', (
      SELECT jsonb_build_object(
        'pending', COUNT(*) FILTER (WHERE status IN ('assigned', 'pending')),
        'in_progress', COUNT(*) FILTER (WHERE status = 'in_progress'),
        'overdue', COUNT(*) FILTER (WHERE status NOT IN ('completed', 'verified', 'closed') AND due_date < CURRENT_DATE),
        'completed_this_week', COUNT(*) FILTER (WHERE status IN ('completed', 'verified') AND completed_date >= CURRENT_DATE - INTERVAL '7 days'),
        'due_this_week', COUNT(*) FILTER (WHERE status NOT IN ('completed', 'verified', 'closed') AND due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'),
        'returned', COUNT(*) FILTER (WHERE status = 'returned')
      )
      FROM corrective_actions
      WHERE tenant_id = v_tenant_id 
        AND assigned_to = v_user_id 
        AND deleted_at IS NULL
    ),
    'visitors', (
      SELECT jsonb_build_object(
        'pending_approval', COUNT(*) FILTER (WHERE status = 'pending_security'),
        'arriving_today', COUNT(*) FILTER (WHERE status = 'approved' AND DATE(valid_from) = CURRENT_DATE),
        'on_site', COUNT(*) FILTER (WHERE status = 'checked_in'),
        'total_hosted', COUNT(*)
      )
      FROM visit_requests
      WHERE tenant_id = v_tenant_id 
        AND host_id = v_user_id 
        AND deleted_at IS NULL
    ),
    'gate_passes', (
      SELECT jsonb_build_object(
        'my_pending', COUNT(*) FILTER (WHERE status IN ('pending_pm_approval', 'pending_safety_approval')),
        'approved_today', COUNT(*) FILTER (WHERE status = 'approved' AND pass_date = CURRENT_DATE),
        'awaiting_entry', COUNT(*) FILTER (WHERE status = 'approved' AND entry_time IS NULL),
        'total', COUNT(*)
      )
      FROM material_gate_passes
      WHERE tenant_id = v_tenant_id 
        AND requested_by = v_user_id 
        AND deleted_at IS NULL
    ),
    'inspections', (
      SELECT jsonb_build_object(
        'assigned_pending', COUNT(*) FILTER (WHERE status IN ('draft', 'in_progress')),
        'due_today', COUNT(*) FILTER (WHERE status IN ('draft', 'in_progress') AND DATE(started_at) = CURRENT_DATE),
        'overdue', COUNT(*) FILTER (WHERE status IN ('draft', 'in_progress') AND DATE(started_at) < CURRENT_DATE),
        'completed_this_week', COUNT(*) FILTER (WHERE status = 'closed' AND completed_at >= CURRENT_DATE - INTERVAL '7 days')
      )
      FROM inspection_sessions
      WHERE tenant_id = v_tenant_id 
        AND inspector_id = v_user_id 
        AND deleted_at IS NULL
    ),
    'incidents', (
      SELECT jsonb_build_object(
        'my_reported', COUNT(*) FILTER (WHERE reporter_id = v_user_id),
        'pending_investigation', COUNT(*) FILTER (WHERE reporter_id = v_user_id AND status IN ('reported', 'under_investigation')),
        'closed_this_month', COUNT(*) FILTER (WHERE reporter_id = v_user_id AND status = 'closed' AND closed_at >= CURRENT_DATE - INTERVAL '30 days')
      )
      FROM incidents
      WHERE tenant_id = v_tenant_id 
        AND deleted_at IS NULL
    )
  ) INTO v_result;
  
  RETURN v_result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_personal_dashboard_stats() TO authenticated;