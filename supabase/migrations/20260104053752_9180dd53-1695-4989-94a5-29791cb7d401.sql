-- Fix get_violation_details_with_occurrence function to remove non-existent category field
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
      'severity_level', v_violation_type.severity_level
    )
  );
END;
$$;