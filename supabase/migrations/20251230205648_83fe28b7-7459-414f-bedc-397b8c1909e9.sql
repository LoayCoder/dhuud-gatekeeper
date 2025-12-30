-- Fix the reset_notification_matrix_to_defaults function to use valid stakeholder roles and condition types
DROP FUNCTION IF EXISTS reset_notification_matrix_to_defaults(uuid);

CREATE OR REPLACE FUNCTION reset_notification_matrix_to_defaults(p_tenant_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Soft delete existing rules for this tenant
  UPDATE incident_notification_matrix 
  SET deleted_at = now() 
  WHERE tenant_id = p_tenant_id AND deleted_at IS NULL;

  -- Insert default rules for INCIDENTS
  INSERT INTO incident_notification_matrix (tenant_id, stakeholder_role, severity_level, channels, event_type)
  VALUES
    -- HSSE Manager - all severity levels, all channels for high severity
    (p_tenant_id, 'hsse_manager', 1, ARRAY['push'], 'incident'),
    (p_tenant_id, 'hsse_manager', 2, ARRAY['push', 'email'], 'incident'),
    (p_tenant_id, 'hsse_manager', 3, ARRAY['push', 'email', 'whatsapp'], 'incident'),
    (p_tenant_id, 'hsse_manager', 4, ARRAY['push', 'email', 'whatsapp'], 'incident'),
    (p_tenant_id, 'hsse_manager', 5, ARRAY['push', 'email', 'whatsapp'], 'incident'),
    
    -- BC Team (Business Continuity) - all severity levels
    (p_tenant_id, 'bc_team', 1, ARRAY['push'], 'incident'),
    (p_tenant_id, 'bc_team', 2, ARRAY['push', 'email'], 'incident'),
    (p_tenant_id, 'bc_team', 3, ARRAY['push', 'email', 'whatsapp'], 'incident'),
    (p_tenant_id, 'bc_team', 4, ARRAY['push', 'email', 'whatsapp'], 'incident'),
    (p_tenant_id, 'bc_team', 5, ARRAY['push', 'email', 'whatsapp'], 'incident'),
    
    -- Area Owner - all severity levels
    (p_tenant_id, 'area_owner', 1, ARRAY['push'], 'incident'),
    (p_tenant_id, 'area_owner', 2, ARRAY['push', 'email'], 'incident'),
    (p_tenant_id, 'area_owner', 3, ARRAY['push', 'email', 'whatsapp'], 'incident'),
    (p_tenant_id, 'area_owner', 4, ARRAY['push', 'email', 'whatsapp'], 'incident'),
    (p_tenant_id, 'area_owner', 5, ARRAY['push', 'email', 'whatsapp'], 'incident'),
    
    -- Department Representative - all severity levels
    (p_tenant_id, 'dept_representative', 1, ARRAY['push'], 'incident'),
    (p_tenant_id, 'dept_representative', 2, ARRAY['push', 'email'], 'incident'),
    (p_tenant_id, 'dept_representative', 3, ARRAY['push', 'email', 'whatsapp'], 'incident'),
    (p_tenant_id, 'dept_representative', 4, ARRAY['push', 'email', 'whatsapp'], 'incident'),
    (p_tenant_id, 'dept_representative', 5, ARRAY['push', 'email', 'whatsapp'], 'incident'),
    
    -- HSSE Expert - level 3-5 only (investigations)
    (p_tenant_id, 'hsse_expert', 3, ARRAY['push', 'email', 'whatsapp'], 'incident'),
    (p_tenant_id, 'hsse_expert', 4, ARRAY['push', 'email', 'whatsapp'], 'incident'),
    (p_tenant_id, 'hsse_expert', 5, ARRAY['push', 'email', 'whatsapp'], 'incident'),
    
    -- Security - level 2-5
    (p_tenant_id, 'security', 2, ARRAY['push', 'email'], 'incident'),
    (p_tenant_id, 'security', 3, ARRAY['push', 'email', 'whatsapp'], 'incident'),
    (p_tenant_id, 'security', 4, ARRAY['push', 'email', 'whatsapp'], 'incident'),
    (p_tenant_id, 'security', 5, ARRAY['push', 'email', 'whatsapp'], 'incident'),
    
    -- First Aider - all levels with injury condition
    (p_tenant_id, 'first_aider', 1, ARRAY['push'], 'incident'),
    (p_tenant_id, 'first_aider', 2, ARRAY['push', 'email'], 'incident'),
    (p_tenant_id, 'first_aider', 3, ARRAY['push', 'email', 'whatsapp'], 'incident'),
    (p_tenant_id, 'first_aider', 4, ARRAY['push', 'email', 'whatsapp'], 'incident'),
    (p_tenant_id, 'first_aider', 5, ARRAY['push', 'email', 'whatsapp'], 'incident'),
    
    -- Clinic Team - all levels with injury condition
    (p_tenant_id, 'clinic_team', 1, ARRAY['push'], 'incident'),
    (p_tenant_id, 'clinic_team', 2, ARRAY['push', 'email'], 'incident'),
    (p_tenant_id, 'clinic_team', 3, ARRAY['push', 'email', 'whatsapp'], 'incident'),
    (p_tenant_id, 'clinic_team', 4, ARRAY['push', 'email', 'whatsapp'], 'incident'),
    (p_tenant_id, 'clinic_team', 5, ARRAY['push', 'email', 'whatsapp'], 'incident');

  -- Update injury condition for first aider and clinic team
  UPDATE incident_notification_matrix 
  SET condition_type = 'injury', condition_value = true
  WHERE tenant_id = p_tenant_id 
    AND stakeholder_role IN ('first_aider', 'clinic_team')
    AND event_type = 'incident'
    AND deleted_at IS NULL;

  -- Insert default rules for OBSERVATIONS
  INSERT INTO incident_notification_matrix (tenant_id, stakeholder_role, severity_level, channels, event_type)
  VALUES
    -- HSSE Manager - all severity levels
    (p_tenant_id, 'hsse_manager', 1, ARRAY['push'], 'observation'),
    (p_tenant_id, 'hsse_manager', 2, ARRAY['push', 'email'], 'observation'),
    (p_tenant_id, 'hsse_manager', 3, ARRAY['push', 'email', 'whatsapp'], 'observation'),
    (p_tenant_id, 'hsse_manager', 4, ARRAY['push', 'email', 'whatsapp'], 'observation'),
    (p_tenant_id, 'hsse_manager', 5, ARRAY['push', 'email', 'whatsapp'], 'observation'),
    
    -- Area Owner - all severity levels
    (p_tenant_id, 'area_owner', 1, ARRAY['push'], 'observation'),
    (p_tenant_id, 'area_owner', 2, ARRAY['push', 'email'], 'observation'),
    (p_tenant_id, 'area_owner', 3, ARRAY['push', 'email', 'whatsapp'], 'observation'),
    (p_tenant_id, 'area_owner', 4, ARRAY['push', 'email', 'whatsapp'], 'observation'),
    (p_tenant_id, 'area_owner', 5, ARRAY['push', 'email', 'whatsapp'], 'observation'),
    
    -- Department Representative - all severity levels
    (p_tenant_id, 'dept_representative', 1, ARRAY['push'], 'observation'),
    (p_tenant_id, 'dept_representative', 2, ARRAY['push', 'email'], 'observation'),
    (p_tenant_id, 'dept_representative', 3, ARRAY['push', 'email', 'whatsapp'], 'observation'),
    (p_tenant_id, 'dept_representative', 4, ARRAY['push', 'email', 'whatsapp'], 'observation'),
    (p_tenant_id, 'dept_representative', 5, ARRAY['push', 'email', 'whatsapp'], 'observation'),
    
    -- HSSE Expert - level 3-5 only
    (p_tenant_id, 'hsse_expert', 3, ARRAY['push', 'email', 'whatsapp'], 'observation'),
    (p_tenant_id, 'hsse_expert', 4, ARRAY['push', 'email', 'whatsapp'], 'observation'),
    (p_tenant_id, 'hsse_expert', 5, ARRAY['push', 'email', 'whatsapp'], 'observation'),
    
    -- Security - level 2-5
    (p_tenant_id, 'security', 2, ARRAY['push', 'email'], 'observation'),
    (p_tenant_id, 'security', 3, ARRAY['push', 'email', 'whatsapp'], 'observation'),
    (p_tenant_id, 'security', 4, ARRAY['push', 'email', 'whatsapp'], 'observation'),
    (p_tenant_id, 'security', 5, ARRAY['push', 'email', 'whatsapp'], 'observation');
END;
$$;