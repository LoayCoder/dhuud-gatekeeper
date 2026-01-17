-- Fix reroute_observation_to_new_site function with correct enum values
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
  v_new_assigned_to UUID;
  v_new_status TEXT;
  v_role_selected TEXT;
  v_selection_reason TEXT;
  v_site_primary_department UUID;
  v_result JSONB;
BEGIN
  -- Get current incident data
  SELECT * INTO v_incident FROM incidents WHERE id = p_incident_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Incident not found';
  END IF;

  -- Update location fields if provided
  IF p_new_branch_id IS NOT NULL THEN
    UPDATE incidents SET branch_id = p_new_branch_id WHERE id = p_incident_id;
  END IF;
  
  IF p_new_site_id IS NOT NULL THEN
    UPDATE incidents SET site_id = p_new_site_id WHERE id = p_incident_id;
  END IF;
  
  IF p_new_contractor_id IS NOT NULL THEN
    UPDATE incidents SET related_contractor_company_id = p_new_contractor_id WHERE id = p_incident_id;
  END IF;

  -- Add admin notes if provided
  IF p_admin_notes IS NOT NULL AND p_admin_notes != '' THEN
    UPDATE incidents 
    SET admin_notes = COALESCE(admin_notes, '') || E'\n[Admin Edit] ' || p_admin_notes
    WHERE id = p_incident_id;
  END IF;

  -- If re-routing requested, determine new assignee
  IF p_should_reroute THEN
    -- Get site's primary department
    SELECT primary_department_id INTO v_site_primary_department
    FROM sites 
    WHERE id = COALESCE(p_new_site_id, v_incident.site_id);

    -- Check for contractor consultant first (if contractor observation)
    IF COALESCE(p_new_contractor_id, v_incident.related_contractor_company_id) IS NOT NULL THEN
      SELECT p.id INTO v_new_assigned_to
      FROM profiles p
      WHERE p.role = 'contractor_consultant'
        AND p.tenant_id = v_incident.tenant_id
        AND p.branch_id = COALESCE(p_new_branch_id, v_incident.branch_id)
        AND p.deleted_at IS NULL
      LIMIT 1;
      
      IF v_new_assigned_to IS NOT NULL THEN
        v_role_selected := 'contractor_consultant';
        v_selection_reason := 'Routed to contractor consultant for screening';
        v_new_status := 'expert_screening';
      END IF;
    END IF;

    -- If no consultant, try department representative
    IF v_new_assigned_to IS NULL AND v_site_primary_department IS NOT NULL THEN
      SELECT p.id INTO v_new_assigned_to
      FROM profiles p
      JOIN site_department_reps sdr ON sdr.user_id = p.id
      WHERE sdr.site_id = COALESCE(p_new_site_id, v_incident.site_id)
        AND sdr.department_id = v_site_primary_department
        AND sdr.is_active = true
        AND p.deleted_at IS NULL
      LIMIT 1;
      
      IF v_new_assigned_to IS NOT NULL THEN
        v_role_selected := 'department_representative';
        v_selection_reason := 'Routed to site department representative';
        v_new_status := 'pending_dept_rep_incident_review';
      END IF;
    END IF;

    -- Update assignment if found
    IF v_new_assigned_to IS NOT NULL THEN
      UPDATE incidents 
      SET 
        assigned_to = v_new_assigned_to,
        status = v_new_status::incident_status,
        updated_at = NOW()
      WHERE id = p_incident_id;
    END IF;
  END IF;

  -- Build result
  v_result := jsonb_build_object(
    'success', true,
    'rerouted', p_should_reroute AND v_new_assigned_to IS NOT NULL,
    'new_assigned_to', v_new_assigned_to,
    'new_status', v_new_status,
    'role_selected', v_role_selected,
    'selection_reason', v_selection_reason,
    'site_primary_department', v_site_primary_department
  );

  RETURN v_result;
END;
$$;

-- Fix auto_route_observation_on_submit function with correct enum values
CREATE OR REPLACE FUNCTION public.auto_route_observation_on_submit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_assigned_to UUID;
  v_new_status TEXT;
  v_site_primary_department UUID;
BEGIN
  -- Only run when status changes to 'submitted'
  IF NEW.status != 'submitted' OR OLD.status = 'submitted' THEN
    RETURN NEW;
  END IF;

  -- Get site's primary department
  SELECT primary_department_id INTO v_site_primary_department
  FROM sites 
  WHERE id = NEW.site_id;

  -- Check for contractor consultant first (if contractor observation)
  IF NEW.related_contractor_company_id IS NOT NULL THEN
    SELECT p.id INTO v_assigned_to
    FROM profiles p
    WHERE p.role = 'contractor_consultant'
      AND p.tenant_id = NEW.tenant_id
      AND p.branch_id = NEW.branch_id
      AND p.deleted_at IS NULL
    LIMIT 1;
    
    IF v_assigned_to IS NOT NULL THEN
      v_new_status := 'expert_screening';
    END IF;
  END IF;

  -- If no consultant found, try department representative
  IF v_assigned_to IS NULL AND v_site_primary_department IS NOT NULL THEN
    SELECT p.id INTO v_assigned_to
    FROM profiles p
    JOIN site_department_reps sdr ON sdr.user_id = p.id
    WHERE sdr.site_id = NEW.site_id
      AND sdr.department_id = v_site_primary_department
      AND sdr.is_active = true
      AND p.deleted_at IS NULL
    LIMIT 1;
    
    IF v_assigned_to IS NOT NULL THEN
      v_new_status := 'pending_dept_rep_incident_review';
    END IF;
  END IF;

  -- Update assignment if found
  IF v_assigned_to IS NOT NULL THEN
    NEW.assigned_to := v_assigned_to;
    NEW.status := v_new_status::incident_status;
  END IF;

  RETURN NEW;
END;
$$;