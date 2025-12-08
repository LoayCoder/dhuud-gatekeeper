-- Add deletion_password_hash column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS deletion_password_hash text;

-- Create RPC function for HSSE Manager to delete closed incidents with password verification
CREATE OR REPLACE FUNCTION public.soft_delete_closed_incident(
  p_incident_id uuid,
  p_password_hash text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_incident RECORD;
  v_user_id uuid := auth.uid();
  v_user_tenant_id uuid;
  v_stored_password_hash text;
BEGIN
  -- Get user's tenant_id and deletion password
  SELECT tenant_id, deletion_password_hash INTO v_user_tenant_id, v_stored_password_hash
  FROM profiles WHERE id = v_user_id;
  
  -- Verify user has HSSE Manager role
  IF NOT has_role_by_code(v_user_id, 'hsse_manager') AND NOT is_admin(v_user_id) THEN
    RAISE EXCEPTION 'Access denied: requires HSSE Manager role';
  END IF;
  
  -- Verify deletion password is set
  IF v_stored_password_hash IS NULL THEN
    RAISE EXCEPTION 'Deletion password not configured';
  END IF;
  
  -- Verify password matches
  IF v_stored_password_hash != p_password_hash THEN
    RAISE EXCEPTION 'Invalid deletion password';
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
  
  -- Verify incident IS closed (this function is specifically for closed incidents)
  IF v_incident.status != 'closed' THEN
    RAISE EXCEPTION 'This function is for closed incidents only';
  END IF;
  
  -- Perform soft delete
  UPDATE incidents 
  SET deleted_at = now()
  WHERE id = p_incident_id;
  
  RETURN p_incident_id;
END;
$$;