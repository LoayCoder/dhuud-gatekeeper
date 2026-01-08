-- Create helper function to check if user is a client site representative
CREATE OR REPLACE FUNCTION public.is_client_site_rep(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = p_user_id
      AND role = 'client_site_representative'::app_role
  );
$$;

-- Create function to get companies assigned to a client site representative
CREATE OR REPLACE FUNCTION public.get_client_site_rep_company_ids(p_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id 
  FROM public.contractor_companies 
  WHERE client_site_rep_id = p_user_id
    AND deleted_at IS NULL;
$$;