-- ========================================
-- HSSE Event Model Production Finalization
-- ========================================

-- 1. FIX: Critical RLS Security Policy for Incidents
-- Drop existing permissive update policy and create restrictive one
DROP POLICY IF EXISTS "Reporter can update own incidents" ON public.incidents;
DROP POLICY IF EXISTS "Reporter can update own incidents in editable state" ON public.incidents;

-- Create helper function to check if incident is in editable state for reporter
CREATE OR REPLACE FUNCTION public.incident_is_reporter_editable(_incident_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM incidents
    WHERE id = _incident_id
      AND reporter_id = auth.uid()
      AND status IN ('submitted', 'returned_to_reporter')
      AND deleted_at IS NULL
  )
$$;

-- Reporter can only update their own incidents when in submitted or returned states
-- CRITICAL: This prevents reporters from editing investigation notes after the incident moves forward
CREATE POLICY "Reporter can update own incidents in editable state"
ON public.incidents
FOR UPDATE
USING (
  tenant_id = public.get_auth_tenant_id()
  AND reporter_id = auth.uid()
  AND status IN ('submitted', 'returned_to_reporter')
  AND deleted_at IS NULL
)
WITH CHECK (
  tenant_id = public.get_auth_tenant_id()
  AND reporter_id = auth.uid()
  AND status IN ('submitted', 'returned_to_reporter')
  AND deleted_at IS NULL
);

-- 2. ADD: Closure signature storage columns
DO $$
BEGIN
  -- Add signature storage path column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'incidents' 
    AND column_name = 'closure_signature_path'
  ) THEN
    ALTER TABLE public.incidents 
    ADD COLUMN closure_signature_path text;
    
    COMMENT ON COLUMN public.incidents.closure_signature_path IS 'Storage path for closure approval signature image';
  END IF;
  
  -- Add who signed and when
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'incidents' 
    AND column_name = 'closure_signed_by'
  ) THEN
    ALTER TABLE public.incidents 
    ADD COLUMN closure_signed_by uuid REFERENCES public.profiles(id);
    
    COMMENT ON COLUMN public.incidents.closure_signed_by IS 'User who provided closure signature';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'incidents' 
    AND column_name = 'closure_signed_at'
  ) THEN
    ALTER TABLE public.incidents 
    ADD COLUMN closure_signed_at timestamptz;
    
    COMMENT ON COLUMN public.incidents.closure_signed_at IS 'Timestamp when closure signature was provided';
  END IF;
END $$;