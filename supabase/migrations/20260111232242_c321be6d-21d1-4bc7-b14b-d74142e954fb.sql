-- Create SECURITY DEFINER function to safely remove team members
-- This bypasses RLS but validates tenant ownership explicitly

CREATE OR REPLACE FUNCTION remove_team_member(p_member_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id uuid;
  v_member_tenant_id uuid;
BEGIN
  -- Get the calling user's tenant_id
  v_tenant_id := get_profile_tenant_id_bypass(auth.uid());
  
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'User tenant not found';
  END IF;
  
  -- Verify the member belongs to the same tenant
  SELECT tenant_id INTO v_member_tenant_id
  FROM security_team_members
  WHERE id = p_member_id AND deleted_at IS NULL;
  
  IF v_member_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Team member not found';
  END IF;
  
  IF v_member_tenant_id != v_tenant_id THEN
    RAISE EXCEPTION 'Access denied: member belongs to different tenant';
  END IF;
  
  -- Perform the soft delete
  UPDATE security_team_members
  SET deleted_at = now()
  WHERE id = p_member_id
    AND tenant_id = v_tenant_id;
END;
$$;