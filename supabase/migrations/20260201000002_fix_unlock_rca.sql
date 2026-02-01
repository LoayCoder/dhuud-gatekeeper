/*
  # Fix Unlock RCA RPC

  1.  Replace `unlock_rca` to accept `p_incident_id` instead of `rca_id` to match frontend usage and simplify logic.
*/

-- Drop the old function if it exists (by signature)
DROP FUNCTION IF EXISTS unlock_rca(uuid);

CREATE OR REPLACE FUNCTION unlock_rca(p_incident_id uuid)
RETURNS boolean AS $$
BEGIN
  -- Strict Role Check: HSSE Manager only
  IF NOT has_role(auth.uid(), 'hsse_manager') THEN
    RAISE EXCEPTION 'Only HSSE Managers can unlock RCA';
  END IF;

  UPDATE incident_rca
  SET is_locked = false,
      locked_by = NULL,
      locked_at = NULL
  WHERE incident_id = p_incident_id
    AND tenant_id = get_auth_tenant_id();

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
