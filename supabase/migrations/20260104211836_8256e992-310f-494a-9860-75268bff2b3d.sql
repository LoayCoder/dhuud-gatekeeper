-- =====================================================
-- INCIDENT REPORTING MODULE: BACKEND LOGIC (Session 2)
-- =====================================================

-- Task 2.1: investigator_identify_contractor_violation()
-- Allows investigators to flag contractor violations during investigation
CREATE OR REPLACE FUNCTION public.investigator_identify_contractor_violation(
  p_investigation_id UUID,
  p_violation_type_id UUID,
  p_root_cause_summary TEXT,
  p_contractor_contribution_percentage INTEGER,
  p_evidence_summary TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_investigation RECORD;
  v_incident RECORD;
  v_lifecycle_id UUID;
  v_occurrence INTEGER;
BEGIN
  -- Get investigation details
  SELECT i.*, inc.id as incident_id, inc.related_contractor_company_id, inc.tenant_id as inc_tenant_id
  INTO v_investigation
  FROM investigations i
  JOIN incidents inc ON inc.id = i.incident_id
  WHERE i.id = p_investigation_id
  AND i.deleted_at IS NULL;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Investigation not found');
  END IF;

  -- Validate investigator is assigned
  IF v_investigation.investigator_id != v_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only the assigned investigator can identify violations');
  END IF;

  -- Validate contractor is associated
  IF v_investigation.related_contractor_company_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No contractor associated with this incident');
  END IF;

  -- Validate contribution percentage
  IF p_contractor_contribution_percentage < 0 OR p_contractor_contribution_percentage > 100 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Contribution percentage must be between 0 and 100');
  END IF;

  -- Validate root cause summary length
  IF length(p_root_cause_summary) < 50 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Root cause summary must be at least 50 characters');
  END IF;

  -- Get violation occurrence using existing function
  SELECT occurrence INTO v_occurrence
  FROM get_violation_details_with_occurrence(
    v_investigation.related_contractor_company_id,
    p_violation_type_id
  );

  -- Create lifecycle record
  INSERT INTO incident_violation_lifecycle (
    tenant_id,
    incident_id,
    investigation_id,
    contractor_company_id,
    violation_type_id,
    violation_occurrence,
    violation_evidence_summary,
    root_cause_summary,
    contractor_contribution_percentage,
    identified_at,
    identified_by,
    final_status
  ) VALUES (
    v_investigation.inc_tenant_id,
    v_investigation.incident_id,
    p_investigation_id,
    v_investigation.related_contractor_company_id,
    p_violation_type_id,
    COALESCE(v_occurrence, 1),
    p_evidence_summary,
    p_root_cause_summary,
    p_contractor_contribution_percentage,
    now(),
    v_user_id,
    'pending'
  )
  RETURNING id INTO v_lifecycle_id;

  -- Update investigation flags
  UPDATE investigations SET
    violation_identified = TRUE,
    violation_type_id = p_violation_type_id,
    violation_occurrence = COALESCE(v_occurrence, 1),
    root_cause_contractor_related = TRUE,
    contractor_contribution_percentage = p_contractor_contribution_percentage,
    updated_at = now()
  WHERE id = p_investigation_id;

  -- Log to audit
  INSERT INTO incident_audit_logs (
    incident_id,
    actor_id,
    action,
    old_value,
    new_value,
    tenant_id
  ) VALUES (
    v_investigation.incident_id,
    v_user_id,
    'violation_identified',
    NULL,
    jsonb_build_object(
      'lifecycle_id', v_lifecycle_id,
      'violation_type_id', p_violation_type_id,
      'contribution_percentage', p_contractor_contribution_percentage
    ),
    v_investigation.inc_tenant_id
  );

  RETURN jsonb_build_object(
    'success', true,
    'lifecycle_id', v_lifecycle_id,
    'occurrence', COALESCE(v_occurrence, 1)
  );
END;
$$;

-- Task 2.2: investigator_submit_contractor_violation()
-- Submits the identified violation for approval workflow
CREATE OR REPLACE FUNCTION public.investigator_submit_contractor_violation(
  p_investigation_id UUID,
  p_evidence_summary TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_investigation RECORD;
  v_lifecycle RECORD;
BEGIN
  -- Get investigation details
  SELECT i.*, inc.id as incident_id, inc.tenant_id as inc_tenant_id, inc.status as inc_status
  INTO v_investigation
  FROM investigations i
  JOIN incidents inc ON inc.id = i.incident_id
  WHERE i.id = p_investigation_id
  AND i.deleted_at IS NULL;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Investigation not found');
  END IF;

  -- Validate investigator
  IF v_investigation.investigator_id != v_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only the assigned investigator can submit violations');
  END IF;

  -- Check violation is identified
  IF NOT v_investigation.violation_identified THEN
    RETURN jsonb_build_object('success', false, 'error', 'No violation has been identified yet');
  END IF;

  -- Get lifecycle record
  SELECT * INTO v_lifecycle
  FROM incident_violation_lifecycle
  WHERE investigation_id = p_investigation_id
  AND deleted_at IS NULL
  ORDER BY created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Violation lifecycle record not found');
  END IF;

  -- Check not already submitted
  IF v_lifecycle.submitted_at IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Violation has already been submitted');
  END IF;

  -- Update lifecycle record
  UPDATE incident_violation_lifecycle SET
    violation_evidence_summary = p_evidence_summary,
    submitted_at = now(),
    submitted_by = v_user_id,
    final_status = 'in_progress',
    updated_at = now()
  WHERE id = v_lifecycle.id;

  -- Update investigation
  UPDATE investigations SET
    violation_evidence_summary = p_evidence_summary,
    violation_submitted_at = now(),
    violation_submitted_by = v_user_id,
    updated_at = now()
  WHERE id = p_investigation_id;

  -- Update incident status to pending department manager approval
  UPDATE incidents SET
    status = 'pending_department_manager_violation_approval',
    updated_at = now()
  WHERE id = v_investigation.incident_id;

  -- Log to audit
  INSERT INTO incident_audit_logs (
    incident_id,
    actor_id,
    action,
    old_value,
    new_value,
    tenant_id
  ) VALUES (
    v_investigation.incident_id,
    v_user_id,
    'violation_submitted',
    jsonb_build_object('status', v_investigation.inc_status),
    jsonb_build_object(
      'status', 'pending_department_manager_violation_approval',
      'lifecycle_id', v_lifecycle.id
    ),
    v_investigation.inc_tenant_id
  );

  RETURN jsonb_build_object(
    'success', true,
    'lifecycle_id', v_lifecycle.id,
    'new_status', 'pending_department_manager_violation_approval'
  );
END;
$$;

-- Task 2.3: check_incident_closure_prerequisites()
-- Returns whether incident is ready for closure and any blocking reasons
CREATE OR REPLACE FUNCTION public.check_incident_closure_prerequisites(
  p_incident_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_incident RECORD;
  v_investigation RECORD;
  v_blocking_reasons TEXT[] := '{}';
  v_open_actions INTEGER;
  v_unverified_actions INTEGER;
  v_pending_violations INTEGER;
  v_ready BOOLEAN := TRUE;
BEGIN
  -- Get incident
  SELECT * INTO v_incident
  FROM incidents
  WHERE id = p_incident_id
  AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Incident not found');
  END IF;

  -- Get investigation
  SELECT * INTO v_investigation
  FROM investigations
  WHERE incident_id = p_incident_id
  AND deleted_at IS NULL
  ORDER BY created_at DESC
  LIMIT 1;

  -- Check 1: Investigation exists and is completed
  IF v_investigation IS NULL THEN
    v_blocking_reasons := array_append(v_blocking_reasons, 'No investigation found');
    v_ready := FALSE;
  ELSIF v_investigation.completed_at IS NULL THEN
    v_blocking_reasons := array_append(v_blocking_reasons, 'Investigation not completed');
    v_ready := FALSE;
  END IF;

  -- Check 2: Root cause analysis documented
  IF v_investigation IS NOT NULL AND (v_investigation.root_cause IS NULL OR v_investigation.root_cause = '') THEN
    v_blocking_reasons := array_append(v_blocking_reasons, 'Root cause analysis not documented');
    v_ready := FALSE;
  END IF;

  -- Check 3: Immediate cause documented
  IF v_investigation IS NOT NULL AND (v_investigation.immediate_cause IS NULL OR v_investigation.immediate_cause = '') THEN
    v_blocking_reasons := array_append(v_blocking_reasons, 'Immediate cause not documented');
    v_ready := FALSE;
  END IF;

  -- Check 4: All corrective actions completed
  SELECT COUNT(*) INTO v_open_actions
  FROM corrective_actions
  WHERE incident_id = p_incident_id
  AND deleted_at IS NULL
  AND status NOT IN ('completed', 'verified', 'cancelled');

  IF v_open_actions > 0 THEN
    v_blocking_reasons := array_append(v_blocking_reasons, format('%s corrective action(s) not completed', v_open_actions));
    v_ready := FALSE;
  END IF;

  -- Check 5: All actions verified
  SELECT COUNT(*) INTO v_unverified_actions
  FROM corrective_actions
  WHERE incident_id = p_incident_id
  AND deleted_at IS NULL
  AND status = 'completed';

  IF v_unverified_actions > 0 THEN
    v_blocking_reasons := array_append(v_blocking_reasons, format('%s corrective action(s) pending verification', v_unverified_actions));
    v_ready := FALSE;
  END IF;

  -- Check 6: If violation identified, must be finalized
  IF v_investigation IS NOT NULL AND v_investigation.violation_identified THEN
    SELECT COUNT(*) INTO v_pending_violations
    FROM incident_violation_lifecycle
    WHERE investigation_id = v_investigation.id
    AND deleted_at IS NULL
    AND final_status NOT IN ('finalized', 'cancelled');

    IF v_pending_violations > 0 THEN
      v_blocking_reasons := array_append(v_blocking_reasons, 'Contractor violation not finalized');
      v_ready := FALSE;
    END IF;
  END IF;

  -- Check 7: HSSE validation completed
  IF v_incident.hsse_validated_at IS NULL THEN
    v_blocking_reasons := array_append(v_blocking_reasons, 'HSSE validation not completed');
    v_ready := FALSE;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'ready_for_closure', v_ready,
    'blocking_reasons', to_jsonb(v_blocking_reasons),
    'checks', jsonb_build_object(
      'investigation_complete', v_investigation IS NOT NULL AND v_investigation.completed_at IS NOT NULL,
      'root_cause_documented', v_investigation IS NOT NULL AND v_investigation.root_cause IS NOT NULL AND v_investigation.root_cause != '',
      'immediate_cause_documented', v_investigation IS NOT NULL AND v_investigation.immediate_cause IS NOT NULL AND v_investigation.immediate_cause != '',
      'all_actions_completed', v_open_actions = 0,
      'all_actions_verified', v_unverified_actions = 0,
      'violation_finalized', NOT (v_investigation IS NOT NULL AND v_investigation.violation_identified) OR v_pending_violations = 0,
      'hsse_validated', v_incident.hsse_validated_at IS NOT NULL
    )
  );
END;
$$;

-- Task 2.4: hsse_validate_incident_closure()
-- HSSE validation for incident closure with three decision options
CREATE OR REPLACE FUNCTION public.hsse_validate_incident_closure(
  p_incident_id UUID,
  p_decision TEXT,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_user_role TEXT;
  v_incident RECORD;
  v_prerequisites JSONB;
BEGIN
  -- Validate decision
  IF p_decision NOT IN ('approve', 'reject', 'request_investigation_review') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid decision. Must be: approve, reject, or request_investigation_review');
  END IF;

  -- Get user role
  SELECT role INTO v_user_role
  FROM profiles
  WHERE id = v_user_id;

  -- Validate HSSE role
  IF v_user_role NOT IN ('hsse_manager', 'super_admin', 'admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only HSSE managers can validate incident closure');
  END IF;

  -- Get incident
  SELECT * INTO v_incident
  FROM incidents
  WHERE id = p_incident_id
  AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Incident not found');
  END IF;

  -- Check prerequisites if approving
  IF p_decision = 'approve' THEN
    v_prerequisites := check_incident_closure_prerequisites(p_incident_id);
    
    IF NOT (v_prerequisites->>'ready_for_closure')::boolean THEN
      RETURN jsonb_build_object(
        'success', false, 
        'error', 'Prerequisites not met for closure',
        'blocking_reasons', v_prerequisites->'blocking_reasons'
      );
    END IF;
  END IF;

  -- Process decision
  CASE p_decision
    WHEN 'approve' THEN
      UPDATE incidents SET
        hsse_validated_at = now(),
        hsse_validated_by = v_user_id,
        hsse_validation_notes = p_notes,
        ready_for_closure = TRUE,
        closure_prerequisites_met_at = now(),
        status = 'pending_final_closure',
        updated_at = now()
      WHERE id = p_incident_id;

    WHEN 'reject' THEN
      UPDATE incidents SET
        hsse_validation_notes = p_notes,
        status = 'hsse_validation_rejected',
        updated_at = now()
      WHERE id = p_incident_id;

    WHEN 'request_investigation_review' THEN
      UPDATE incidents SET
        hsse_validation_notes = p_notes,
        status = 'investigation_in_progress',
        updated_at = now()
      WHERE id = p_incident_id;

      -- Mark investigation as needing review
      UPDATE investigations SET
        review_requested_at = now(),
        review_requested_by = v_user_id,
        review_notes = p_notes,
        updated_at = now()
      WHERE incident_id = p_incident_id
      AND deleted_at IS NULL;
  END CASE;

  -- Log to audit
  INSERT INTO incident_audit_logs (
    incident_id,
    actor_id,
    action,
    old_value,
    new_value,
    tenant_id
  ) VALUES (
    p_incident_id,
    v_user_id,
    'hsse_incident_validation',
    jsonb_build_object('status', v_incident.status),
    jsonb_build_object(
      'decision', p_decision,
      'notes', p_notes,
      'new_status', CASE p_decision 
        WHEN 'approve' THEN 'pending_final_closure'
        WHEN 'reject' THEN 'hsse_validation_rejected'
        ELSE 'investigation_in_progress'
      END
    ),
    v_incident.tenant_id
  );

  RETURN jsonb_build_object(
    'success', true,
    'decision', p_decision,
    'new_status', CASE p_decision 
      WHEN 'approve' THEN 'pending_final_closure'
      WHEN 'reject' THEN 'hsse_validation_rejected'
      ELSE 'investigation_in_progress'
    END
  );
END;
$$;

-- Task 2.5: auto_close_incident_when_ready() trigger function
CREATE OR REPLACE FUNCTION public.auto_close_incident_when_ready()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if ready_for_closure just became TRUE
  IF NEW.ready_for_closure = TRUE AND (OLD.ready_for_closure IS NULL OR OLD.ready_for_closure = FALSE) THEN
    -- If status is pending_final_closure, auto-close
    IF NEW.status = 'pending_final_closure' THEN
      NEW.status := 'closed';
      NEW.closed_at := now();
      NEW.closed_by := NEW.hsse_validated_by;
      NEW.closure_notes := COALESCE(NEW.closure_notes, 'Auto-closed after HSSE validation and all prerequisites met');
      
      -- Log will be handled by a separate audit trigger if exists
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for auto-close
DROP TRIGGER IF EXISTS trigger_auto_close_incident ON public.incidents;
CREATE TRIGGER trigger_auto_close_incident
BEFORE UPDATE ON public.incidents
FOR EACH ROW
EXECUTE FUNCTION public.auto_close_incident_when_ready();

-- Task 2.6: sync_incident_violation_lifecycle() trigger function
CREATE OR REPLACE FUNCTION public.sync_incident_violation_lifecycle()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_investigation RECORD;
BEGIN
  -- Only sync when violation-related columns change
  IF NEW.violation_identified IS DISTINCT FROM OLD.violation_identified
     OR NEW.violation_type_id IS DISTINCT FROM OLD.violation_type_id
     OR NEW.violation_submitted_at IS DISTINCT FROM OLD.violation_submitted_at THEN
    
    -- Get incident for this investigation
    SELECT inc.related_contractor_company_id, inc.tenant_id, inc.id as incident_id
    INTO v_investigation
    FROM incidents inc
    WHERE inc.id = NEW.incident_id;

    -- Update or create lifecycle record
    IF NEW.violation_identified AND v_investigation.related_contractor_company_id IS NOT NULL THEN
      INSERT INTO incident_violation_lifecycle (
        tenant_id,
        incident_id,
        investigation_id,
        contractor_company_id,
        violation_type_id,
        violation_occurrence,
        contractor_contribution_percentage,
        final_status
      ) VALUES (
        v_investigation.tenant_id,
        v_investigation.incident_id,
        NEW.id,
        v_investigation.related_contractor_company_id,
        NEW.violation_type_id,
        COALESCE(NEW.violation_occurrence, 1),
        NEW.contractor_contribution_percentage,
        'pending'
      )
      ON CONFLICT (investigation_id) WHERE deleted_at IS NULL
      DO UPDATE SET
        violation_type_id = EXCLUDED.violation_type_id,
        violation_occurrence = EXCLUDED.violation_occurrence,
        contractor_contribution_percentage = EXCLUDED.contractor_contribution_percentage,
        updated_at = now();
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Add unique constraint for sync trigger
CREATE UNIQUE INDEX IF NOT EXISTS idx_incident_violation_lifecycle_investigation_unique
ON public.incident_violation_lifecycle(investigation_id)
WHERE deleted_at IS NULL;

-- Create trigger for sync
DROP TRIGGER IF EXISTS trigger_sync_incident_violation_lifecycle ON public.investigations;
CREATE TRIGGER trigger_sync_incident_violation_lifecycle
AFTER UPDATE ON public.investigations
FOR EACH ROW
EXECUTE FUNCTION public.sync_incident_violation_lifecycle();

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.investigator_identify_contractor_violation TO authenticated;
GRANT EXECUTE ON FUNCTION public.investigator_submit_contractor_violation TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_incident_closure_prerequisites TO authenticated;
GRANT EXECUTE ON FUNCTION public.hsse_validate_incident_closure TO authenticated;