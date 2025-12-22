-- Drop and recreate calculate_required_safety_officers with proper search_path
DROP FUNCTION IF EXISTS public.calculate_required_safety_officers(integer);

CREATE OR REPLACE FUNCTION public.calculate_required_safety_officers(p_worker_count integer)
RETURNS integer
LANGUAGE sql
IMMUTABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE 
    WHEN p_worker_count < 20 THEN 0
    ELSE CEIL(p_worker_count::NUMERIC / 20)::INTEGER
  END;
$$;

-- Fix calculate_next_schedule_time with proper search_path
CREATE OR REPLACE FUNCTION public.calculate_next_schedule_time(p_frequency text, p_current_next_at timestamptz)
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN CASE p_frequency
    WHEN 'daily' THEN p_current_next_at + interval '1 day'
    WHEN 'weekly' THEN p_current_next_at + interval '1 week'
    WHEN 'monthly' THEN p_current_next_at + interval '1 month'
    WHEN 'quarterly' THEN p_current_next_at + interval '3 months'
    WHEN 'yearly' THEN p_current_next_at + interval '1 year'
    ELSE p_current_next_at + interval '1 day'
  END;
END;
$$;

-- Fix calculate_scheduled_notification_next with proper search_path
CREATE OR REPLACE FUNCTION public.calculate_scheduled_notification_next(p_frequency text, p_current_next timestamptz)
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN CASE p_frequency
    WHEN 'daily' THEN p_current_next + interval '1 day'
    WHEN 'weekly' THEN p_current_next + interval '1 week'
    WHEN 'monthly' THEN p_current_next + interval '1 month'
    WHEN 'quarterly' THEN p_current_next + interval '3 months'
    WHEN 'yearly' THEN p_current_next + interval '1 year'
    ELSE p_current_next + interval '1 day'
  END;
END;
$$;

-- Fix the critical invitations table security issue
-- Drop the overly permissive public policy
DROP POLICY IF EXISTS "Anyone can view invitations by code" ON public.invitations;

-- Create a secure policy that only allows viewing unused, non-expired invitations
-- This is used during the invitation acceptance flow
CREATE POLICY "View valid invitation by code" 
ON public.invitations 
FOR SELECT 
TO anon, authenticated
USING (
  code IS NOT NULL 
  AND (used IS NULL OR used = false)
  AND expires_at > NOW()
  AND deleted_at IS NULL
);

-- Add policy for authenticated users to view invitations within their tenant
CREATE POLICY "Tenant members can view their invitations" 
ON public.invitations 
FOR SELECT 
TO authenticated
USING (
  tenant_id IN (
    SELECT p.tenant_id FROM profiles p WHERE p.id = auth.uid()
  )
  AND deleted_at IS NULL
);

-- Add policy for admins/managers to manage invitations
CREATE POLICY "Admins can manage invitations" 
ON public.invitations 
FOR ALL
TO authenticated
USING (
  tenant_id IN (
    SELECT p.tenant_id FROM profiles p WHERE p.id = auth.uid()
  )
  AND (
    public.is_admin(auth.uid()) 
    OR public.has_hsse_incident_access(auth.uid())
  )
)
WITH CHECK (
  tenant_id IN (
    SELECT p.tenant_id FROM profiles p WHERE p.id = auth.uid()
  )
  AND (
    public.is_admin(auth.uid()) 
    OR public.has_hsse_incident_access(auth.uid())
  )
);