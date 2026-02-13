
-- Fix get_dashboard_quick_action_counts: replace rejected_invalid with valid statuses
DROP FUNCTION IF EXISTS public.get_dashboard_quick_action_counts();

CREATE OR REPLACE FUNCTION public.get_dashboard_quick_action_counts()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id UUID;
  v_tenant_id UUID;
  v_result jsonb;
BEGIN
  v_user_id := auth.uid();
  v_tenant_id := get_auth_tenant_id();
  
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Tenant ID not found';
  END IF;

  SELECT jsonb_build_object(
    'pending_approvals', (
      SELECT COUNT(*) FROM incidents 
      WHERE tenant_id = v_tenant_id 
        AND deleted_at IS NULL
        AND status IN ('pending_dept_rep_approval', 'expert_screening', 'pending_consultant_screening')
    ),
    'open_investigations', (
      SELECT COUNT(*) FROM investigations inv
      JOIN incidents i ON inv.incident_id = i.id
      WHERE i.tenant_id = v_tenant_id 
        AND i.deleted_at IS NULL
        AND inv.completed_at IS NULL
    ),
    'overdue_actions', (
      SELECT COUNT(*) FROM corrective_actions 
      WHERE tenant_id = v_tenant_id 
        AND deleted_at IS NULL
        AND status NOT IN ('closed', 'verified')
        AND due_date < CURRENT_DATE
    ),
    'my_actions', (
      SELECT COUNT(*) FROM corrective_actions 
      WHERE tenant_id = v_tenant_id 
        AND deleted_at IS NULL
        AND assigned_to = v_user_id
        AND status NOT IN ('closed', 'verified')
    ),
    'my_reports', (
      SELECT COUNT(*) FROM incidents
      WHERE tenant_id = v_tenant_id
        AND deleted_at IS NULL
        AND reporter_id = v_user_id
        AND status NOT IN ('closed', 'expert_rejected', 'manager_rejected')
    )
  ) INTO v_result;

  RETURN v_result;
END;
$function$;
