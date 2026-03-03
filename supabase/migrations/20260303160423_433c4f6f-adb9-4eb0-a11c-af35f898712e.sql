
-- Fix auto_route_observation_on_submit: replace user_roles with user_role_assignments
CREATE OR REPLACE FUNCTION public.auto_route_observation_on_submit()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_tenant_id UUID;
  v_branch_id UUID;
  v_contractor_id UUID;
  v_has_consultant BOOLEAN := FALSE;
  v_dept_rep_id UUID;
  v_new_status TEXT;
BEGIN
  -- Only fire on INSERT or when status changes to 'submitted'
  IF TG_OP = 'INSERT' AND NEW.status != 'submitted' THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND (OLD.status = NEW.status OR NEW.status != 'submitted') THEN
    RETURN NEW;
  END IF;

  -- Only for observations
  IF NEW.event_type != 'observation' THEN
    RETURN NEW;
  END IF;

  v_tenant_id := NEW.tenant_id;
  v_branch_id := NEW.branch_id;
  v_contractor_id := NEW.related_contractor_company_id;

  -- Check if this is a contractor-related observation
  IF v_contractor_id IS NOT NULL THEN
    -- Check if any contractor consultant exists for this branch
    SELECT EXISTS(
      SELECT 1
      FROM user_role_assignments ur
      JOIN profiles p ON p.id = ur.user_id
      JOIN roles r ON r.id = ur.role_id
      WHERE r.code = 'contractor_consultant'
        AND ur.tenant_id = v_tenant_id
        AND (ur.branch_id = v_branch_id OR ur.branch_id IS NULL)
        AND p.deleted_at IS NULL
    ) INTO v_has_consultant;

    IF v_has_consultant THEN
      NEW.status := 'expert_screening';
      NEW.approval_manager_id := NULL;
      RETURN NEW;
    END IF;
  END IF;

  -- Non-contractor or no consultant available: route to department representative
  SELECT p.id INTO v_dept_rep_id
  FROM user_role_assignments ur
  JOIN profiles p ON p.id = ur.user_id
  JOIN roles r ON r.id = ur.role_id
  WHERE r.code = 'department_representative'
    AND ur.tenant_id = v_tenant_id
    AND (ur.branch_id = v_branch_id OR ur.branch_id IS NULL)
    AND p.deleted_at IS NULL
  ORDER BY
    CASE WHEN ur.branch_id = v_branch_id THEN 0 ELSE 1 END
  LIMIT 1;

  IF v_dept_rep_id IS NOT NULL THEN
    NEW.status := 'pending_dept_rep_approval';
    NEW.approval_manager_id := v_dept_rep_id;
  ELSE
    NEW.status := 'submitted';
    NEW.approval_manager_id := NULL;
  END IF;

  RETURN NEW;
END;
$function$;

-- Fix consultant_complete_screening (3-arg overload): replace user_roles with user_role_assignments
CREATE OR REPLACE FUNCTION public.consultant_complete_screening(p_incident_id uuid, p_review_notes text DEFAULT NULL::text, p_user_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_incident RECORD;
  v_actor_id UUID;
  v_next_approver_id UUID;
  v_next_status TEXT;
  v_route_label TEXT;
  v_tenant_id UUID;
  v_branch_id UUID;
BEGIN
  v_actor_id := COALESCE(p_user_id, auth.uid());

  SELECT id, tenant_id, branch_id, department_id, status, site_id, related_contractor_company_id
  INTO v_incident
  FROM incidents
  WHERE id = p_incident_id
    AND deleted_at IS NULL;

  IF v_incident IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Incident not found');
  END IF;

  IF v_incident.status NOT IN ('expert_screening', 'pending_consultant_screening', 'pending_consultant_review') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid status for screening completion: ' || v_incident.status);
  END IF;

  v_tenant_id := v_incident.tenant_id;
  v_branch_id := v_incident.branch_id;

  -- Cascade 1: Try Site Client
  SELECT p.id INTO v_next_approver_id
  FROM user_role_assignments ur
  JOIN profiles p ON p.id = ur.user_id
  JOIN roles r ON r.id = ur.role_id
  WHERE r.code = 'site_client'
    AND ur.tenant_id = v_tenant_id
    AND (ur.branch_id = v_branch_id OR ur.branch_id IS NULL)
    AND p.deleted_at IS NULL
  ORDER BY
    CASE WHEN ur.branch_id = v_branch_id THEN 0 ELSE 1 END
  LIMIT 1;

  IF v_next_approver_id IS NOT NULL THEN
    v_next_status := 'site_client_approval';
    v_route_label := 'site_client';
  ELSE
    -- Cascade 2: Try HSSE Expert
    SELECT p.id INTO v_next_approver_id
    FROM user_role_assignments ur
    JOIN profiles p ON p.id = ur.user_id
    JOIN roles r ON r.id = ur.role_id
    WHERE r.code IN ('hsse_expert', 'hsse_officer')
      AND ur.tenant_id = v_tenant_id
      AND p.deleted_at IS NULL
    ORDER BY ur.assigned_at
    LIMIT 1;

    IF v_next_approver_id IS NOT NULL THEN
      v_next_status := 'pending_hsse_validation';
      v_route_label := 'hsse_expert';
    ELSE
      -- Cascade 3: Try Department Manager
      SELECT p.id INTO v_next_approver_id
      FROM user_role_assignments ur
      JOIN profiles p ON p.id = ur.user_id
      JOIN roles r ON r.id = ur.role_id
      WHERE r.code = 'department_head'
        AND ur.tenant_id = v_tenant_id
        AND (ur.branch_id = v_branch_id OR ur.branch_id IS NULL)
        AND p.deleted_at IS NULL
      ORDER BY
        CASE WHEN ur.branch_id = v_branch_id THEN 0 ELSE 1 END
      LIMIT 1;

      IF v_next_approver_id IS NOT NULL THEN
        v_next_status := 'pending_department_manager_approval';
        v_route_label := 'department_manager';
      ELSE
        RETURN jsonb_build_object(
          'success', false,
          'error', 'No approver found. No site client, HSSE expert, or department manager available for this branch.'
        );
      END IF;
    END IF;
  END IF;

  UPDATE incidents
  SET status = v_next_status,
      approval_manager_id = v_next_approver_id,
      updated_at = now()
  WHERE id = p_incident_id;

  INSERT INTO incident_audit_log (incident_id, actor_id, action, old_value, new_value, notes, tenant_id)
  VALUES (
    p_incident_id,
    v_actor_id,
    'STATUS_CHANGE',
    jsonb_build_object('status', v_incident.status),
    jsonb_build_object('status', v_next_status, 'approval_manager_id', v_next_approver_id),
    COALESCE(p_review_notes, 'Consultant screening completed. Routed to ' || v_route_label),
    v_tenant_id
  );

  RETURN jsonb_build_object(
    'success', true,
    'new_status', v_next_status,
    'routed_to', v_route_label,
    'approver_id', v_next_approver_id
  );
END;
$function$;
