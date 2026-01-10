-- Create SECURITY DEFINER function for soft-deleting inspection templates
-- This bypasses RLS and performs manual security checks

CREATE OR REPLACE FUNCTION public.soft_delete_inspection_template(p_template_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_template RECORD;
  v_user_id uuid := auth.uid();
  v_user_tenant_id uuid;
BEGIN
  -- Verify authenticated
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Access denied: not authenticated';
  END IF;

  -- Get user's tenant_id
  SELECT tenant_id INTO v_user_tenant_id 
  FROM profiles WHERE user_id = v_user_id;
  
  IF v_user_tenant_id IS NULL THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;
  
  -- Get the template
  SELECT id, tenant_id, deleted_at INTO v_template 
  FROM inspection_templates 
  WHERE id = p_template_id;
  
  IF v_template.id IS NULL THEN
    RAISE EXCEPTION 'Template not found';
  END IF;
  
  -- Verify tenant isolation
  IF v_template.tenant_id != v_user_tenant_id THEN
    RAISE EXCEPTION 'Access denied: cross-tenant operation';
  END IF;
  
  -- Verify not already deleted
  IF v_template.deleted_at IS NOT NULL THEN
    RAISE EXCEPTION 'Template already deleted';
  END IF;
  
  -- Verify permission (admin OR asset management access)
  IF NOT can_manage_inspection_templates(v_user_id, v_user_tenant_id) THEN
    RAISE EXCEPTION 'Access denied: requires admin or asset management access';
  END IF;
  
  -- Soft-delete template items first
  UPDATE inspection_template_items 
  SET deleted_at = now()
  WHERE template_id = p_template_id AND deleted_at IS NULL;
  
  -- Soft-delete the template
  UPDATE inspection_templates 
  SET deleted_at = now()
  WHERE id = p_template_id;
  
  RETURN p_template_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.soft_delete_inspection_template(uuid) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION public.soft_delete_inspection_template(uuid) IS 'Securely soft-deletes an inspection template and its items with proper tenant isolation and permission checks';