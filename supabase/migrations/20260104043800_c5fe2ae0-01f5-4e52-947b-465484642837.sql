-- Add contract_controller role if not exists (using correct columns with category)
INSERT INTO roles (id, code, name, category, description, is_system, is_active, sort_order)
SELECT 
  gen_random_uuid(),
  'contract_controller',
  'Contract Controller',
  'general'::role_category,
  'Reviews and approves contractor violation fines',
  true,
  true,
  50
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE code = 'contract_controller');

-- Add violation tracking columns to incidents table
ALTER TABLE incidents
  ADD COLUMN IF NOT EXISTS violation_type_id UUID REFERENCES violation_types(id),
  ADD COLUMN IF NOT EXISTS violation_occurrence INTEGER,
  ADD COLUMN IF NOT EXISTS violation_penalty_type TEXT,
  ADD COLUMN IF NOT EXISTS violation_fine_amount NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS violation_action_description TEXT,
  ADD COLUMN IF NOT EXISTS violation_dept_manager_approved_by UUID REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS violation_dept_manager_approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS violation_dept_manager_notes TEXT,
  ADD COLUMN IF NOT EXISTS violation_dept_manager_decision TEXT,
  ADD COLUMN IF NOT EXISTS violation_contract_controller_approved_by UUID REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS violation_contract_controller_approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS violation_contract_controller_notes TEXT,
  ADD COLUMN IF NOT EXISTS violation_contract_controller_decision TEXT,
  ADD COLUMN IF NOT EXISTS violation_contractor_rep_acknowledged_by UUID REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS violation_contractor_rep_acknowledged_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS violation_contractor_rep_notes TEXT,
  ADD COLUMN IF NOT EXISTS violation_contractor_rep_decision TEXT,
  ADD COLUMN IF NOT EXISTS violation_hsse_decision TEXT,
  ADD COLUMN IF NOT EXISTS violation_hsse_decided_by UUID REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS violation_hsse_decided_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS violation_hsse_notes TEXT,
  ADD COLUMN IF NOT EXISTS violation_hsse_modified_type_id UUID REFERENCES violation_types(id),
  ADD COLUMN IF NOT EXISTS violation_final_status TEXT,
  ADD COLUMN IF NOT EXISTS violation_finalized_by UUID REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS violation_finalized_at TIMESTAMPTZ;

-- Create RPC: Calculate Contractor Violation Occurrence
CREATE OR REPLACE FUNCTION calculate_contractor_violation_occurrence(
  p_contractor_company_id UUID,
  p_violation_type_id UUID,
  p_tenant_id UUID,
  p_exclude_incident_id UUID DEFAULT NULL
) RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM incidents
  WHERE tenant_id = p_tenant_id
    AND related_contractor_company_id = p_contractor_company_id
    AND violation_type_id = p_violation_type_id
    AND violation_final_status IN ('approved', 'enforced', 'acknowledged')
    AND deleted_at IS NULL
    AND (p_exclude_incident_id IS NULL OR id != p_exclude_incident_id);
  
  RETURN v_count + 1;
END;
$$;

