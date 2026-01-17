-- =============================================
-- Admin Edit Observation - Re-routing Function
-- =============================================
-- Allows admins to edit observation location and contractor assignment
-- with optional re-routing to the new site's Department Representative

CREATE OR REPLACE FUNCTION public.reroute_observation_to_new_site(
  p_incident_id UUID,
  p_new_branch_id UUID DEFAULT NULL,
  p_new_site_id UUID DEFAULT NULL,
  p_new_contractor_id UUID DEFAULT NULL,
  p_should_reroute BOOLEAN DEFAULT FALSE,
  p_admin_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_incident RECORD;
  v_old_values JSONB;
  v_new_values JSONB;
  v_new_assigned_to UUID;
  v_new_status TEXT;
  v_role_selected TEXT;
  v_selection_reason TEXT;
  v_is_contractor BOOLEAN;
  v_site_primary_dept UUID;
BEGIN
  -- Get current incident with necessary fields
  SELECT 
    id, tenant_id, branch_id, site_id, 
    related_contractor_company_id, 
    approval_manager_id, status,
    reporter_id, department_id
  INTO v_incident 
  FROM incidents 
  WHERE id = p_incident_id AND deleted_at IS NULL;
  
  IF NOT FOUND THEN 
    RAISE EXCEPTION 'Incident not found';
  END IF;

  -- Store old values for audit trail
  v_old_values := jsonb_build_object(
    'branch_id', v_incident.branch_id,
    'site_id', v_incident.site_id,
    'related_contractor_company_id', v_incident.related_contractor_company_id,
    'approval_manager_id', v_incident.approval_manager_id,
    'status', v_incident.status
  );

  -- Determine if this is a contractor-related observation
  v_is_contractor := COALESCE(p_new_contractor_id, v_incident.related_contractor_company_id) IS NOT NULL;

  -- Get the primary department for the new site (if site is changing)
  IF p_new_site_id IS NOT NULL THEN
    v_site_primary_dept := get_site_primary_department(p_new_site_id);
  END IF;

  -- Initialize with current values
  v_new_assigned_to := v_incident.approval_manager_id;
  v_new_status := v_incident.status;
  v_role_selected := NULL;
  v_selection_reason := 'admin_edit_no_changes';

  IF p_should_reroute THEN
    -- RE-ROUTING LOGIC: Find new assignee based on new location
    
    IF v_is_contractor AND COALESCE(p_new_branch_id, v_incident.branch_id) IS NOT NULL THEN
      -- Try to find contractor consultant first
      v_new_assigned_to := find_contractor_consultant_for_branch(
        v_incident.tenant_id, 
        COALESCE(p_new_branch_id, v_incident.branch_id)
      );
      
      IF v_new_assigned_to IS NOT NULL THEN
        v_new_status := 'pending_consultant_screening';
        v_role_selected := 'contractor_consultant';
        v_selection_reason := 'admin_reroute_contractor_consultant_found';
      ELSE
        -- Fallback to site dept rep
        IF COALESCE(p_new_site_id, v_incident.site_id) IS NOT NULL THEN
          v_new_assigned_to := find_dept_rep_for_site(
            v_incident.tenant_id, 
            COALESCE(p_new_site_id, v_incident.site_id)
          );
        END IF;
        
        IF v_new_assigned_to IS NOT NULL THEN
          v_new_status := 'pending_dept_rep_review';
          v_role_selected := 'department_representative';
          v_selection_reason := 'admin_reroute_contractor_fallback_dept_rep';
        ELSE
          v_selection_reason := 'admin_reroute_no_assignee_found';
        END IF;
      END IF;
    ELSE
      -- Non-contractor: route to site dept rep
      IF COALESCE(p_new_site_id, v_incident.site_id) IS NOT NULL THEN
        v_new_assigned_to := find_dept_rep_for_site(
          v_incident.tenant_id, 
          COALESCE(p_new_site_id, v_incident.site_id)
        );
      END IF;
      
      IF v_new_assigned_to IS NOT NULL THEN
        v_new_status := 'pending_dept_rep_review';
        v_role_selected := 'department_representative';
        v_selection_reason := 'admin_reroute_site_dept_rep';
      ELSE
        v_selection_reason := 'admin_reroute_no_assignee_found';
      END IF;
    END IF;
  ELSE
    v_selection_reason := 'admin_edit_no_reroute';
  END IF;

  -- Update the incident with new values
  UPDATE incidents SET
    branch_id = COALESCE(p_new_branch_id, branch_id),
    site_id = COALESCE(p_new_site_id, site_id),
    related_contractor_company_id = p_new_contractor_id,
    department_id = COALESCE(v_site_primary_dept, department_id),
    approval_manager_id = CASE 
      WHEN p_should_reroute AND v_new_assigned_to IS NOT NULL THEN v_new_assigned_to 
      ELSE approval_manager_id 
    END,
    status = CASE 
      WHEN p_should_reroute AND v_new_assigned_to IS NOT NULL THEN v_new_status::incident_status 
      ELSE status 
    END,
    updated_at = now()
  WHERE id = p_incident_id;

  -- Build new values for audit
  v_new_values := jsonb_build_object(
    'branch_id', COALESCE(p_new_branch_id, v_incident.branch_id),
    'site_id', COALESCE(p_new_site_id, v_incident.site_id),
    'related_contractor_company_id', p_new_contractor_id,
    'department_id', COALESCE(v_site_primary_dept, v_incident.department_id),
    'approval_manager_id', CASE 
      WHEN p_should_reroute AND v_new_assigned_to IS NOT NULL THEN v_new_assigned_to 
      ELSE v_incident.approval_manager_id 
    END,
    'status', CASE 
      WHEN p_should_reroute AND v_new_assigned_to IS NOT NULL THEN v_new_status 
      ELSE v_incident.status 
    END
  );

  -- Log the admin edit action in audit trail
  INSERT INTO incident_audit_logs (incident_id, tenant_id, actor_id, action, details)
  VALUES (
    p_incident_id, 
    v_incident.tenant_id, 
    auth.uid(), 
    'admin_edit_observation',
    jsonb_build_object(
      'old_values', v_old_values,
      'new_values', v_new_values,
      'should_reroute', p_should_reroute,
      'role_selected', v_role_selected,
      'selection_reason', v_selection_reason,
      'admin_notes', p_admin_notes,
      'is_contractor_related', v_is_contractor,
      'site_primary_department', v_site_primary_dept
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'rerouted', p_should_reroute AND v_new_assigned_to IS NOT NULL,
    'new_assigned_to', v_new_assigned_to,
    'new_status', CASE 
      WHEN p_should_reroute AND v_new_assigned_to IS NOT NULL THEN v_new_status 
      ELSE v_incident.status 
    END,
    'role_selected', v_role_selected,
    'selection_reason', v_selection_reason,
    'site_primary_department', v_site_primary_dept
  );
END;
$$;

-- Grant execute permission to authenticated users (RPC checks admin role in frontend)
GRANT EXECUTE ON FUNCTION public.reroute_observation_to_new_site TO authenticated;