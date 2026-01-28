-- Fix auto_route_observation_on_submit function - change ura.created_at to ura.assigned_at
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
BEGIN
  IF NEW.event_type != 'observation' OR NEW.status != 'submitted' THEN
    RETURN NEW;
  END IF;

  IF NEW.approval_manager_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  v_branch_id := COALESCE(NEW.branch_id, 
    (SELECT branch_id FROM sites WHERE id = NEW.site_id AND deleted_at IS NULL));

  IF NEW.related_contractor_company_id IS NOT NULL THEN
    SELECT ura.user_id INTO v_assigned_to
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
    
    IF v_assigned_to IS NOT NULL THEN
      v_new_status := 'expert_screening';
    END IF;
  END IF;

  IF v_assigned_to IS NULL THEN
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
  END IF;

  IF v_assigned_to IS NOT NULL THEN
    NEW.approval_manager_id := v_assigned_to;
    NEW.status := v_new_status;
  END IF;

  RETURN NEW;
END;
$$;

-- Fix consultant_complete_screening function - change ura.created_at to ura.assigned_at
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
  v_site_client_id uuid;
  v_branch_id uuid;
BEGIN
  v_user_id := auth.uid();
  
  SELECT tenant_id, status, branch_id INTO v_tenant_id, v_old_status, v_branch_id
  FROM incidents
  WHERE id = p_incident_id AND deleted_at IS NULL;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Incident not found');
  END IF;
  
  IF v_old_status NOT IN ('pending_consultant_screening', 'expert_screening') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Observation not in consultant screening stage');
  END IF;
  
  SELECT ura.user_id INTO v_site_client_id
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
  
  v_new_status := 'pending_site_client_approval';
  
  UPDATE incidents
  SET 
    status = v_new_status,
    approval_manager_id = COALESCE(v_site_client_id, approval_manager_id),
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
      'routed_to', 'site_client',
      'notes', p_notes
    )
  );
  
  RETURN jsonb_build_object('success', true, 'new_status', v_new_status, 'routed_to', 'site_client');
END;
$$;

-- Add missing contractor violation workflow statuses to incident_status enum
ALTER TYPE incident_status ADD VALUE IF NOT EXISTS 'pending_department_manager_violation_approval';
ALTER TYPE incident_status ADD VALUE IF NOT EXISTS 'pending_contract_controller_approval';
ALTER TYPE incident_status ADD VALUE IF NOT EXISTS 'pending_contractor_site_rep_approval';
ALTER TYPE incident_status ADD VALUE IF NOT EXISTS 'pending_hsse_violation_review';
ALTER TYPE incident_status ADD VALUE IF NOT EXISTS 'contractor_violation_enforced';
ALTER TYPE incident_status ADD VALUE IF NOT EXISTS 'contractor_violation_approved_fine';
ALTER TYPE incident_status ADD VALUE IF NOT EXISTS 'contractor_violation_cancelled';
ALTER TYPE incident_status ADD VALUE IF NOT EXISTS 'contractor_violation_warning';
ALTER TYPE incident_status ADD VALUE IF NOT EXISTS 'contractor_violation_terminated';