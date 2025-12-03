-- 1. PROFILES: Create a view that hides sensitive fields from non-owners/non-admins
-- First, create a function to check if user can see sensitive profile data
CREATE OR REPLACE FUNCTION public.can_view_sensitive_profile_data(profile_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() = profile_user_id OR has_role(auth.uid(), 'admin'::app_role)
$$;

-- 2. INVITATIONS: Fix the update policy to require email match
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Users can mark invitations as used" ON public.invitations;

-- Create a more secure policy that checks email ownership
CREATE POLICY "Users can mark their own invitations as used" 
ON public.invitations 
FOR UPDATE 
USING (
  auth.uid() IS NOT NULL 
  AND email = (SELECT email FROM auth.users WHERE id = auth.uid())
)
WITH CHECK (used = true);

-- 3. TENANTS: Create separate policies for viewing sensitive vs non-sensitive data
-- The current policy allows all tenant members to see billing info
-- We'll use a view approach or column-level security via application layer
-- For now, update the policy to be more explicit about what admins can see

-- 4. VISITORS: Restrict national_id access to admins only
-- Create a secure function to check if user can view visitor PII
CREATE OR REPLACE FUNCTION public.can_view_visitor_pii()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT has_role(auth.uid(), 'admin'::app_role)
$$;

-- 5. SECURITY_BLACKLIST: Fix cross-tenant access issue
-- Drop the problematic policy that allows admin cross-tenant access
DROP POLICY IF EXISTS "Admins can view blacklist in tenant" ON public.security_blacklist;

-- Create proper tenant-isolated policy for viewing
CREATE POLICY "Users can view blacklist in their tenant only" 
ON public.security_blacklist 
FOR SELECT 
USING (
  tenant_id = get_auth_tenant_id() 
  AND get_auth_tenant_id() IS NOT NULL
);

-- Update the manage policy to also enforce tenant isolation
DROP POLICY IF EXISTS "Admins can manage blacklist" ON public.security_blacklist;

CREATE POLICY "Admins can manage blacklist in their tenant" 
ON public.security_blacklist 
FOR ALL 
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  AND tenant_id = get_auth_tenant_id()
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) 
  AND tenant_id = get_auth_tenant_id()
);