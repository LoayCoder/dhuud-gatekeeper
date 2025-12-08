-- Create secure RPC function for admin soft-delete
CREATE OR REPLACE FUNCTION public.soft_delete_incident(p_incident_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_incident RECORD;
  v_user_id uuid := auth.uid();
  v_user_tenant_id uuid;
BEGIN
  -- Get user's tenant_id
  SELECT tenant_id INTO v_user_tenant_id 
  FROM profiles WHERE id = v_user_id;
  
  -- Verify user is admin
  IF NOT is_admin(v_user_id) THEN
    RAISE EXCEPTION 'Access denied: requires admin role';
  END IF;
  
  -- Get the incident
  SELECT id, tenant_id, status, deleted_at INTO v_incident 
  FROM incidents 
  WHERE id = p_incident_id;
  
  IF v_incident IS NULL THEN
    RAISE EXCEPTION 'Incident not found';
  END IF;
  
  -- Verify tenant isolation
  IF v_incident.tenant_id != v_user_tenant_id THEN
    RAISE EXCEPTION 'Access denied: cross-tenant operation';
  END IF;
  
  -- Verify not already deleted
  IF v_incident.deleted_at IS NOT NULL THEN
    RAISE EXCEPTION 'Incident already deleted';
  END IF;
  
  -- Verify incident is not closed
  IF v_incident.status = 'closed' THEN
    RAISE EXCEPTION 'Cannot delete closed incidents';
  END IF;
  
  -- Perform soft delete
  UPDATE incidents 
  SET deleted_at = now()
  WHERE id = p_incident_id;
  
  RETURN p_incident_id;
END;
$$;