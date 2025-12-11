-- Create a SECURITY DEFINER function to soft delete corrective actions
-- This bypasses RLS and performs permission checks internally
CREATE OR REPLACE FUNCTION public.soft_delete_corrective_action(p_action_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_action RECORD;
  v_user_id uuid := auth.uid();
  v_user_tenant_id uuid;
  v_is_investigator boolean;
BEGIN
  -- Get user's tenant_id
  SELECT tenant_id INTO v_user_tenant_id 
  FROM profiles WHERE id = v_user_id;
  
  IF v_user_tenant_id IS NULL THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;
  
  -- Get the action
  SELECT ca.id, ca.tenant_id, ca.incident_id, ca.assigned_to, ca.deleted_at 
  INTO v_action 
  FROM corrective_actions ca
  WHERE ca.id = p_action_id;
  
  IF v_action IS NULL THEN
    RAISE EXCEPTION 'Corrective action not found';
  END IF;
  
  -- Verify tenant isolation
  IF v_action.tenant_id != v_user_tenant_id THEN
    RAISE EXCEPTION 'Access denied: cross-tenant operation';
  END IF;
  
  -- Verify not already deleted
  IF v_action.deleted_at IS NOT NULL THEN
    RAISE EXCEPTION 'Action already deleted';
  END IF;
  
  -- Check if user is the investigator for this incident
  SELECT EXISTS (
    SELECT 1 FROM investigations i
    WHERE i.incident_id = v_action.incident_id
    AND i.investigator_id = v_user_id
    AND i.deleted_at IS NULL
  ) INTO v_is_investigator;
  
  -- Permission check: HSSE access OR assigned owner OR investigator
  IF NOT (
    has_hsse_incident_access(v_user_id)
    OR v_action.assigned_to = v_user_id
    OR v_is_investigator
  ) THEN
    RAISE EXCEPTION 'Access denied: insufficient permissions to delete this action';
  END IF;
  
  -- Perform soft delete
  UPDATE corrective_actions 
  SET deleted_at = now()
  WHERE id = p_action_id;
  
  -- Log audit entry
  INSERT INTO incident_audit_logs (
    incident_id, tenant_id, actor_id, action, old_value
  ) VALUES (
    v_action.incident_id,
    v_user_tenant_id,
    v_user_id,
    'action_deleted',
    jsonb_build_object('action_id', p_action_id)
  );
  
  RETURN v_action.incident_id;
END;
$$;