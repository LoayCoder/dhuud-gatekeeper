-- Fix Contractor Consultant Workflow: Pool Assignment & Routing Fallback

-- 1. Update Auto-Route to enable Pool Assignment (NULL assignee) for Consultants
CREATE OR REPLACE FUNCTION public.auto_route_observation_on_submit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_assigned_to UUID;
  v_new_status TEXT;
  v_branch_id UUID;
  v_consultant_exists BOOLEAN;
BEGIN
  IF NEW.event_type != 'observation' OR NEW.status != 'submitted' THEN
    RETURN NEW;
  END IF;

  IF NEW.approval_manager_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  v_branch_id := COALESCE(NEW.branch_id,
    (SELECT branch_id FROM sites WHERE id = NEW.site_id AND deleted_at IS NULL));

  -- LOGIC FOR CONTRACTOR OBSERVATIONS
  IF NEW.related_contractor_company_id IS NOT NULL THEN
    -- Check if ANY Contractor Consultant exists for this branch (or tenant-wide)
    SELECT EXISTS (
      SELECT 1
      FROM user_role_assignments ura
      JOIN roles r ON r.id = ura.role_id
      JOIN profiles p ON p.id = ura.user_id
      WHERE ura.tenant_id = NEW.tenant_id
        AND (ura.branch_id = v_branch_id OR ura.branch_id IS NULL)
        AND r.code = 'contractor_consultant'
        AND r.is_active = true
        AND p.deleted_at IS NULL
    ) INTO v_consultant_exists;

    IF v_consultant_exists THEN
      -- POOL ASSIGNMENT: Set status but leave approval_manager_id NULL
      NEW.status := 'pending_consultant_screening';
      NEW.approval_manager_id := NULL;
      RETURN NEW;
    END IF;
  END IF;

  -- FALLBACK / NON-CONTRACTOR: Route to Dept Rep (Assign Specific User)
  SELECT ura.user_id INTO v_assigned_to
  FROM user_role_assignments ura
  JOIN roles r ON r.id = ura.role_id
  JOIN profiles p ON p.id = ura.user_id
  WHERE ura.tenant_id = NEW.tenant_id
    AND (ura.branch_id = v_branch_id OR ura.branch_id IS NULL)
    AND r.code = 'department_representative'
    AND r.is_active = true
    AND p.deleted_at IS NULL
  ORDER BY
    CASE WHEN ura.branch_id = v_branch_id THEN 0 ELSE 1 END,
    ura.assigned_at
  LIMIT 1;

  v_new_status := 'pending_dept_rep_approval';

  IF v_assigned_to IS NOT NULL THEN
    NEW.approval_manager_id := v_assigned_to;
    NEW.status := v_new_status;
  END IF;

  RETURN NEW;
END;
$$;

-- 2. Update Consultant Screening Completion with Fallback Cascade
CREATE OR REPLACE FUNCTION public.consultant_complete_screening(p_incident_id uuid, p_notes text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id uuid;
  v_old_status text;
  v_new_status text;
  v_user_id uuid;
  v_target_user_id uuid;
  v_branch_id uuid;
  v_routed_to_role text;
BEGIN
  v_user_id := auth.uid();

  SELECT tenant_id, status, branch_id INTO v_tenant_id, v_old_status, v_branch_id
  FROM incidents
  WHERE id = p_incident_id AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Incident not found');
  END IF;

  -- Allow both legacy and new status names
  IF v_old_status NOT IN ('pending_consultant_screening', 'expert_screening') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Observation not in consultant screening stage');
  END IF;

  -- CASCADE 1: Try Site Client
  SELECT ura.user_id INTO v_target_user_id
  FROM user_role_assignments ura
  JOIN roles r ON r.id = ura.role_id
  JOIN profiles p ON p.id = ura.user_id
  WHERE ura.tenant_id = v_tenant_id
    AND (ura.branch_id = v_branch_id OR ura.branch_id IS NULL)
    AND r.code = 'site_client'
    AND r.is_active = true
    AND p.deleted_at IS NULL
  ORDER BY
    CASE WHEN ura.branch_id = v_branch_id THEN 0 ELSE 1 END,
    ura.assigned_at
  LIMIT 1;

  IF v_target_user_id IS NOT NULL THEN
    v_new_status := 'pending_site_client_approval';
    v_routed_to_role := 'site_client';
  ELSE
    -- CASCADE 2: Try HSSE Expert
    SELECT ura.user_id INTO v_target_user_id
    FROM user_role_assignments ura
    JOIN roles r ON r.id = ura.role_id
    JOIN profiles p ON p.id = ura.user_id
    WHERE ura.tenant_id = v_tenant_id
      AND (ura.branch_id = v_branch_id OR ura.branch_id IS NULL)
      AND r.code = 'hsse_expert'
      AND r.is_active = true
      AND p.deleted_at IS NULL
    ORDER BY
      CASE WHEN ura.branch_id = v_branch_id THEN 0 ELSE 1 END,
      ura.assigned_at
    LIMIT 1;

    IF v_target_user_id IS NOT NULL THEN
      v_new_status := 'pending_hsse_expert_review';
      v_routed_to_role := 'hsse_expert';
    ELSE
      -- CASCADE 3: Try Department Manager (facility_manager)
      -- Assuming 'facility_manager' is the code for Dept Manager based on common usage in this system
      SELECT ura.user_id INTO v_target_user_id
      FROM user_role_assignments ura
      JOIN roles r ON r.id = ura.role_id
      JOIN profiles p ON p.id = ura.user_id
      WHERE ura.tenant_id = v_tenant_id
        AND (ura.branch_id = v_branch_id OR ura.branch_id IS NULL)
        AND r.code IN ('facility_manager', 'department_manager') -- Check both potential codes
        AND r.is_active = true
        AND p.deleted_at IS NULL
      ORDER BY
        CASE WHEN ura.branch_id = v_branch_id THEN 0 ELSE 1 END,
        ura.assigned_at
      LIMIT 1;

      IF v_target_user_id IS NOT NULL THEN
        v_new_status := 'pending_department_manager_approval'; -- Needs to match system enum
        v_routed_to_role := 'department_manager';
      ELSE
         -- FATAL: No path found
         RETURN jsonb_build_object('success', false, 'error', 'No valid escalation path found (Missing Site Client, HSSE Expert, and Dept Manager)');
      END IF;
    END IF;
  END IF;

  -- Perform Update
  UPDATE incidents
  SET
    status = v_new_status,
    approval_manager_id = v_target_user_id,
    consultant_screened_at = now(),
    consultant_screening_notes = p_notes,
    updated_at = now()
  WHERE id = p_incident_id;

  INSERT INTO incident_audit_logs (incident_id, tenant_id, actor_id, action, new_value)
  VALUES (
    p_incident_id,
    v_tenant_id,
    v_user_id,
    'consultant_screening_complete',
    jsonb_build_object(
      'previous_status', v_old_status,
      'new_status', v_new_status,
      'routed_to', v_routed_to_role,
      'assigned_to', v_target_user_id,
      'notes', p_notes
    )
  );

  RETURN jsonb_build_object('success', true, 'new_status', v_new_status, 'routed_to', v_routed_to_role);
END;
$$;
