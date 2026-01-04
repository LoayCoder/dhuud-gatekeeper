-- Phase 2: Backend Logic - Critical Functions for Observation Reporting Module
-- Using correct column name: related_contractor_company_id

-- 2.1: Function to check repeated contractor violations
CREATE OR REPLACE FUNCTION public.check_repeated_contractor_violations(
  p_contractor_company_id UUID,
  p_tenant_id UUID,
  p_days_lookback INTEGER DEFAULT 7,
  p_threshold INTEGER DEFAULT 3
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rejection_count INTEGER;
  v_recent_violations JSONB;
BEGIN
  -- Count rejected violations for this contractor in the lookback period
  SELECT COUNT(*)
  INTO v_rejection_count
  FROM incidents i
  WHERE i.related_contractor_company_id = p_contractor_company_id
    AND i.tenant_id = p_tenant_id
    AND i.event_type = 'observation'
    AND i.violation_final_status = 'rejected'
    AND i.deleted_at IS NULL
    AND i.updated_at >= (now() - (p_days_lookback || ' days')::INTERVAL);

  -- Get recent violation details
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'incident_id', i.id,
    'reference_id', i.reference_id,
    'violation_type', vt.name,
    'rejected_at', i.updated_at
  )), '[]'::JSONB)
  INTO v_recent_violations
  FROM incidents i
  LEFT JOIN violation_types vt ON i.violation_type_id = vt.id
  WHERE i.related_contractor_company_id = p_contractor_company_id
    AND i.tenant_id = p_tenant_id
    AND i.event_type = 'observation'
    AND i.violation_final_status = 'rejected'
    AND i.deleted_at IS NULL
    AND i.updated_at >= (now() - (p_days_lookback || ' days')::INTERVAL)
  ORDER BY i.updated_at DESC
  LIMIT 10;

  RETURN jsonb_build_object(
    'requires_escalation', v_rejection_count >= p_threshold,
    'rejection_count', v_rejection_count,
    'threshold', p_threshold,
    'days_lookback', p_days_lookback,
    'recent_violations', v_recent_violations
  );
END;
$$;

-- 2.2: Function to trigger escalation and create alert
CREATE OR REPLACE FUNCTION public.trigger_contractor_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_escalation_check JSONB;
  v_contractor_name TEXT;
