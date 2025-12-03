-- Fix remaining security warnings

-- 1. RESTRICT PLANS VISIBILITY TO AUTHENTICATED USERS
DROP POLICY IF EXISTS "Plans are viewable by everyone" ON public.plans;

CREATE POLICY "Plans are viewable by authenticated users"
ON public.plans
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- 2. RESTRICT MODULES VISIBILITY TO AUTHENTICATED USERS
DROP POLICY IF EXISTS "Modules are viewable by everyone" ON public.modules;

CREATE POLICY "Modules are viewable by authenticated users"
ON public.modules
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- 3. RESTRICT PLAN_MODULES VISIBILITY TO AUTHENTICATED USERS
DROP POLICY IF EXISTS "Plan modules are viewable by everyone" ON public.plan_modules;

CREATE POLICY "Plan modules are viewable by authenticated users"
ON public.plan_modules
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- 4. TIGHTEN INVITATION ACCESS
-- Remove general authenticated view - only admins should see all invitations
DROP POLICY IF EXISTS "Authenticated users can view invitations" ON public.invitations;

-- Admins can view all invitations in their tenant
CREATE POLICY "Admins can view invitations"
ON public.invitations
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  AND tenant_id = get_auth_tenant_id()
);

-- Keep update policy but restrict to marking as used only (for signup flow)
DROP POLICY IF EXISTS "Authenticated users can update invitations" ON public.invitations;

-- Allow updating invitation to mark as used (needed for signup flow)
-- This uses a service role via lookup_invitation function, so we restrict direct updates
CREATE POLICY "Users can mark invitations as used"
ON public.invitations
FOR UPDATE
USING (auth.uid() IS NOT NULL)
WITH CHECK (used = true);