-- Fix the auto_route_observation_on_submit trigger to properly route contractor observations
-- to Contractor Consultant FIRST, not Department Representative

CREATE OR REPLACE FUNCTION public.auto_route_observation_on_submit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_assigned_to UUID;
  v_new_status TEXT;
  v_branch_id UUID;
  v_role_selected TEXT;
  v_selection_reason TEXT;
BEGIN
  -- Only process observations with status = 'submitted'
  IF NEW.event_type != 'observation' THEN
    RETURN NEW;
  END IF;
  
  -- Only run when status changes to 'submitted'
  IF NEW.status != 'submitted' OR (OLD IS NOT NULL AND OLD.status = 'submitted') THEN
    RETURN NEW;
  END IF;

  -- Skip if already has approval_manager_id assigned
  IF NEW.approval_manager_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Determine branch
  v_branch_id := NEW.branch_id;
  IF v_branch_id IS NULL AND NEW.site_id IS NOT NULL THEN
    SELECT branch_id INTO v_branch_id FROM sites WHERE id = NEW.site_id;
  END IF;

  -- CRITICAL: CONTRACTOR OBSERVATIONS must route to Contractor Consultant FIRST
  IF NEW.related_contractor_company_id IS NOT NULL THEN
    -- Attempt to find Contractor Consultant for this branch
    SELECT ura.user_id INTO v_assigned_to
    FROM user_role_assignments ura
    WHERE ura.tenant_id = NEW.tenant_id
      AND ura.role = 'contractor_consultant'
      AND ura.branch_id = v_branch_id
      AND ura.is_active = true
      AND ura.deleted_at IS NULL
    ORDER BY ura.created_at ASC
    LIMIT 1;
    
    IF v_assigned_to IS NOT NULL THEN
      -- Route to Contractor Consultant
      v_new_status := 'pending_consultant_screening';
      v_role_selected := 'contractor_consultant';
      v_selection_reason := 'primary_rule_contractor_consultant_found';
    ELSE
      -- FALLBACK: No consultant found - route to Dept Rep with warning
      SELECT ura.user_id INTO v_assigned_to
      FROM user_role_assignments ura
      WHERE ura.tenant_id = NEW.tenant_id
        AND ura.role = 'department_representative'
        AND ura.branch_id = v_branch_id
        AND ura.is_active = true
        AND ura.deleted_at IS NULL
      ORDER BY ura.created_at ASC
      LIMIT 1;
      
      v_new_status := 'pending_dept_rep_review';
      v_role_selected := 'department_representative';
      v_selection_reason := 'fallback_no_contractor_consultant_found';
      
      -- Log warning about missing contractor consultant
      INSERT INTO incident_audit_logs (incident_id, tenant_id, actor_id, action, details)
      VALUES (NEW.id, NEW.tenant_id, COALESCE(auth.uid(), NEW.reporter_id),
        'auto_routing_warning',
        jsonb_build_object(
          'warning', 'No Contractor Consultant found for branch – fallback to Department Representative applied',
          'branch_id', v_branch_id,
          'is_contractor_related', true
        )
      );
    END IF;
    
  ELSE
    -- NON-CONTRACTOR: Route directly to Dept Rep
    SELECT ura.user_id INTO v_assigned_to
    FROM user_role_assignments ura
    WHERE ura.tenant_id = NEW.tenant_id
      AND ura.role = 'department_representative'
      AND ura.branch_id = v_branch_id
      AND ura.is_active = true
      AND ura.deleted_at IS NULL
    ORDER BY ura.created_at ASC
    LIMIT 1;
    
    v_new_status := 'pending_dept_rep_review';
    v_role_selected := 'department_representative';
    v_selection_reason := 'non_contractor_observation';
  END IF;

  -- Apply routing
  IF v_assigned_to IS NOT NULL THEN
    NEW.approval_manager_id := v_assigned_to;
    NEW.status := v_new_status;
    
    -- Log routing decision for audit trail
    INSERT INTO incident_audit_logs (incident_id, tenant_id, actor_id, action, details)
    VALUES (NEW.id, NEW.tenant_id, COALESCE(auth.uid(), NEW.reporter_id),
      'auto_routed_observation',
      jsonb_build_object(
        'is_contractor_related', NEW.related_contractor_company_id IS NOT NULL,
        'role_selected', v_role_selected,
        'selection_reason', v_selection_reason,
        'assigned_to', v_assigned_to,
        'branch_id', v_branch_id,
        'new_status', v_new_status
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Ensure trigger exists and is correctly attached
DROP TRIGGER IF EXISTS trg_auto_route_observation ON incidents;

CREATE TRIGGER trg_auto_route_observation
  BEFORE INSERT OR UPDATE ON incidents
  FOR EACH ROW
  EXECUTE FUNCTION auto_route_observation_on_submit();

-- Add comment for documentation
COMMENT ON FUNCTION public.auto_route_observation_on_submit() IS 
'Auto-routes observations based on HSSE governance rules:
- Contractor observations → Contractor Consultant (pending_consultant_screening)
- Non-contractor observations → Department Representative (pending_dept_rep_review)
- Fallback: If no Contractor Consultant exists, routes to Dept Rep with audit warning';