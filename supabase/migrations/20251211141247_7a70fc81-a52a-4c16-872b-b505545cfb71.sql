-- Create RPC function to reopen closed incidents (HSSE Manager only)
CREATE OR REPLACE FUNCTION reopen_closed_incident(
  p_incident_id UUID,
  p_reason TEXT
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
  v_is_hsse_manager BOOLEAN;
  v_is_admin BOOLEAN;
BEGIN
  -- Get tenant_id for the incident
  SELECT tenant_id INTO v_tenant_id
  FROM incidents
  WHERE id = p_incident_id AND deleted_at IS NULL;
  
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Incident not found';
  END IF;

  -- Check if user is HSSE Manager or Admin
  SELECT EXISTS (
    SELECT 1 FROM user_role_assignments ura
    JOIN roles r ON r.id = ura.role_id
    WHERE ura.user_id = auth.uid()
      AND ura.tenant_id = v_tenant_id
      AND ura.deleted_at IS NULL
      AND r.code = 'hsse_manager'
  ) INTO v_is_hsse_manager;
  
  SELECT is_admin(auth.uid()) INTO v_is_admin;
  
  IF NOT v_is_hsse_manager AND NOT v_is_admin THEN
    RAISE EXCEPTION 'Only HSSE Managers can reopen closed incidents';
  END IF;
  
  -- Verify incident is closed
  IF NOT EXISTS (
    SELECT 1 FROM incidents 
    WHERE id = p_incident_id 
      AND status = 'closed' 
      AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Incident is not closed or does not exist';
  END IF;
  
  -- Reopen incident by setting status back to investigation_in_progress
  UPDATE incidents SET
    status = 'investigation_in_progress',
    closure_approved_by = NULL,
    closure_approved_at = NULL,
    updated_at = NOW()
  WHERE id = p_incident_id;
  
  -- Log audit entry
  INSERT INTO incident_audit_logs (
    incident_id, tenant_id, actor_id, action, new_value
  ) VALUES (
    p_incident_id,
    v_tenant_id,
    auth.uid(),
    'incident_reopened',
    jsonb_build_object('reason', p_reason, 'reopened_at', NOW())
  );
END;
$$;