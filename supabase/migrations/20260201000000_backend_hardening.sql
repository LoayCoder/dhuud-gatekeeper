/*
  # Backend Hardening: Validation Gates & Auto-Closure

  1.  `check_sla_escalation`: Updated to cover all screening statuses.
  2.  `check_incident_closure_prerequisites`: Explicit definition for strict validation.
  3.  `enforce_incident_closure_gate`: Trigger to block closure if prerequisites not met.
  4.  `check_auto_incident_closure`: Trigger to auto-close incident when actions complete (if valid).
*/

-- 1. Update SLA Escalation Check (Expanded Scope)
CREATE OR REPLACE FUNCTION check_sla_escalation(incident_id uuid)
RETURNS boolean AS $$
DECLARE
  v_incident incidents%ROWTYPE;
  v_threshold interval := '2 hours';
BEGIN
  SELECT * INTO v_incident FROM incidents WHERE id = incident_id;

  -- Check against ALL screening statuses defined in V1.1 workflow
  IF (v_incident.status = 'pending_expert_screening'
      OR v_incident.status = 'pending_dept_rep_approval'
      OR v_incident.status = 'pending_consultant_screening'
      OR v_incident.status = 'pending_site_client_approval'
      OR v_incident.status = 'pending_contractor_implementation')
     AND v_incident.sla_screening_start_time IS NOT NULL
     AND (now() - v_incident.sla_screening_start_time) > v_threshold
     AND NOT v_incident.is_auto_escalated THEN

     UPDATE incidents
     SET is_auto_escalated = true
     WHERE id = incident_id;

     RETURN true;
  END IF;

  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. HARDENED VALIDATION GATE (Gate n26)
-- Explicit definition to ensure availability and strict logic
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
  v_rca RECORD;
  v_blocking_reasons TEXT[] := '{}';
  v_open_actions INTEGER;
  v_unverified_actions INTEGER;
  v_pending_violations INTEGER;
  v_evidence_count INTEGER;
  v_unapproved_witnesses INTEGER;
  v_ready BOOLEAN := TRUE;
  v_has_violations BOOLEAN := FALSE;
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

  -- Get RCA
  SELECT * INTO v_rca
  FROM incident_rca
  WHERE incident_id = p_incident_id
  LIMIT 1;

  -- Check 1: Investigation exists and is completed
  IF v_investigation IS NULL THEN
    v_blocking_reasons := array_append(v_blocking_reasons, 'No investigation found');
    v_ready := FALSE;
  ELSIF v_investigation.completed_at IS NULL THEN
    v_blocking_reasons := array_append(v_blocking_reasons, 'Investigation not completed');
    v_ready := FALSE;
  END IF;

  -- Check 2: RCA Locking (Gate n26)
  IF v_rca IS NULL THEN
    v_blocking_reasons := array_append(v_blocking_reasons, 'RCA not started');
    v_ready := FALSE;
  ELSIF v_rca.is_locked IS NOT TRUE THEN
    v_blocking_reasons := array_append(v_blocking_reasons, 'RCA must be locked (finalized)');
    v_ready := FALSE;
  END IF;

  -- Check 3: Evidence Existence (Gate n26)
  SELECT COUNT(*) INTO v_evidence_count
  FROM incident_evidence
  WHERE incident_id = p_incident_id
  AND is_soft_deleted = false;

  IF v_evidence_count = 0 THEN
    v_blocking_reasons := array_append(v_blocking_reasons, 'At least one piece of evidence is required');
    v_ready := FALSE;
  END IF;

  -- Check 4: Witness Statements Status (Gate n26)
  SELECT COUNT(*) INTO v_unapproved_witnesses
  FROM witness_statements
  WHERE incident_id = p_incident_id
  AND deleted_at IS NULL
  AND status != 'approved'; -- Must be approved

  IF v_unapproved_witnesses > 0 THEN
    v_blocking_reasons := array_append(v_blocking_reasons, 'All witness statements must be approved');
    v_ready := FALSE;
  END IF;

  -- Check 5: Root cause analysis documented
  IF v_investigation IS NOT NULL AND (v_investigation.root_cause IS NULL OR v_investigation.root_cause = '') THEN
     IF v_rca IS NULL OR v_rca.root_causes IS NULL THEN
        v_blocking_reasons := array_append(v_blocking_reasons, 'Root cause analysis not documented');
        v_ready := FALSE;
     END IF;
  END IF;

  -- Check 6: All corrective actions completed
  SELECT COUNT(*) INTO v_open_actions
  FROM corrective_actions
  WHERE incident_id = p_incident_id
  AND deleted_at IS NULL
  AND status NOT IN ('completed', 'verified', 'closed', 'cancelled');

  IF v_open_actions > 0 THEN
    v_blocking_reasons := array_append(v_blocking_reasons, format('%s corrective action(s) not completed', v_open_actions));
    v_ready := FALSE;
  END IF;

  -- Check 7: All actions verified
  SELECT COUNT(*) INTO v_unverified_actions
  FROM corrective_actions
  WHERE incident_id = p_incident_id
  AND deleted_at IS NULL
  AND status = 'completed';

  IF v_unverified_actions > 0 THEN
    v_blocking_reasons := array_append(v_blocking_reasons, format('%s corrective action(s) pending verification', v_unverified_actions));
    v_ready := FALSE;
  END IF;

  -- Check 8: If violation identified or present, must be finalized
  -- Check if legacy flag is true OR if any rows exist in contract_violations
  IF (v_investigation IS NOT NULL AND v_investigation.violation_identified) THEN
     v_has_violations := TRUE;
  ELSE
     -- Check if any violations exist in the new table
     PERFORM 1 FROM contract_violations WHERE incident_id = p_incident_id LIMIT 1;
     IF FOUND THEN
        v_has_violations := TRUE;
     END IF;
  END IF;

  IF v_has_violations THEN
    -- Count violations that are NOT finalized and NOT rejected (i.e. pending/draft)
    -- We check both contract_violations (new) and legacy if relevant, but focusing on V1.1 table
    SELECT COUNT(*) INTO v_pending_violations
    FROM contract_violations
    WHERE incident_id = p_incident_id
    AND status NOT IN ('finalized', 'rejected');

    IF v_pending_violations > 0 THEN
      v_blocking_reasons := array_append(v_blocking_reasons, 'Contractor violation(s) must be finalized or rejected');
      v_ready := FALSE;
    END IF;
  END IF;

  -- Check 9: HSSE validation completed
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
      'rca_locked', v_rca IS NOT NULL AND v_rca.is_locked,
      'evidence_present', v_evidence_count > 0,
      'witness_approved', v_unapproved_witnesses = 0,
      'all_actions_completed', v_open_actions = 0,
      'all_actions_verified', v_unverified_actions = 0,
      'violation_finalized', NOT v_has_violations OR v_pending_violations = 0,
      'hsse_validated', v_incident.hsse_validated_at IS NOT NULL
    )
  );
