-- =====================================================
-- FIX: Contractor Consultant Routing for Observations
-- ROOT CAUSE: auto_route_observation_on_submit used non-existent columns
-- =====================================================

-- Phase 1: Fix the auto_route_observation_on_submit trigger function
CREATE OR REPLACE FUNCTION public.auto_route_observation_on_submit()
RETURNS TRIGGER AS $$
DECLARE
  v_assigned_to UUID;
  v_new_status TEXT;
  v_site_primary_department UUID;
  v_branch_id UUID;
BEGIN
  -- Only run when status changes to 'submitted'
  IF NEW.status != 'submitted' OR (OLD IS NOT NULL AND OLD.status = 'submitted') THEN
    RETURN NEW;
  END IF;

  -- Determine branch (from incident or site)
  v_branch_id := NEW.branch_id;
  IF v_branch_id IS NULL THEN
    SELECT branch_id INTO v_branch_id FROM sites WHERE id = NEW.site_id;
  END IF;

  -- Get site's primary department
  SELECT primary_department_id INTO v_site_primary_department
  FROM sites 
  WHERE id = NEW.site_id;

  -- PRIORITY 1: Check for contractor consultant FIRST (if contractor observation)
  IF NEW.related_contractor_company_id IS NOT NULL THEN
    -- Use user_role_assignments with proper join to roles table
    -- First try branch-specific consultant
    SELECT ura.user_id INTO v_assigned_to
    FROM user_role_assignments ura
    JOIN roles r ON r.id = ura.role_id
    JOIN profiles p ON p.id = ura.user_id
    WHERE ura.tenant_id = NEW.tenant_id
      AND ura.branch_id = v_branch_id
      AND r.code = 'contractor_consultant'
      AND r.is_active = true
      AND p.deleted_at IS NULL
    LIMIT 1;
    
    -- FALLBACK: Try tenant-wide consultant (branch_id IS NULL)
    IF v_assigned_to IS NULL THEN
      SELECT ura.user_id INTO v_assigned_to
      FROM user_role_assignments ura
      JOIN roles r ON r.id = ura.role_id
      JOIN profiles p ON p.id = ura.user_id
      WHERE ura.tenant_id = NEW.tenant_id
        AND ura.branch_id IS NULL
        AND r.code = 'contractor_consultant'
        AND r.is_active = true
        AND p.deleted_at IS NULL
      LIMIT 1;
    END IF;
    
    IF v_assigned_to IS NOT NULL THEN
      v_new_status := 'expert_screening';
    END IF;
  END IF;

  -- PRIORITY 2: If no consultant found, try department representative
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
    NEW.approval_manager_id := v_assigned_to;
    NEW.status := v_new_status::incident_status;
    
    -- Log the routing decision
    INSERT INTO incident_audit_logs (
      incident_id, tenant_id, actor_id, action, 
      new_value, details, created_at
    ) VALUES (
      NEW.id, NEW.tenant_id, v_assigned_to, 'auto_routed',
      jsonb_build_object('status', v_new_status, 'assigned_to', v_assigned_to),
      jsonb_build_object(
        'routing_type', CASE WHEN v_new_status = 'expert_screening' THEN 'contractor_consultant' ELSE 'department_representative' END,
        'is_contractor_observation', NEW.related_contractor_company_id IS NOT NULL
      ),
      NOW()
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Phase 2: Fix find_contractor_consultant_for_branch to support tenant-wide fallback
CREATE OR REPLACE FUNCTION public.find_contractor_consultant_for_branch(
  p_tenant_id UUID,
  p_branch_id UUID
)
RETURNS UUID AS $$
DECLARE
  v_consultant_id UUID;
BEGIN
  -- First try branch-specific consultant
  SELECT ura.user_id INTO v_consultant_id
  FROM user_role_assignments ura
  JOIN roles r ON r.id = ura.role_id
  JOIN profiles p ON p.id = ura.user_id
  WHERE ura.tenant_id = p_tenant_id
    AND ura.branch_id = p_branch_id
    AND r.code = 'contractor_consultant'
    AND r.is_active = true
    AND p.deleted_at IS NULL
  LIMIT 1;
  
  -- Fallback: Try tenant-wide consultant (branch_id IS NULL)
  IF v_consultant_id IS NULL THEN
    SELECT ura.user_id INTO v_consultant_id
    FROM user_role_assignments ura
    JOIN roles r ON r.id = ura.role_id
    JOIN profiles p ON p.id = ura.user_id
    WHERE ura.tenant_id = p_tenant_id
      AND ura.branch_id IS NULL
      AND r.code = 'contractor_consultant'
      AND r.is_active = true
      AND p.deleted_at IS NULL
    LIMIT 1;
  END IF;
  
  RETURN v_consultant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Phase 3: Correct OBS-2026-0001 - Reassign to Contractor Consultant
DO $$
DECLARE
  v_incident_id UUID;
  v_tenant_id UUID;
  v_consultant_id UUID;
  v_old_status TEXT;
  v_old_manager UUID;
BEGIN
  -- Find the incident by reference_id
  SELECT id, tenant_id, status::text, approval_manager_id 
  INTO v_incident_id, v_tenant_id, v_old_status, v_old_manager
  FROM incidents 
  WHERE reference_id = 'OBS-2026-0001';
  
  IF v_incident_id IS NULL THEN
    RAISE NOTICE 'OBS-2026-0001 not found';
    RETURN;
  END IF;
  
  -- Find available contractor consultant using user_role_assignments
  SELECT ura.user_id INTO v_consultant_id
  FROM user_role_assignments ura
  JOIN roles r ON r.id = ura.role_id
  JOIN profiles p ON p.id = ura.user_id
  WHERE ura.tenant_id = v_tenant_id
    AND r.code = 'contractor_consultant'
    AND r.is_active = true
    AND p.deleted_at IS NULL
  LIMIT 1;
  
  IF v_consultant_id IS NULL THEN
    RAISE NOTICE 'No contractor consultant found for tenant %', v_tenant_id;
    RETURN;
  END IF;
  
  -- Update the observation
  UPDATE incidents 
  SET 
    status = 'expert_screening',
    approval_manager_id = v_consultant_id,
    updated_at = NOW()
  WHERE id = v_incident_id;
  
  -- Log the correction
  INSERT INTO incident_audit_logs (
    incident_id, tenant_id, actor_id, action,
    old_value, new_value, details, created_at
  ) VALUES (
    v_incident_id, v_tenant_id, v_consultant_id, 'admin_correction',
    jsonb_build_object('status', v_old_status, 'approval_manager_id', v_old_manager),
    jsonb_build_object('status', 'expert_screening', 'approval_manager_id', v_consultant_id),
    jsonb_build_object(
      'reason', 'Corrected misrouted contractor observation - was incorrectly assigned to Dept Rep instead of Contractor Consultant',
      'ticket', 'OBS-2026-0001 routing fix',
      'root_cause', 'auto_route_observation_on_submit used non-existent profiles.role column instead of user_role_assignments table',
      'correct_routing', 'contractor_consultant'
    ),
    NOW()
  );
  
  RAISE NOTICE 'OBS-2026-0001 corrected: Reassigned from % (%) to contractor consultant % with status expert_screening', 
    v_old_manager, v_old_status, v_consultant_id;
END $$;