-- Create SECURITY DEFINER function for soft deleting evidence
-- This bypasses RLS while validating permissions internally
CREATE OR REPLACE FUNCTION public.soft_delete_evidence(p_evidence_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_evidence RECORD;
  v_user_id uuid := auth.uid();
  v_tenant_id uuid;
BEGIN
  -- Get the evidence and verify it exists and is not deleted
  SELECT * INTO v_evidence 
  FROM evidence_items 
  WHERE id = p_evidence_id AND deleted_at IS NULL;
  
  IF v_evidence IS NULL THEN
    RAISE EXCEPTION 'Evidence not found or already deleted';
  END IF;
  
  -- Get user's tenant_id
  SELECT tenant_id INTO v_tenant_id FROM profiles WHERE id = v_user_id;
  
  -- Verify tenant isolation
  IF v_evidence.tenant_id != v_tenant_id THEN
    RAISE EXCEPTION 'Access denied: cross-tenant operation';
  END IF;
  
  -- Verify HSSE access
  IF NOT has_hsse_incident_access(v_user_id) THEN
    RAISE EXCEPTION 'Access denied: requires HSSE access';
  END IF;
  
  -- Verify incident is editable
  IF NOT is_incident_editable(v_evidence.incident_id) THEN
    RAISE EXCEPTION 'Access denied: incident is closed';
  END IF;
  
  -- Perform soft delete
  UPDATE evidence_items 
  SET deleted_at = now()
  WHERE id = p_evidence_id;
  
  RETURN v_evidence.incident_id;
END;
$$;