END;
$$;


-- 3. Hard Validation Gate Trigger
CREATE OR REPLACE FUNCTION enforce_incident_closure_gate()
RETURNS TRIGGER AS $$
DECLARE
  v_check_result jsonb;
  v_is_super_admin boolean;
BEGIN
  -- Only run check if status is changing to 'closed'
  IF NEW.status = 'closed' AND (OLD.status IS DISTINCT FROM 'closed') THEN

    -- Check for super_admin bypass
    SELECT is_super_admin(auth.uid()) INTO v_is_super_admin;

    IF v_is_super_admin THEN
      RETURN NEW;
    END IF;

    -- Run the comprehensive check
    v_check_result := check_incident_closure_prerequisites(NEW.id);

    IF (v_check_result->>'ready_for_closure')::boolean = false THEN
      RAISE EXCEPTION 'Incident cannot be closed. Prerequisites not met: %', v_check_result->>'blocking_reasons';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_enforce_incident_closure ON incidents;
CREATE TRIGGER trigger_enforce_incident_closure
BEFORE UPDATE ON incidents
FOR EACH ROW
EXECUTE FUNCTION enforce_incident_closure_gate();


-- 4. Auto-Closure Trigger
CREATE OR REPLACE FUNCTION check_auto_incident_closure()
RETURNS TRIGGER AS $$
DECLARE
  v_incident_id uuid;
  v_open_actions_count int;
  v_check_result jsonb;
BEGIN
  v_incident_id := NEW.incident_id;

  -- Only proceed if the action is now closed or verified
  IF NEW.status IN ('closed', 'verified') THEN

    -- Check if there are any other open actions for this incident
    SELECT COUNT(*) INTO v_open_actions_count
    FROM corrective_actions
    WHERE incident_id = v_incident_id
      AND status NOT IN ('closed', 'verified', 'cancelled')
      AND deleted_at IS NULL;

    IF v_open_actions_count = 0 THEN
      -- All actions are closed. Check prerequisites.
      v_check_result := check_incident_closure_prerequisites(v_incident_id);

      IF (v_check_result->>'ready_for_closure')::boolean = true THEN
        -- Auto-close the incident
        UPDATE incidents
        SET status = 'closed',
            updated_at = now()
        WHERE id = v_incident_id
          AND status != 'closed';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_auto_close_incident ON corrective_actions;
CREATE TRIGGER trigger_auto_close_incident
AFTER UPDATE ON corrective_actions
FOR EACH ROW
EXECUTE FUNCTION check_auto_incident_closure();
