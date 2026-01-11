-- ============================================
-- ROLE ACCESS CHECK FUNCTIONS FOR APPROVAL WORKFLOWS
-- ============================================

-- Function to check if user has HSSE Manager access (for Company Approval)
CREATE OR REPLACE FUNCTION public.has_hsse_manager_access(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_role_assignments ura
    JOIN public.roles r ON r.id = ura.role_id
    WHERE ura.user_id = p_user_id
    AND r.code IN ('hsse_manager', 'admin', 'super_admin')
  )
$$;

-- Function to check if user has Security approval access (for Worker Stage 2)
CREATE OR REPLACE FUNCTION public.has_security_approval_access(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_role_assignments ura
    JOIN public.roles r ON r.id = ura.role_id
    WHERE ura.user_id = p_user_id
    AND r.code IN ('security_supervisor', 'security_manager', 'admin', 'super_admin')
  )
$$;

-- Function to check if user has Contractor Admin/Consultant access (for Worker Stage 1)
CREATE OR REPLACE FUNCTION public.has_contractor_approval_access(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_role_assignments ura
    JOIN public.roles r ON r.id = ura.role_id
    WHERE ura.user_id = p_user_id
    AND r.code IN ('contractor_consultant', 'contractor_admin', 'admin', 'super_admin')
  )
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.has_hsse_manager_access(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_security_approval_access(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_contractor_approval_access(uuid) TO authenticated;