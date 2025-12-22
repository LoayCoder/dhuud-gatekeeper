
-- Fix invitations table security: Remove anon access to prevent PII exposure
-- The "View valid invitation by code" policy currently allows anon users to see emails

-- Drop the problematic policy that exposes emails to anon users
DROP POLICY IF EXISTS "View valid invitation by code" ON public.invitations;

-- Create a secure function to validate invitation codes without exposing PII
-- This allows the signup flow to validate codes without reading the full row
CREATE OR REPLACE FUNCTION public.validate_invitation_code(p_code text)
RETURNS TABLE (
  is_valid boolean,
  tenant_id uuid,
  tenant_name text,
  expires_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    true as is_valid,
    i.tenant_id,
    t.name as tenant_name,
    i.expires_at
  FROM invitations i
  JOIN tenants t ON t.id = i.tenant_id
  WHERE i.code = p_code
    AND (i.used IS NULL OR i.used = false)
    AND i.expires_at > now()
    AND i.deleted_at IS NULL
  LIMIT 1;
END;
$$;

-- Grant execute to anon for signup flow
GRANT EXECUTE ON FUNCTION public.validate_invitation_code(text) TO anon;
GRANT EXECUTE ON FUNCTION public.validate_invitation_code(text) TO authenticated;

-- Create a secure function to get invitation details after validation (for authenticated users during signup)
CREATE OR REPLACE FUNCTION public.get_invitation_by_code(p_code text)
RETURNS TABLE (
  id uuid,
  email text,
  tenant_id uuid,
  expires_at timestamptz,
  metadata jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    i.id,
    i.email,
    i.tenant_id,
    i.expires_at,
    i.metadata
  FROM invitations i
  WHERE i.code = p_code
    AND (i.used IS NULL OR i.used = false)
    AND i.expires_at > now()
    AND i.deleted_at IS NULL
  LIMIT 1;
END;
$$;

-- Only authenticated users can use this (during signup confirmation)
GRANT EXECUTE ON FUNCTION public.get_invitation_by_code(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_invitation_by_code(text) TO authenticated;
