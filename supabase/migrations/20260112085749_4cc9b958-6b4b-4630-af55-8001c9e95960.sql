-- Create function to hard delete contractor company (only for pending_approval status)
CREATE OR REPLACE FUNCTION public.hard_delete_contractor_company(p_company_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id uuid;
  v_status text;
BEGIN
  -- Get company details and verify status
  SELECT tenant_id, status INTO v_tenant_id, v_status
  FROM contractor_companies
  WHERE id = p_company_id AND deleted_at IS NULL;

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Company not found';
  END IF;

  -- Only allow hard delete for pending_approval status
  IF v_status != 'pending_approval' THEN
    RAISE EXCEPTION 'Only companies pending approval can be permanently deleted';
  END IF;

  -- Delete related records first
  DELETE FROM contractor_documents WHERE company_id = p_company_id;
  DELETE FROM contractor_workers WHERE company_id = p_company_id;
  
  -- Delete the company permanently
  DELETE FROM contractor_companies WHERE id = p_company_id;

  RETURN p_company_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.hard_delete_contractor_company(uuid) TO authenticated;