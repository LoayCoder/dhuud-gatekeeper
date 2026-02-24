
-- ============================================================
-- Fix #1: Update auto_route_observation_on_submit
-- Route all contractor observations to consultant pool (approval_manager_id = NULL)
-- with status 'expert_screening' regardless of severity
-- ============================================================

CREATE OR REPLACE FUNCTION public.auto_route_observation_on_submit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
      FROM user_roles ur
      JOIN profiles p ON p.id = ur.user_id
      JOIN roles r ON r.id = ur.role_id
      WHERE r.code = 'contractor_consultant'
        AND p.tenant_id = v_tenant_id
        AND p.branch_id = v_branch_id
        AND p.deleted_at IS NULL
        AND ur.deleted_at IS NULL
    ) INTO v_has_consultant;

    IF v_has_consultant THEN
      -- Route to consultant pool (unassigned) with expert_screening status
      -- approval_manager_id is NULL so any consultant in the branch can claim it
      NEW.status := 'expert_screening';
      NEW.approval_manager_id := NULL;
      RETURN NEW;
    END IF;
  END IF;

  -- Non-contractor or no consultant available: route to department representative
  SELECT p.id INTO v_dept_rep_id
  FROM user_roles ur
  JOIN profiles p ON p.id = ur.user_id
  JOIN roles r ON r.id = ur.role_id
  WHERE r.code = 'department_representative'
    AND p.tenant_id = v_tenant_id
    AND p.branch_id = v_branch_id
    AND p.department_id = NEW.department_id
    AND p.deleted_at IS NULL
    AND ur.deleted_at IS NULL
  LIMIT 1;

  IF v_dept_rep_id IS NOT NULL THEN
    NEW.status := 'pending_dept_rep_approval';
    NEW.approval_manager_id := v_dept_rep_id;
  ELSE
    -- Fallback: leave as submitted, will need manual assignment
    NEW.status := 'submitted';
    NEW.approval_manager_id := NULL;
  END IF;

  RETURN NEW;
END;
$$;

-- Re-attach trigger (drop first to be safe)
DROP TRIGGER IF EXISTS trg_auto_route_observation ON incidents;
CREATE TRIGGER trg_auto_route_observation
  BEFORE INSERT OR UPDATE ON incidents
  FOR EACH ROW
  EXECUTE FUNCTION auto_route_observation_on_submit();


-- ============================================================
-- Fix #2: Consultant complete screening with cascade fallback
-- After consultant finishes screening, route to:
--   1. Site Client (if exists)
--   2. HSSE Expert (if no site client)
--   3. Department Manager (if no HSSE expert)
--   4. Error if nobody found
-- ============================================================

CREATE OR REPLACE FUNCTION public.consultant_complete_screening(
  p_incident_id UUID,
  p_review_notes TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

  -- Fetch incident
  SELECT id, tenant_id, branch_id, department_id, status, site_id, related_contractor_company_id
  INTO v_incident
  FROM incidents
  WHERE id = p_incident_id
    AND deleted_at IS NULL;

  IF v_incident IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Incident not found');
  END IF;

  -- Verify status is expert_screening or pending_consultant_screening
  IF v_incident.status NOT IN ('expert_screening', 'pending_consultant_screening', 'pending_consultant_review') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid status for screening completion: ' || v_incident.status);
  END IF;

  v_tenant_id := v_incident.tenant_id;
  v_branch_id := v_incident.branch_id;

  -- Cascade 1: Try Site Client
  SELECT p.id INTO v_next_approver_id
  FROM user_roles ur
  JOIN profiles p ON p.id = ur.user_id
  JOIN roles r ON r.id = ur.role_id
  WHERE r.code = 'site_client'
    AND p.tenant_id = v_tenant_id
    AND p.branch_id = v_branch_id
    AND p.deleted_at IS NULL
    AND ur.deleted_at IS NULL
  LIMIT 1;

  IF v_next_approver_id IS NOT NULL THEN
    v_next_status := 'site_client_approval';
    v_route_label := 'site_client';
  ELSE
    -- Cascade 2: Try HSSE Expert
    SELECT p.id INTO v_next_approver_id
    FROM user_roles ur
    JOIN profiles p ON p.id = ur.user_id
    JOIN roles r ON r.id = ur.role_id
    WHERE r.code IN ('hsse_expert', 'hsse_officer')
      AND p.tenant_id = v_tenant_id
      AND p.deleted_at IS NULL
      AND ur.deleted_at IS NULL
    LIMIT 1;

    IF v_next_approver_id IS NOT NULL THEN
      v_next_status := 'pending_hsse_validation';
      v_route_label := 'hsse_expert';
    ELSE
      -- Cascade 3: Try Department Manager
      SELECT p.id INTO v_next_approver_id
      FROM user_roles ur
      JOIN profiles p ON p.id = ur.user_id
      JOIN roles r ON r.id = ur.role_id
      WHERE r.code = 'department_head'
        AND p.tenant_id = v_tenant_id
        AND p.branch_id = v_branch_id
        AND p.deleted_at IS NULL
        AND ur.deleted_at IS NULL
      LIMIT 1;

      IF v_next_approver_id IS NOT NULL THEN
        v_next_status := 'pending_department_manager_approval';
        v_route_label := 'department_manager';
      ELSE
        -- No one found - return error
        RETURN jsonb_build_object(
          'success', false,
          'error', 'No approver found. No site client, HSSE expert, or department manager available for this branch.'
        );
      END IF;
    END IF;
  END IF;

  -- Update the incident
  UPDATE incidents
  SET status = v_next_status,
      approval_manager_id = v_next_approver_id,
      updated_at = now()
  WHERE id = p_incident_id;

  -- Log to audit
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
$$;
