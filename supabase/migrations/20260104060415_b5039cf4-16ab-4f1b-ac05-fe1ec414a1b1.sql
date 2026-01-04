-- Add columns for observation-to-incident upgrade tracking
ALTER TABLE public.incidents ADD COLUMN IF NOT EXISTS source_observation_id UUID REFERENCES public.incidents(id);
ALTER TABLE public.incidents ADD COLUMN IF NOT EXISTS upgraded_to_incident_id UUID REFERENCES public.incidents(id);
ALTER TABLE public.incidents ADD COLUMN IF NOT EXISTS upgraded_at TIMESTAMPTZ;
ALTER TABLE public.incidents ADD COLUMN IF NOT EXISTS upgraded_by UUID REFERENCES auth.users(id);

-- Add columns for HSSE escalation decision tracking  
ALTER TABLE public.incidents ADD COLUMN IF NOT EXISTS escalation_decision TEXT;
ALTER TABLE public.incidents ADD COLUMN IF NOT EXISTS escalation_decision_by UUID REFERENCES auth.users(id);
ALTER TABLE public.incidents ADD COLUMN IF NOT EXISTS escalation_decision_at TIMESTAMPTZ;
ALTER TABLE public.incidents ADD COLUMN IF NOT EXISTS escalation_decision_notes TEXT;

-- Add comments for documentation
COMMENT ON COLUMN public.incidents.source_observation_id IS 'For upgraded incidents: references the original observation that was upgraded';
COMMENT ON COLUMN public.incidents.upgraded_to_incident_id IS 'For observations: references the incident created when this observation was upgraded';
COMMENT ON COLUMN public.incidents.escalation_decision IS 'HSSE Expert decision on escalation: reject, accept_observation, or upgrade_incident';

-- Create RPC function to upgrade observation to incident
CREATE OR REPLACE FUNCTION public.upgrade_observation_to_incident(
  p_observation_id UUID,
  p_user_id UUID,
  p_investigator_id UUID,
  p_notes TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_observation RECORD;
  v_new_incident_id UUID;
  v_new_reference_id TEXT;
  v_current_year TEXT;
  v_sequence_number INTEGER;
  v_tenant_id UUID;
BEGIN
  -- Get the observation details
  SELECT * INTO v_observation
  FROM public.incidents
  WHERE id = p_observation_id
    AND event_type = 'observation'
    AND deleted_at IS NULL;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Observation not found or already deleted';
  END IF;
  
  v_tenant_id := v_observation.tenant_id;
  v_current_year := EXTRACT(YEAR FROM CURRENT_TIMESTAMP)::TEXT;
  
  -- Generate new INC reference number
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(reference_id FROM 'INC-' || v_current_year || '-(\d+)') AS INTEGER)
  ), 0) + 1
  INTO v_sequence_number
  FROM public.incidents
  WHERE reference_id LIKE 'INC-' || v_current_year || '-%'
    AND tenant_id = v_tenant_id;
  
  v_new_reference_id := 'INC-' || v_current_year || '-' || LPAD(v_sequence_number::TEXT, 4, '0');
  
  -- Create new incident record with data from observation
  INSERT INTO public.incidents (
    tenant_id,
    reference_id,
    event_type,
    title,
    description,
    reporter_id,
    reporter_name,
    reporter_email,
    reporter_phone,
    department_id,
    site_id,
    branch_id,
    location_description,
    location_lat,
    location_lng,
    occurred_at,
    severity_level,
    severity_level_potential,
    status,
    source_observation_id,
    related_contractor_company_id,
    created_at
  )
  VALUES (
    v_observation.tenant_id,
    v_new_reference_id,
    'incident',
    v_observation.title,
    v_observation.description,
    v_observation.reporter_id,
    v_observation.reporter_name,
    v_observation.reporter_email,
    v_observation.reporter_phone,
    v_observation.department_id,
    v_observation.site_id,
    v_observation.branch_id,
    v_observation.location_description,
    v_observation.location_lat,
    v_observation.location_lng,
    v_observation.occurred_at,
    v_observation.severity_level,
    v_observation.severity_level_potential,
    'investigation_pending',
    p_observation_id,
    v_observation.related_contractor_company_id,
    NOW()
  )
  RETURNING id INTO v_new_incident_id;
  
  -- Create investigation record with assigned investigator
  INSERT INTO public.investigations (
    incident_id,
    tenant_id,
    investigator_id,
    assigned_at,
    assigned_by
  )
  VALUES (
    v_new_incident_id,
    v_tenant_id,
    p_investigator_id,
    NOW(),
    p_user_id
  );
  
  -- Update original observation with upgrade info (NOT closed!)
  UPDATE public.incidents
  SET 
    status = 'upgraded_to_incident',
    upgraded_to_incident_id = v_new_incident_id,
    upgraded_at = NOW(),
    upgraded_by = p_user_id,
    escalation_decision = 'upgrade_incident',
    escalation_decision_by = p_user_id,
    escalation_decision_at = NOW(),
    escalation_decision_notes = p_notes
  WHERE id = p_observation_id;
  
  -- Copy evidence from observation to new incident
  INSERT INTO public.incident_evidence (
    incident_id,
    tenant_id,
    file_name,
    file_path,
    file_type,
    file_size,
    description,
    uploaded_by,
    created_at
  )
  SELECT 
    v_new_incident_id,
    tenant_id,
    file_name,
    file_path,
    file_type,
    file_size,
    description,
    uploaded_by,
    NOW()
  FROM public.incident_evidence
  WHERE incident_id = p_observation_id
    AND deleted_at IS NULL;
  
  -- Update corrective actions to link to new incident
  UPDATE public.corrective_actions
  SET incident_id = v_new_incident_id
  WHERE incident_id = p_observation_id
    AND deleted_at IS NULL;
  
  -- Log audit entry for original observation
  INSERT INTO public.incident_audit_logs (
    incident_id,
    tenant_id,
    actor_id,
    action,
    details
  )
  VALUES (
    p_observation_id,
    v_tenant_id,
    p_user_id,
    'upgraded_to_incident',
    jsonb_build_object(
      'new_incident_id', v_new_incident_id,
      'new_reference_id', v_new_reference_id,
      'notes', p_notes,
      'investigator_id', p_investigator_id
    )
  );
  
  -- Log audit entry for new incident
  INSERT INTO public.incident_audit_logs (
    incident_id,
    tenant_id,
    actor_id,
    action,
    details
  )
  VALUES (
    v_new_incident_id,
    v_tenant_id,
    p_user_id,
    'created_from_observation',
    jsonb_build_object(
      'source_observation_id', p_observation_id,
      'source_reference_id', v_observation.reference_id,
      'investigator_id', p_investigator_id
    )
  );
  
  RETURN v_new_incident_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.upgrade_observation_to_incident TO authenticated;

-- Add index for upgrade tracking queries
CREATE INDEX IF NOT EXISTS idx_incidents_source_observation_id ON public.incidents(source_observation_id) WHERE source_observation_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_incidents_upgraded_to_incident_id ON public.incidents(upgraded_to_incident_id) WHERE upgraded_to_incident_id IS NOT NULL;