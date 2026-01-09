-- Fix: Replace the reference ID generation with an atomic version using advisory lock
-- This prevents race conditions when multiple incidents are submitted simultaneously

CREATE OR REPLACE FUNCTION public.generate_incident_reference_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  year_suffix text;
  sequence_num integer;
  prefix text;
BEGIN
  year_suffix := TO_CHAR(NOW(), 'YYYY');
  
  -- Use different prefix based on event_type
  IF NEW.event_type = 'observation' THEN
    prefix := 'OBS';
  ELSE
    prefix := 'INC';
  END IF;
  
  -- Use advisory lock to prevent race conditions
  -- Lock key is hash of tenant_id + prefix + year to ensure unique locks per combination
  PERFORM pg_advisory_xact_lock(hashtext(NEW.tenant_id::text || prefix || year_suffix));
  
  -- Get next sequence number for this prefix and year within tenant
  SELECT COALESCE(MAX(
    CAST(NULLIF(SPLIT_PART(reference_id, '-', 3), '') AS INTEGER)
  ), 0) + 1
  INTO sequence_num
  FROM incidents
  WHERE tenant_id = NEW.tenant_id
    AND reference_id LIKE prefix || '-' || year_suffix || '-%';
  
  NEW.reference_id := prefix || '-' || year_suffix || '-' || LPAD(sequence_num::text, 4, '0');
  
  RETURN NEW;
END;
$$;

-- Add RLS policies for reporter visibility to HSSE roles

-- Allow HSSE Experts to view all profiles in their tenant (for incident review)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' 
    AND policyname = 'HSSE Experts can view all profiles in tenant'
  ) THEN
    CREATE POLICY "HSSE Experts can view all profiles in tenant"
    ON public.profiles FOR SELECT
    USING (
      tenant_id = get_profile_tenant_id_bypass(auth.uid())
      AND has_role_by_code(auth.uid(), 'hsse_expert')
    );
  END IF;
END $$;

-- Allow HSSE Investigators to view all profiles in their tenant (for investigation)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' 
    AND policyname = 'HSSE Investigators can view all profiles in tenant'
  ) THEN
    CREATE POLICY "HSSE Investigators can view all profiles in tenant"
    ON public.profiles FOR SELECT
    USING (
      tenant_id = get_profile_tenant_id_bypass(auth.uid())
      AND has_role_by_code(auth.uid(), 'hsse_investigator')
    );
  END IF;
END $$;

-- Allow Security Managers to view all profiles in their tenant
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' 
    AND policyname = 'Security Managers can view all profiles in tenant'
  ) THEN
    CREATE POLICY "Security Managers can view all profiles in tenant"
    ON public.profiles FOR SELECT
    USING (
      tenant_id = get_profile_tenant_id_bypass(auth.uid())
      AND has_role_by_code(auth.uid(), 'security_manager')
    );
  END IF;
END $$;

-- Allow Clinic staff to view profiles (for injury-related incidents)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' 
    AND policyname = 'Clinic staff can view all profiles in tenant'
  ) THEN
    CREATE POLICY "Clinic staff can view all profiles in tenant"
    ON public.profiles FOR SELECT
    USING (
      tenant_id = get_profile_tenant_id_bypass(auth.uid())
      AND has_role_by_code(auth.uid(), 'clinic')
    );
  END IF;
END $$;

-- Allow HSSE Managers to view all profiles in their tenant
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' 
    AND policyname = 'HSSE Managers can view all profiles in tenant'
  ) THEN
    CREATE POLICY "HSSE Managers can view all profiles in tenant"
    ON public.profiles FOR SELECT
    USING (
      tenant_id = get_profile_tenant_id_bypass(auth.uid())
      AND has_role_by_code(auth.uid(), 'hsse_manager')
    );
  END IF;
END $$;