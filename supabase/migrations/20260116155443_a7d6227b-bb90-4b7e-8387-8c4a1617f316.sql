-- =====================================================
-- PHASE 1: CRITICAL SECURITY FIXES
-- PII Access Logs Protection + Contractor Secure Views
-- =====================================================

-- 1. Make PII Access Logs Append-Only (prevent tampering)
-- No DELETE allowed on pii_access_logs
CREATE POLICY "pii_access_logs_no_delete"
  ON public.pii_access_logs
  FOR DELETE
  USING (false);

-- No UPDATE allowed on pii_access_logs (immutable audit trail)
CREATE POLICY "pii_access_logs_no_update"
  ON public.pii_access_logs
  FOR UPDATE
  USING (false);

-- 2. Create secure view for contractor workers that hides sensitive columns
CREATE OR REPLACE VIEW public.contractor_workers_safe
WITH (security_invoker = true) AS
  SELECT 
    id, 
    tenant_id,
    company_id,
    full_name, 
    full_name_ar, 
    nationality, 
    photo_path, 
    approval_status,
    approved_by,
    approved_at,
    rejection_reason,
    created_by,
    created_at, 
    updated_at,
    deleted_at,
    worker_type,
    safety_officer_id,
    edited_by,
    edited_at,
    edit_pending_approval,
    security_approval_status,
    security_approved_by,
    security_approved_at,
    security_rejection_reason,
    branch_id,
    preferred_language
    -- EXCLUDED: national_id, mobile_number (PII)
  FROM public.contractor_workers
  WHERE deleted_at IS NULL;

-- 3. Function to get masked national ID with PII access logging
CREATE OR REPLACE FUNCTION public.get_masked_national_id(p_worker_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_national_id text;
  v_can_view boolean := false;
  v_user_id uuid;
  v_tenant_id uuid;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN '••••••••';
  END IF;

  -- Check if user has elevated access
  SELECT (
    is_admin(v_user_id) OR 
    has_role_by_code(v_user_id, 'contractor_admin') OR
    has_role_by_code(v_user_id, 'document_controller') OR
    has_role_by_code(v_user_id, 'security_manager')
  ) INTO v_can_view;
  
  -- Get the national ID and tenant
  SELECT national_id, tenant_id INTO v_national_id, v_tenant_id
  FROM contractor_workers
  WHERE id = p_worker_id
    AND deleted_at IS NULL;
  
  IF v_national_id IS NULL THEN
    RETURN NULL;
  END IF;
  
  IF v_can_view THEN
    -- Log PII access for audit trail
    INSERT INTO pii_access_logs (
      user_id, 
      table_name, 
      record_id, 
      access_granted, 
      tenant_id,
      accessed_at
    )
    VALUES (
      v_user_id,
      'contractor_workers.national_id',
      p_worker_id,
      true,
      v_tenant_id,
      now()
    );
    
    RETURN v_national_id;
  ELSE
    -- Return masked version: show first 2 and last 2 chars
    RETURN CASE 
      WHEN length(v_national_id) <= 4 THEN '••••••••'
      ELSE left(v_national_id, 2) || '••••••' || right(v_national_id, 2)
    END;
  END IF;
END;
$$;

-- 4. Function to get masked mobile number with PII access logging
CREATE OR REPLACE FUNCTION public.get_masked_mobile(p_worker_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_mobile text;
  v_can_view boolean := false;
  v_user_id uuid;
  v_tenant_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN '••••••••••';
  END IF;

  SELECT (
    is_admin(v_user_id) OR 
    has_role_by_code(v_user_id, 'contractor_admin') OR
    has_role_by_code(v_user_id, 'document_controller') OR
    has_role_by_code(v_user_id, 'security_manager')
  ) INTO v_can_view;
  
  SELECT mobile_number, tenant_id INTO v_mobile, v_tenant_id
  FROM contractor_workers
  WHERE id = p_worker_id
    AND deleted_at IS NULL;
  
  IF v_mobile IS NULL THEN
    RETURN NULL;
  END IF;
  
  IF v_can_view THEN
    INSERT INTO pii_access_logs (
      user_id, 
      table_name, 
      record_id, 
      access_granted, 
      tenant_id,
      accessed_at
    )
    VALUES (
      v_user_id,
      'contractor_workers.mobile_number',
      p_worker_id,
      true,
      v_tenant_id,
      now()
    );
    
    RETURN v_mobile;
  ELSE
    RETURN CASE 
      WHEN length(v_mobile) <= 4 THEN '••••••••••'
      ELSE left(v_mobile, 3) || '•••••' || right(v_mobile, 2)
    END;
  END IF;
END;
$$;

-- 5. Add can_export column to role_menu_permissions if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'role_menu_permissions' 
    AND column_name = 'can_export'
  ) THEN
    ALTER TABLE public.role_menu_permissions
    ADD COLUMN can_export boolean DEFAULT false;
  END IF;
END $$;

-- Update admin roles to have export permission
UPDATE public.role_menu_permissions rmp
SET can_export = true
FROM public.roles r
WHERE rmp.role_id = r.id
  AND r.code IN ('admin', 'super_admin', 'tenant_admin', 'hsse_manager', 'hsse_expert', 'security_manager');

-- 6. Create unified profile access check function
CREATE OR REPLACE FUNCTION public.can_view_profile(
  p_viewer_id uuid,
  p_target_profile_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_viewer_tenant_id uuid;
  v_target_tenant_id uuid;
  v_viewer_dept_id uuid;
  v_target_dept_id uuid;
BEGIN
  -- Self-access always allowed
  IF p_viewer_id = p_target_profile_id THEN 
    RETURN true; 
  END IF;
  
  -- Get viewer info
  SELECT tenant_id, assigned_department_id 
  INTO v_viewer_tenant_id, v_viewer_dept_id
  FROM profiles 
  WHERE id = p_viewer_id OR user_id = p_viewer_id 
  LIMIT 1;
  
  -- Get target info
  SELECT tenant_id, assigned_department_id 
  INTO v_target_tenant_id, v_target_dept_id
  FROM profiles 
  WHERE id = p_target_profile_id OR user_id = p_target_profile_id 
  LIMIT 1;
  
  -- Cross-tenant blocked
  IF v_viewer_tenant_id IS NULL OR v_target_tenant_id IS NULL THEN
    RETURN false;
  END IF;
  
  IF v_viewer_tenant_id != v_target_tenant_id THEN 
    RETURN false; 
  END IF;
  
  -- Admin, HSSE, Security Manager - full tenant access
  IF is_admin(p_viewer_id) OR 
     has_role_by_code(p_viewer_id, 'hsse_manager') OR 
     has_role_by_code(p_viewer_id, 'hsse_expert') OR
     has_role_by_code(p_viewer_id, 'security_manager') THEN
    RETURN true;
  END IF;
  
  -- Managers and Dept Reps - same department access
  IF v_viewer_dept_id IS NOT NULL AND v_viewer_dept_id = v_target_dept_id THEN
    IF has_role_by_code(p_viewer_id, 'manager') OR 
       has_role_by_code(p_viewer_id, 'department_representative') THEN
      RETURN true;
    END IF;
  END IF;
  
  RETURN false;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_masked_national_id(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_masked_mobile(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_view_profile(uuid, uuid) TO authenticated;

-- Grant select on safe view
GRANT SELECT ON public.contractor_workers_safe TO authenticated;