BEGIN
  -- Only process observation violations that are being rejected by dept manager
  IF NEW.event_type = 'observation' 
     AND NEW.violation_final_status = 'rejected'
     AND NEW.related_contractor_company_id IS NOT NULL
     AND (OLD.violation_final_status IS DISTINCT FROM 'rejected') THEN
    
    -- Check for repeated violations
    v_escalation_check := check_repeated_contractor_violations(
      NEW.related_contractor_company_id,
      NEW.tenant_id,
      7,  -- days lookback
      3   -- threshold
    );
    
    -- If escalation is required
    IF (v_escalation_check->>'requires_escalation')::BOOLEAN THEN
      -- Get contractor name
      SELECT company_name INTO v_contractor_name
      FROM contractor_companies
      WHERE id = NEW.related_contractor_company_id;
      
      -- Update incident with escalation info
      NEW.requires_escalation := TRUE;
      NEW.escalation_level := (v_escalation_check->>'rejection_count')::INTEGER;
      NEW.escalation_reason := format(
        'Contractor %s has %s rejected violations in the last %s days (threshold: %s)',
        COALESCE(v_contractor_name, 'Unknown'),
        v_escalation_check->>'rejection_count',
        v_escalation_check->>'days_lookback',
        v_escalation_check->>'threshold'
      );
      NEW.escalation_triggered_at := now();
      
      -- Create system alert for HSSE Manager
      INSERT INTO system_alerts (
        tenant_id,
        alert_type,
        severity,
        title,
        description,
        related_contractor_id,
        related_incident_id,
        target_role,
        metadata
      ) VALUES (
        NEW.tenant_id,
        'repeated_contractor_violations',
        CASE 
          WHEN (v_escalation_check->>'rejection_count')::INTEGER >= 5 THEN 'critical'
          WHEN (v_escalation_check->>'rejection_count')::INTEGER >= 4 THEN 'high'
          ELSE 'medium'
        END,
        format('Repeated Violations: %s', COALESCE(v_contractor_name, 'Contractor')),
        format('%s violations rejected in the last 7 days for contractor %s. Immediate review required.',
          v_escalation_check->>'rejection_count',
          COALESCE(v_contractor_name, 'Unknown')
        ),
        NEW.related_contractor_company_id,
        NEW.id,
        'hsse_manager',
        v_escalation_check
      );
      
      -- Log to audit
      INSERT INTO incident_audit_logs (
        incident_id,
        tenant_id,
        action,
        old_values,
        new_values,
        performed_by
      ) VALUES (
        NEW.id,
        NEW.tenant_id,
        'escalation_triggered',
        jsonb_build_object('requires_escalation', OLD.requires_escalation),
        jsonb_build_object(
          'requires_escalation', TRUE,
          'escalation_level', NEW.escalation_level,
          'escalation_reason', NEW.escalation_reason
        ),
        auth.uid()
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for escalation check
DROP TRIGGER IF EXISTS trigger_check_repeated_violations ON public.incidents;
CREATE TRIGGER trigger_check_repeated_violations
  BEFORE UPDATE ON public.incidents
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_contractor_escalation();

-- 2.3: Function for HSSE to validate observation before closure
CREATE OR REPLACE FUNCTION public.hsse_validate_observation_closure(
  p_incident_id UUID,
  p_user_id UUID,
  p_decision TEXT, -- 'approve', 'reject', 'request_changes'
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_incident RECORD;
  v_user_role TEXT;
  v_pending_actions INTEGER;
BEGIN
  -- Get incident details
  SELECT * INTO v_incident
  FROM incidents
  WHERE id = p_incident_id
    AND deleted_at IS NULL;
    
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Incident not found');
  END IF;
  
  -- Check user role
  SELECT role INTO v_user_role
  FROM user_roles
  WHERE user_id = p_user_id
    AND tenant_id = v_incident.tenant_id
    AND deleted_at IS NULL
    AND role IN ('hsse_expert', 'hsse_manager', 'admin')
  LIMIT 1;
  
  IF v_user_role IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User does not have HSSE authority');
  END IF;
  
  -- Check if observation is in the correct status
  IF v_incident.status::TEXT != 'pending_hsse_validation' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Observation is not pending HSSE validation');
  END IF;
  
  -- For approval, check if all corrective actions are complete
  IF p_decision = 'approve' THEN
    SELECT COUNT(*) INTO v_pending_actions
    FROM corrective_actions
    WHERE incident_id = p_incident_id
      AND deleted_at IS NULL
      AND status NOT IN ('completed', 'verified', 'cancelled');
      
    IF v_pending_actions > 0 THEN
      RETURN jsonb_build_object(
        'success', false, 
        'error', format('%s corrective actions are still pending', v_pending_actions)
      );
    END IF;
  END IF;
  
  -- Process the decision
  IF p_decision = 'approve' THEN
    -- Approve and close the observation
    UPDATE incidents
    SET 
      hsse_validated_at = now(),
      hsse_validated_by = p_user_id,
      hsse_validation_notes = p_notes,
      status = 'closed',
      closed_at = now(),
      closure_approved_by = p_user_id,
      closure_notes = p_notes
    WHERE id = p_incident_id;
    
  ELSIF p_decision = 'reject' THEN
    -- Reject and return to investigation
    UPDATE incidents
    SET 
      hsse_validated_at = now(),
      hsse_validated_by = p_user_id,
      hsse_validation_notes = p_notes,
      status = 'under_investigation',
      hsse_manager_rejection_reason = p_notes
    WHERE id = p_incident_id;
    
  ELSIF p_decision = 'request_changes' THEN
    -- Request changes, keep in validation status but add notes
    UPDATE incidents
    SET 
      hsse_validation_notes = p_notes,
      status = 'under_investigation'
    WHERE id = p_incident_id;
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Invalid decision');
  END IF;
  
  -- Log to audit
  INSERT INTO incident_audit_logs (
    incident_id,
    tenant_id,
    action,
    old_values,
    new_values,
    performed_by
  ) VALUES (
    p_incident_id,
    v_incident.tenant_id,
    'hsse_validation_' || p_decision,
    jsonb_build_object('status', v_incident.status),
    jsonb_build_object(
      'decision', p_decision,
      'notes', p_notes,
      'validated_by', p_user_id
    ),
    p_user_id
  );
  
  -- Update violation summary if exists
  UPDATE contractor_violation_summary
  SET 
    hsse_validated_at = now(),
    hsse_validated_by = p_user_id,
    hsse_validation_notes = p_notes,
    final_status = CASE WHEN p_decision = 'approve' THEN 'closed' ELSE 'pending' END,
    updated_at = now()
  WHERE incident_id = p_incident_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'decision', p_decision,
    'new_status', CASE 
      WHEN p_decision = 'approve' THEN 'closed'
      ELSE 'under_investigation'
    END
  );
END;
$$;

-- 2.4: Trigger to auto-populate contractor_violation_summary
CREATE OR REPLACE FUNCTION public.populate_violation_summary()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only for observations with violation type
  IF NEW.event_type = 'observation' AND NEW.violation_type_id IS NOT NULL THEN
    
    -- Insert or update summary record
    INSERT INTO contractor_violation_summary (
      tenant_id,
      incident_id,
      contractor_company_id,
      violation_type_id,
      submitted_at,
      submitted_by,
      final_status,
      was_escalated
    ) VALUES (
      NEW.tenant_id,
      NEW.id,
      NEW.related_contractor_company_id,
      NEW.violation_type_id,
      NEW.created_at,
      NEW.reporter_id,
      'pending',
      COALESCE(NEW.requires_escalation, FALSE)
    )
    ON CONFLICT (incident_id) DO UPDATE SET
      contractor_company_id = EXCLUDED.contractor_company_id,
      violation_type_id = EXCLUDED.violation_type_id,
      was_escalated = COALESCE(NEW.requires_escalation, FALSE),
      updated_at = now();
  END IF;
  
  RETURN NEW;
END;
$$;

-- Add unique constraint for ON CONFLICT
ALTER TABLE public.contractor_violation_summary
  DROP CONSTRAINT IF EXISTS contractor_violation_summary_incident_id_key;
ALTER TABLE public.contractor_violation_summary
  ADD CONSTRAINT contractor_violation_summary_incident_id_key UNIQUE (incident_id);

-- Create trigger for violation summary population
DROP TRIGGER IF EXISTS trigger_populate_violation_summary ON public.incidents;
CREATE TRIGGER trigger_populate_violation_summary
  AFTER INSERT OR UPDATE OF violation_type_id, related_contractor_company_id, requires_escalation
  ON public.incidents
  FOR EACH ROW
  EXECUTE FUNCTION public.populate_violation_summary();