-- Unified routing: ALL severity levels go to pending_expert_screening after Dept Rep approval
-- Previously Level 1-2 went to expert_screening, Level 3-5 went to pending_department_manager_approval

DROP FUNCTION IF EXISTS public.process_dept_rep_incident_decision(uuid, uuid, text, text);

CREATE OR REPLACE FUNCTION public.process_dept_rep_incident_decision(
  _incident_id uuid,
  _user_id uuid,
  _decision text,
  _justification text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _can_review BOOLEAN;
  _new_status incident_status;
  _severity TEXT;
  _severity_level INTEGER;
  _tenant_id uuid;
BEGIN
  -- Validate decision
  IF _decision NOT IN ('approved', 'rejected') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid decision');
  END IF;
  
  -- Validate justification length
  IF _justification IS NULL OR char_length(_justification) < 10 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Justification required (min 10 chars)');
  END IF;
  
  -- Check if user can review
  SELECT can_review_dept_rep_incident(_user_id, _incident_id) INTO _can_review;
  
  IF NOT _can_review THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authorized');
  END IF;
  
  -- Get severity and tenant_id
  SELECT severity_v2, tenant_id INTO _severity, _tenant_id FROM incidents WHERE id = _incident_id;
  _severity_level := COALESCE(
    NULLIF(regexp_replace(_severity, '[^0-9]', '', 'g'), '')::INTEGER,
    1
  );
  
  -- UNIFIED ROUTING: All approved incidents go to HSSE Expert screening
  IF _decision = 'approved' THEN
    _new_status := 'pending_expert_screening';
  ELSE
    _new_status := 'hsse_manager_escalation';
  END IF;
  
  -- Update incident
  UPDATE incidents SET 
    status = _new_status,
    dept_rep_decision = _decision,
    dept_rep_justification = _justification,
    dept_rep_reviewed_at = now(),
    dept_rep_reviewer_id = _user_id,
    updated_at = now()
  WHERE id = _incident_id;
  
  -- Audit log
  INSERT INTO incident_audit_logs (
    incident_id,
    action,
    actor_id,
    new_value,
    tenant_id
  )
  VALUES (
    _incident_id,
    CASE WHEN _decision = 'approved' THEN 'dept_rep_incident_approved' ELSE 'dept_rep_incident_rejected' END,
    _user_id,
    jsonb_build_object(
      'decision', _decision,
      'justification', _justification,
      'severity_level', _severity_level,
      'new_status', _new_status::text
    ),
    _tenant_id
  );
  
  RETURN jsonb_build_object('success', true, 'new_status', _new_status::text, 'severity_level', _severity_level);
END;
$function$;