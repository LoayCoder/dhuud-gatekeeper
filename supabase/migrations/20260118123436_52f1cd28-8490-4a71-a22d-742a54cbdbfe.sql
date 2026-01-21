-- Fix the trigger to not reference non-existent deleted_at column on user_role_assignments

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
  v_role_found TEXT;
  v_reason TEXT;
BEGIN
  -- Only process observations
  IF NEW.event_type != 'observation' THEN
    RETURN NEW;
  END IF;

  -- Only run when status changes to 'submitted'
  IF NEW.status != 'submitted' THEN
    RETURN NEW;
  END IF;
  
  -- Skip if already processed (has approval_manager_id)
  IF NEW.approval_manager_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Determine branch from incident or site
  v_branch_id := NEW.branch_id;
  IF v_branch_id IS NULL AND NEW.site_id IS NOT NULL THEN
    SELECT branch_id INTO v_branch_id FROM sites WHERE id = NEW.site_id;
  END IF;

  -- CONTRACTOR OBSERVATIONS: Route to Contractor Consultant FIRST
  IF NEW.related_contractor_company_id IS NOT NULL THEN
    -- Find contractor consultant using proper JOIN with roles table
    -- Priority: 1) Exact branch match, 2) NULL branch (org-wide), 3) Any branch
    SELECT ura.user_id INTO v_assigned_to
    FROM user_role_assignments ura
    JOIN roles r ON ura.role_id = r.id
    WHERE ura.tenant_id = NEW.tenant_id
      AND r.code = 'contractor_consultant'
    ORDER BY 
      CASE 
        WHEN ura.branch_id = v_branch_id THEN 0
        WHEN ura.branch_id IS NULL THEN 1
        ELSE 2
      END,
      ura.assigned_at ASC
    LIMIT 1;
    
    IF v_assigned_to IS NOT NULL THEN
      v_new_status := 'pending_consultant_screening';
      v_role_found := 'contractor_consultant';
      v_reason := 'contractor_observation_routed_to_consultant';
      
      -- Log successful routing to contractor consultant
      INSERT INTO incident_audit_logs (incident_id, tenant_id, actor_id, action, details)
      VALUES (
        NEW.id, 
        NEW.tenant_id, 
        COALESCE(auth.uid(), NEW.reporter_id),
        'auto_routed_observation',
        jsonb_build_object(
          'is_contractor_related', true,
          'role_selected', 'contractor_consultant',
          'selection_reason', v_reason,
          'assigned_to', v_assigned_to,
          'branch_id', v_branch_id,
          'contractor_company_id', NEW.related_contractor_company_id
        )
      );
    ELSE
      -- FALLBACK: No consultant found - route to Dept Rep with warning
      SELECT ura.user_id INTO v_assigned_to
      FROM user_role_assignments ura
      JOIN roles r ON ura.role_id = r.id
      WHERE ura.tenant_id = NEW.tenant_id
        AND r.code = 'department_representative'
        AND (ura.branch_id = v_branch_id OR ura.branch_id IS NULL)
      ORDER BY 
        CASE WHEN ura.branch_id = v_branch_id THEN 0 ELSE 1 END,
        ura.assigned_at ASC
      LIMIT 1;
      
      v_new_status := 'pending_dept_rep_approval';
      v_role_found := 'department_representative';
      v_reason := 'fallback_no_contractor_consultant_found';
      
      -- Log fallback with warning
      INSERT INTO incident_audit_logs (incident_id, tenant_id, actor_id, action, details)
      VALUES (
        NEW.id, 
        NEW.tenant_id, 
        COALESCE(auth.uid(), NEW.reporter_id),
        'auto_routed_observation',
        jsonb_build_object(
          'is_contractor_related', true,
          'role_selected', 'department_representative',
          'selection_reason', v_reason,
          'assigned_to', v_assigned_to,
          'branch_id', v_branch_id,
          'contractor_company_id', NEW.related_contractor_company_id,
          'warning', 'No Contractor Consultant found for branch – fallback to Department Representative applied'
        )
      );
    END IF;
    
  ELSE
    -- NON-CONTRACTOR: Route directly to Dept Rep
    SELECT ura.user_id INTO v_assigned_to
    FROM user_role_assignments ura
    JOIN roles r ON ura.role_id = r.id
    WHERE ura.tenant_id = NEW.tenant_id
      AND r.code = 'department_representative'
      AND (ura.branch_id = v_branch_id OR ura.branch_id IS NULL)
    ORDER BY 
      CASE WHEN ura.branch_id = v_branch_id THEN 0 ELSE 1 END,
      ura.assigned_at ASC
    LIMIT 1;
    
    v_new_status := 'pending_dept_rep_approval';
    v_role_found := 'department_representative';
    v_reason := 'non_contractor_observation';
    
    -- Log routing
    INSERT INTO incident_audit_logs (incident_id, tenant_id, actor_id, action, details)
    VALUES (
      NEW.id, 
      NEW.tenant_id, 
      COALESCE(auth.uid(), NEW.reporter_id),
      'auto_routed_observation',
      jsonb_build_object(
        'is_contractor_related', false,
        'role_selected', 'department_representative',
        'selection_reason', v_reason,
        'assigned_to', v_assigned_to,
        'branch_id', v_branch_id
      )
    );
  END IF;

  -- Apply routing if assignee found
  IF v_assigned_to IS NOT NULL THEN
    NEW.approval_manager_id := v_assigned_to;
    NEW.status := v_new_status;
  END IF;

  RETURN NEW;
END;
$$;

-- FIX EXISTING MIS-ROUTED CONTRACTOR OBSERVATIONS
DO $$
DECLARE
  v_consultant_id UUID;
  v_incident RECORD;
BEGIN
  -- Loop through all contractor observations stuck in wrong status
  FOR v_incident IN 
    SELECT i.id, i.tenant_id, i.branch_id, i.site_id, i.reporter_id, i.related_contractor_company_id
    FROM incidents i
    WHERE i.related_contractor_company_id IS NOT NULL
      AND i.event_type = 'observation'
      AND i.status = 'pending_dept_rep_approval'
      AND i.deleted_at IS NULL
  LOOP
    -- Find contractor consultant for this tenant (without deleted_at filter)
    SELECT ura.user_id INTO v_consultant_id
    FROM user_role_assignments ura
    JOIN roles r ON ura.role_id = r.id
    WHERE ura.tenant_id = v_incident.tenant_id
      AND r.code = 'contractor_consultant'
    ORDER BY ura.assigned_at ASC
    LIMIT 1;
    
    IF v_consultant_id IS NOT NULL THEN
      -- Update the observation to route to consultant
      UPDATE incidents
      SET status = 'pending_consultant_screening',
          approval_manager_id = v_consultant_id
      WHERE id = v_incident.id;
      
      -- Log the fix
      INSERT INTO incident_audit_logs (incident_id, tenant_id, actor_id, action, details)
      VALUES (
        v_incident.id,
        v_incident.tenant_id,
        v_incident.reporter_id,
        'workflow_fix_applied',
        jsonb_build_object(
          'fix_type', 'contractor_observation_rerouted',
          'previous_status', 'pending_dept_rep_approval',
          'new_status', 'pending_consultant_screening',
          'assigned_to', v_consultant_id,
          'contractor_company_id', v_incident.related_contractor_company_id,
          'reason', 'Automated fix: Contractor observation incorrectly routed to Dept Rep instead of Consultant'
        )
      );
    END IF;
  END LOOP;
END $$;