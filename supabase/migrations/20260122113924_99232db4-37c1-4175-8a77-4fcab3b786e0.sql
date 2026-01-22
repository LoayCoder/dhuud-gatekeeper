-- Create function to get all department representatives for a department
CREATE OR REPLACE FUNCTION public.get_all_department_representatives(p_department_id UUID)
RETURNS TABLE(user_id UUID, full_name TEXT, email TEXT, preferred_language TEXT, phone_number TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    ura.user_id,
    p.full_name,
    p.email,
    p.preferred_language,
    p.phone_number
  FROM user_role_assignments ura
  JOIN roles r ON r.id = ura.role_id
  JOIN profiles p ON p.id = ura.user_id
  WHERE r.code = 'department_representative'
    AND p.assigned_department_id = p_department_id
    AND r.is_active = true
    AND p.deleted_at IS NULL;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_all_department_representatives(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_all_department_representatives(UUID) TO service_role;