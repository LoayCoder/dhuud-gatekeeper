-- Update auto_route_observation_on_submit to assign a specific Contractor Consultant instead of relying on pool assignment

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
  v_contractor_consultant UUID;
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
    -- Try to find a specific Contractor Consultant for this branch (or tenant-wide)
    SELECT ura.user_id INTO v_contractor_consultant
    FROM user_role_assignments ura
    JOIN roles r ON r.id = ura.role_id
    JOIN profiles p ON p.id = ura.user_id
    WHERE ura.tenant_id = NEW.tenant_id
      AND (ura.branch_id = v_branch_id OR ura.branch_id IS NULL)
      AND r.code = 'contractor_consultant'
      AND r.is_active = true
      AND p.deleted_at IS NULL
    ORDER BY
      CASE WHEN ura.branch_id = v_branch_id THEN 0 ELSE 1 END,
      ura.assigned_at
    LIMIT 1;

    IF v_contractor_consultant IS NOT NULL THEN
      -- DEDICATED ASSIGNMENT: Set status AND explicitly assign to the specific consultant
      NEW.status := 'pending_consultant_screening';
      NEW.approval_manager_id := v_contractor_consultant;
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
