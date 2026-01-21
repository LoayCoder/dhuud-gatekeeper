-- =============================================================================
-- RBAC-Based Routing for Contractor Observations
-- Implements branch-aware role resolution with fallback logic
-- =============================================================================

-- 1. Create function to find Contractor Consultant for a specific branch
CREATE OR REPLACE FUNCTION public.find_contractor_consultant_for_branch(
  p_tenant_id UUID,
  p_branch_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_consultant_id UUID;
BEGIN
  -- First: Find a contractor consultant assigned to this specific branch
  SELECT ura.user_id INTO v_consultant_id
  FROM user_role_assignments ura
  JOIN roles r ON r.id = ura.role_id
  WHERE ura.tenant_id = p_tenant_id
    AND ura.branch_id = p_branch_id
    AND r.code = 'contractor_consultant'
    AND r.is_active = true
  LIMIT 1;
  
  -- Fallback: If not found with specific branch, try tenant-wide consultant (branch_id IS NULL)
  IF v_consultant_id IS NULL THEN
    SELECT ura.user_id INTO v_consultant_id
    FROM user_role_assignments ura
    JOIN roles r ON r.id = ura.role_id
    WHERE ura.tenant_id = p_tenant_id
      AND ura.branch_id IS NULL
      AND r.code = 'contractor_consultant'
      AND r.is_active = true
    LIMIT 1;
  END IF;
  
  RETURN v_consultant_id;
END;
$$;

-- 2. Create function to find Department Representative for branch and department
CREATE OR REPLACE FUNCTION public.find_dept_rep_for_branch_department(
  p_tenant_id UUID,
  p_branch_id UUID,
  p_department_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dept_rep_id UUID;
BEGIN
  -- Find department rep for specific branch and department
  SELECT ura.user_id INTO v_dept_rep_id
  FROM user_role_assignments ura
  JOIN roles r ON r.id = ura.role_id
  JOIN profiles p ON p.user_id = ura.user_id
  WHERE ura.tenant_id = p_tenant_id
    AND (ura.branch_id = p_branch_id OR ura.branch_id IS NULL)
    AND p.department_id = p_department_id
    AND r.code = 'department_representative'
    AND r.is_active = true
  ORDER BY 
    CASE WHEN ura.branch_id = p_branch_id THEN 0 ELSE 1 END  -- Prefer branch-specific
  LIMIT 1;
  
  RETURN v_dept_rep_id;
END;
$$;

-- 3. Create branch-aware permission check for Contractor Consultant
CREATE OR REPLACE FUNCTION public.has_contractor_consultant_access_for_branch(
  p_user_id UUID,
  p_branch_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.user_role_assignments ura
    JOIN public.roles r ON r.id = ura.role_id
    WHERE ura.user_id = p_user_id
      AND r.code = 'contractor_consultant'
      AND (ura.branch_id = p_branch_id OR ura.branch_id IS NULL)  -- Branch match or tenant-wide
      AND r.is_active = true
  );
$$;

-- 4. Update auto-routing trigger with RBAC-based branch-aware logic
CREATE OR REPLACE FUNCTION public.auto_route_observation_on_submit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_contractor BOOLEAN;
  v_new_status TEXT;
  v_assigned_to UUID;
  v_role_selected TEXT;
  v_selection_reason TEXT;
BEGIN
  -- Only process observations that just became 'submitted'
  IF NEW.event_type = 'observation' 
     AND NEW.status = 'submitted' 
     AND (OLD IS NULL OR OLD.status != 'submitted') THEN
    
    v_is_contractor := NEW.related_contractor_company_id IS NOT NULL;
    
    IF v_is_contractor THEN
      -- PRIMARY RULE: Check for Contractor Consultant in branch (RBAC-based)
      v_assigned_to := public.find_contractor_consultant_for_branch(
        NEW.tenant_id, 
        NEW.branch_id
      );
      
      IF v_assigned_to IS NOT NULL THEN
        -- Contractor Consultant found - route to consultant screening
        v_new_status := 'pending_consultant_screening';
        v_role_selected := 'contractor_consultant';
        v_selection_reason := 'primary_rule_contractor_consultant_found';
      ELSE
        -- FALLBACK RULE: No Consultant - route to Department Rep
        v_assigned_to := public.find_dept_rep_for_branch_department(
          NEW.tenant_id, 
          NEW.branch_id,
          NEW.department_id
        );
        v_new_status := 'pending_dept_rep_review';
        v_role_selected := 'department_representative';
        v_selection_reason := 'fallback_no_contractor_consultant';
      END IF;
    ELSE
      -- Non-contractor: route to Department Rep
      v_assigned_to := public.find_dept_rep_for_branch_department(
        NEW.tenant_id, 
        NEW.branch_id,
        NEW.department_id
      );
      v_new_status := 'pending_dept_rep_review';
      v_role_selected := 'department_representative';
      v_selection_reason := 'non_contractor_observation';
    END IF;
    
    NEW.status := v_new_status;
    NEW.approval_manager_id := v_assigned_to;
    
    -- Log the auto-routing decision with full audit trail
    INSERT INTO incident_audit_logs (incident_id, tenant_id, actor_id, action, details)
    VALUES (
      NEW.id, 
      NEW.tenant_id, 
      COALESCE(auth.uid(), NEW.reporter_id), 
      'auto_routed_observation',
      jsonb_build_object(
        'is_contractor', v_is_contractor,
        'role_selected', v_role_selected,
        'selection_reason', v_selection_reason,
        'assigned_to', v_assigned_to,
        'branch_id', NEW.branch_id,
        'department_id', NEW.department_id,
        'new_status', v_new_status,
        'contractor_company_id', NEW.related_contractor_company_id
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- 5. Grant execute permissions
GRANT EXECUTE ON FUNCTION public.find_contractor_consultant_for_branch(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.find_dept_rep_for_branch_department(UUID, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_contractor_consultant_access_for_branch(UUID, UUID) TO authenticated;

-- 6. Add comments for documentation
COMMENT ON FUNCTION public.find_contractor_consultant_for_branch IS 
'RBAC: Finds a Contractor Consultant for the given branch. First checks branch-specific assignments, then falls back to tenant-wide assignments.';

COMMENT ON FUNCTION public.find_dept_rep_for_branch_department IS 
'RBAC: Finds a Department Representative for the given branch and department. Prefers branch-specific assignments over tenant-wide.';

COMMENT ON FUNCTION public.has_contractor_consultant_access_for_branch IS 
'RBAC: Checks if a user has contractor_consultant role access for a specific branch (or tenant-wide).';

COMMENT ON FUNCTION public.auto_route_observation_on_submit IS 
'Auto-routes contractor observations using RBAC: Primary route to Contractor Consultant if available, fallback to Department Rep. Logs role selection reason in audit trail.';