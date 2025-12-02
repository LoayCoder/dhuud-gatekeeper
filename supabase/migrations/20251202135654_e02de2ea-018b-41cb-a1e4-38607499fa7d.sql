-- 1. Create a secure function to validate invitations
CREATE OR REPLACE FUNCTION public.lookup_invitation(lookup_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with admin privileges to bypass RLS
SET search_path = public
AS $$
DECLARE
  invite_data RECORD;
BEGIN
  -- Find the invitation
  SELECT * INTO invite_data
  FROM public.invitations
  WHERE code = lookup_code
  AND used = false
  AND expires_at > NOW()
  LIMIT 1;

  -- Return null if not found (security: don't reveal why it failed)
  IF invite_data IS NULL THEN
    RETURN NULL;
  END IF;

  -- Return only necessary public info
  RETURN jsonb_build_object(
    'email', invite_data.email,
    'tenant_id', invite_data.tenant_id,
    'role', 'user' -- Default role, or fetch if you have a column
  );
END;
$$;

-- 2. Grant access to anonymous users
GRANT EXECUTE ON FUNCTION public.lookup_invitation TO anon;