-- Create RPC: Get Violation Details with Occurrence
CREATE OR REPLACE FUNCTION get_violation_details_with_occurrence(
  p_incident_id UUID,
  p_violation_type_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_incident RECORD;
  v_violation_type RECORD;
  v_occurrence INTEGER;
  v_action_type TEXT;
  v_fine_amount NUMERIC;
  v_action_description TEXT;
BEGIN
  SELECT * INTO v_incident FROM incidents WHERE id = p_incident_id AND deleted_at IS NULL;
  IF v_incident IS NULL THEN
    RETURN jsonb_build_object('error', 'Incident not found');
  END IF;
  
  SELECT * INTO v_violation_type FROM violation_types WHERE id = p_violation_type_id AND deleted_at IS NULL;
  IF v_violation_type IS NULL THEN
    RETURN jsonb_build_object('error', 'Violation type not found');
  END IF;
  
  v_occurrence := calculate_contractor_violation_occurrence(
    v_incident.related_contractor_company_id,
    p_violation_type_id,
    v_incident.tenant_id,
    p_incident_id
  );
  
  IF v_occurrence = 1 THEN
    v_action_type := v_violation_type.first_action_type;
    v_fine_amount := v_violation_type.first_fine_amount;
    v_action_description := v_violation_type.first_action_description;
  ELSIF v_occurrence = 2 THEN
    v_action_type := v_violation_type.second_action_type;
    v_fine_amount := v_violation_type.second_fine_amount;
    v_action_description := v_violation_type.second_action_description;
  ELSE
    v_action_type := v_violation_type.third_action_type;
    v_fine_amount := v_violation_type.third_fine_amount;
    v_action_description := v_violation_type.third_action_description;
  END IF;
  
  RETURN jsonb_build_object(
    'occurrence', v_occurrence,
    'occurrence_label', CASE 
      WHEN v_occurrence = 1 THEN '1st'
      WHEN v_occurrence = 2 THEN '2nd'
      ELSE '3rd/Repeated'
    END,
    'action_type', v_action_type,
    'fine_amount', v_fine_amount,
    'action_description', v_action_description,
    'is_fine_only', COALESCE(v_action_type, '') = 'fine',
    'violation_type', jsonb_build_object(
      'id', v_violation_type.id,
      'name', v_violation_type.name,
      'name_ar', v_violation_type.name_ar,
      'severity_level', v_violation_type.severity_level,
      'category', v_violation_type.category
    )
  );
END;
$$;

-- Create RPC: Submit Contractor Violation
CREATE OR REPLACE FUNCTION submit_contractor_violation(
  p_incident_id UUID,
  p_violation_type_id UUID,
  p_user_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_incident RECORD;
  v_violation_details JSONB;
BEGIN
  SELECT * INTO v_incident FROM incidents WHERE id = p_incident_id AND deleted_at IS NULL;
  
  IF v_incident IS NULL THEN
    RETURN jsonb_build_object('error', 'Incident not found');
  END IF;
  
  IF v_incident.event_type != 'observation' THEN
    RETURN jsonb_build_object('error', 'Contractor violations only apply to observations');
  END IF;
  
  IF v_incident.related_contractor_company_id IS NULL THEN
    RETURN jsonb_build_object('error', 'This observation is not against a contractor');
  END IF;
  
  IF p_violation_type_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Violation type is required for contractor observations');
  END IF;
  
  v_violation_details := get_violation_details_with_occurrence(p_incident_id, p_violation_type_id);
  
  IF v_violation_details ? 'error' THEN
    RETURN v_violation_details;
  END IF;
  
  UPDATE incidents SET
    violation_type_id = p_violation_type_id,
    violation_occurrence = (v_violation_details->>'occurrence')::INTEGER,
    violation_penalty_type = v_violation_details->>'action_type',
    violation_fine_amount = (v_violation_details->>'fine_amount')::NUMERIC,
    violation_action_description = v_violation_details->>'action_description',
    status = 'pending_department_manager_violation_approval',
    updated_at = NOW()
  WHERE id = p_incident_id;
  
  INSERT INTO incident_audit_logs (incident_id, tenant_id, actor_id, action, new_value)
  VALUES (
    p_incident_id,
    v_incident.tenant_id,
    p_user_id,
    'contractor_violation_submitted',
    jsonb_build_object(
      'violation_type_id', p_violation_type_id,
      'occurrence', v_violation_details->>'occurrence',
      'penalty_type', v_violation_details->>'action_type',
      'fine_amount', v_violation_details->>'fine_amount'
    )
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'violation_details', v_violation_details
  );
END;
$$;

-- Create RPC: Department Manager Violation Approval
CREATE OR REPLACE FUNCTION dept_manager_approve_violation(
  p_incident_id UUID,
  p_user_id UUID,
  p_decision TEXT,
  p_notes TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_incident RECORD;
  v_new_status TEXT;
BEGIN
  SELECT * INTO v_incident FROM incidents WHERE id = p_incident_id AND deleted_at IS NULL;
  
  IF v_incident IS NULL THEN
    RETURN jsonb_build_object('error', 'Incident not found');
  END IF;
  
  IF v_incident.status != 'pending_department_manager_violation_approval' THEN
    RETURN jsonb_build_object('error', 'Incident is not pending department manager violation approval');
  END IF;
  
  IF p_decision = 'approved' THEN
    IF v_incident.violation_penalty_type = 'fine' THEN
      v_new_status := 'pending_contract_controller_approval';
    ELSE
      v_new_status := 'pending_contractor_site_rep_approval';
    END IF;
  ELSIF p_decision = 'rejected' THEN
    v_new_status := 'pending_hsse_violation_review';
  ELSE
    RETURN jsonb_build_object('error', 'Invalid decision');
  END IF;
  
  UPDATE incidents SET
    violation_dept_manager_approved_by = p_user_id,
    violation_dept_manager_approved_at = NOW(),
    violation_dept_manager_notes = p_notes,
    violation_dept_manager_decision = p_decision,
    status = v_new_status,
    updated_at = NOW()
  WHERE id = p_incident_id;
  
  INSERT INTO incident_audit_logs (incident_id, tenant_id, actor_id, action, new_value)
  VALUES (
    p_incident_id,
    v_incident.tenant_id,
    p_user_id,
    'dept_manager_violation_' || p_decision,
    jsonb_build_object('decision', p_decision, 'notes', p_notes, 'new_status', v_new_status)
  );
  
  RETURN jsonb_build_object('success', true, 'new_status', v_new_status);
END;
$$;

-- Create RPC: Contract Controller Approval
CREATE OR REPLACE FUNCTION contract_controller_approve_violation(
  p_incident_id UUID,
  p_user_id UUID,
  p_decision TEXT,
  p_notes TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_incident RECORD;
  v_new_status TEXT;
BEGIN
  SELECT * INTO v_incident FROM incidents WHERE id = p_incident_id AND deleted_at IS NULL;
  
  IF v_incident IS NULL THEN
    RETURN jsonb_build_object('error', 'Incident not found');
  END IF;
  
  IF v_incident.status != 'pending_contract_controller_approval' THEN
    RETURN jsonb_build_object('error', 'Incident is not pending contract controller approval');
  END IF;
  
  IF p_decision = 'approved' THEN
    v_new_status := 'contractor_violation_approved_fine';
    
    UPDATE incidents SET
      violation_contract_controller_approved_by = p_user_id,
      violation_contract_controller_approved_at = NOW(),
      violation_contract_controller_notes = p_notes,
      violation_contract_controller_decision = p_decision,
      violation_final_status = 'approved',
      violation_finalized_by = p_user_id,
      violation_finalized_at = NOW(),
      status = v_new_status,
      updated_at = NOW()
    WHERE id = p_incident_id;
  ELSIF p_decision = 'rejected' THEN
    v_new_status := 'pending_hsse_violation_review';
    
    UPDATE incidents SET
      violation_contract_controller_approved_by = p_user_id,
      violation_contract_controller_approved_at = NOW(),
      violation_contract_controller_notes = p_notes,
      violation_contract_controller_decision = p_decision,
      status = v_new_status,
      updated_at = NOW()
    WHERE id = p_incident_id;
  ELSE
    RETURN jsonb_build_object('error', 'Invalid decision');
  END IF;
  
  INSERT INTO incident_audit_logs (incident_id, tenant_id, actor_id, action, new_value)
  VALUES (
    p_incident_id,
    v_incident.tenant_id,
    p_user_id,
    'contract_controller_violation_' || p_decision,
    jsonb_build_object('decision', p_decision, 'notes', p_notes, 'new_status', v_new_status)
  );
  
  RETURN jsonb_build_object('success', true, 'new_status', v_new_status);
END;
$$;

-- Create RPC: Contractor Site Rep Acknowledge
CREATE OR REPLACE FUNCTION contractor_site_rep_acknowledge_violation(
  p_incident_id UUID,
  p_user_id UUID,
  p_decision TEXT,
  p_notes TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_incident RECORD;
  v_new_status TEXT;
BEGIN
  SELECT * INTO v_incident FROM incidents WHERE id = p_incident_id AND deleted_at IS NULL;
  
  IF v_incident IS NULL THEN
    RETURN jsonb_build_object('error', 'Incident not found');
  END IF;
  
  IF v_incident.status != 'pending_contractor_site_rep_approval' THEN
    RETURN jsonb_build_object('error', 'Incident is not pending contractor acknowledgment');
  END IF;
  
  IF p_decision = 'acknowledged' THEN
    v_new_status := 'contractor_violation_acknowledged';
    
    UPDATE incidents SET
      violation_contractor_rep_acknowledged_by = p_user_id,
      violation_contractor_rep_acknowledged_at = NOW(),
      violation_contractor_rep_notes = p_notes,
      violation_contractor_rep_decision = p_decision,
      violation_final_status = 'acknowledged',
      violation_finalized_by = p_user_id,
      violation_finalized_at = NOW(),
      status = v_new_status,
      updated_at = NOW()
    WHERE id = p_incident_id;
  ELSIF p_decision = 'rejected' THEN
    v_new_status := 'pending_hsse_violation_review';
    
    UPDATE incidents SET
      violation_contractor_rep_acknowledged_by = p_user_id,
      violation_contractor_rep_acknowledged_at = NOW(),
      violation_contractor_rep_notes = p_notes,
      violation_contractor_rep_decision = p_decision,
      status = v_new_status,
      updated_at = NOW()
    WHERE id = p_incident_id;
  ELSE
    RETURN jsonb_build_object('error', 'Invalid decision');
  END IF;
  
  INSERT INTO incident_audit_logs (incident_id, tenant_id, actor_id, action, new_value)
  VALUES (
    p_incident_id,
    v_incident.tenant_id,
    p_user_id,
    'contractor_rep_violation_' || p_decision,
    jsonb_build_object('decision', p_decision, 'notes', p_notes, 'new_status', v_new_status)
  );
  
  RETURN jsonb_build_object('success', true, 'new_status', v_new_status);
END;
$$;

-- Create RPC: HSSE Violation Review (Final Authority)
CREATE OR REPLACE FUNCTION hsse_review_violation(
  p_incident_id UUID,
  p_user_id UUID,
  p_decision TEXT,
  p_notes TEXT DEFAULT NULL,
  p_modified_violation_type_id UUID DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_incident RECORD;
  v_new_status TEXT;
  v_final_status TEXT;
BEGIN
  SELECT * INTO v_incident FROM incidents WHERE id = p_incident_id AND deleted_at IS NULL;
  
  IF v_incident IS NULL THEN
    RETURN jsonb_build_object('error', 'Incident not found');
  END IF;
  
  IF v_incident.status != 'pending_hsse_violation_review' THEN
    RETURN jsonb_build_object('error', 'Incident is not pending HSSE violation review');
  END IF;
  
  IF p_decision NOT IN ('enforce', 'modify', 'cancel') THEN
    RETURN jsonb_build_object('error', 'Invalid decision');
  END IF;
  
  IF p_decision = 'enforce' THEN
    v_new_status := 'contractor_violation_enforced';
    v_final_status := 'enforced';
  ELSIF p_decision = 'modify' THEN
    IF p_modified_violation_type_id IS NULL THEN
      RETURN jsonb_build_object('error', 'Modified violation type is required');
    END IF;
    v_new_status := 'contractor_violation_enforced';
    v_final_status := 'enforced';
  ELSIF p_decision = 'cancel' THEN
    v_new_status := 'contractor_violation_cancelled';
    v_final_status := 'cancelled';
  END IF;
  
  UPDATE incidents SET
    violation_hsse_decision = p_decision,
    violation_hsse_decided_by = p_user_id,
    violation_hsse_decided_at = NOW(),
    violation_hsse_notes = p_notes,
    violation_hsse_modified_type_id = CASE WHEN p_decision = 'modify' THEN p_modified_violation_type_id ELSE NULL END,
    violation_final_status = v_final_status,
    violation_finalized_by = p_user_id,
    violation_finalized_at = NOW(),
    status = v_new_status,
    updated_at = NOW()
  WHERE id = p_incident_id;
  
  INSERT INTO incident_audit_logs (incident_id, tenant_id, actor_id, action, new_value)
  VALUES (
    p_incident_id,
    v_incident.tenant_id,
    p_user_id,
    'hsse_violation_' || p_decision,
    jsonb_build_object('decision', p_decision, 'notes', p_notes, 'modified_type_id', p_modified_violation_type_id, 'final_status', v_final_status)
  );
  
  RETURN jsonb_build_object('success', true, 'new_status', v_new_status, 'final_status', v_final_status);
END;
$$;

-- Create RPC: Check if user can approve violation at current stage
CREATE OR REPLACE FUNCTION can_approve_violation(
  p_incident_id UUID,
  p_user_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_incident RECORD;
  v_user_roles TEXT[];
  v_can_approve BOOLEAN := FALSE;
  v_required_role TEXT;
BEGIN
  SELECT * INTO v_incident FROM incidents WHERE id = p_incident_id AND deleted_at IS NULL;
  
  IF v_incident IS NULL THEN
    RETURN jsonb_build_object('can_approve', false, 'reason', 'Incident not found');
  END IF;
  
  SELECT ARRAY_AGG(r.code) INTO v_user_roles
  FROM user_roles ur
  JOIN roles r ON ur.role_id = r.id
  WHERE ur.user_id = p_user_id AND ur.deleted_at IS NULL;
  
  CASE v_incident.status
    WHEN 'pending_department_manager_violation_approval' THEN
      v_required_role := 'department_manager';
      v_can_approve := 'department_manager' = ANY(v_user_roles);
    WHEN 'pending_contract_controller_approval' THEN
      v_required_role := 'contract_controller';
      v_can_approve := 'contract_controller' = ANY(v_user_roles);
    WHEN 'pending_contractor_site_rep_approval' THEN
      v_required_role := 'contractor_site_rep';
      v_can_approve := 'contractor_site_rep' = ANY(v_user_roles) OR 'contractor_safety_officer' = ANY(v_user_roles);
    WHEN 'pending_hsse_violation_review' THEN
      v_required_role := 'hsse_expert';
      v_can_approve := 'hsse_expert' = ANY(v_user_roles) OR 'hsse_manager' = ANY(v_user_roles);
    ELSE
      RETURN jsonb_build_object('can_approve', false, 'reason', 'No violation approval pending');
  END CASE;
  
  IF v_can_approve THEN
    RETURN jsonb_build_object('can_approve', true, 'stage', v_incident.status);
  ELSE
    RETURN jsonb_build_object('can_approve', false, 'reason', 'User does not have required role: ' || v_required_role);
  END IF;
END;
$$;