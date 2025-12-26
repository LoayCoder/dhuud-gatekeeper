-- ============================================
-- PHASE A: Fix last function missing search_path
-- ============================================

CREATE OR REPLACE FUNCTION public.update_investigation_sla_configs_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ============================================
-- PHASE B: Remove Duplicate RLS Policies
-- ============================================

-- Remove duplicate/conflicting policies on profiles (keep only profiles_tenant_scoped_access for SELECT)
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can read own profile by id" ON profiles;
DROP POLICY IF EXISTS "Users view own profile" ON profiles;

-- Remove duplicate/conflicting policies on visitors (keep only visitors_security_role_access for SELECT)
DROP POLICY IF EXISTS "Security can view all visitors" ON visitors;
DROP POLICY IF EXISTS "Tenant users can view visitors" ON visitors;

-- ============================================
-- PHASE C: Tighten witness_statements RLS
-- ============================================

-- Drop existing overly permissive policy
DROP POLICY IF EXISTS "HSSE users can view statements" ON witness_statements;

-- Create tighter tenant-scoped policy
CREATE POLICY "witness_statements_tenant_scoped_view" ON witness_statements
FOR SELECT TO authenticated
USING (
  tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  AND (
    -- Admin access
    has_role(auth.uid(), 'admin'::app_role)
    -- HSSE roles
    OR has_hsse_incident_access(auth.uid())
    -- Assigned witness
    OR assigned_witness_id = auth.uid()
    -- Statement creator
    OR created_by = auth.uid()
    -- Incident reporter (for their own incident's statements)
    OR EXISTS (
      SELECT 1 FROM incidents i 
      WHERE i.id = witness_statements.incident_id 
        AND i.reporter_id = auth.uid()
    )
  )
);

-- Add documentation comments
COMMENT ON FUNCTION public.update_investigation_sla_configs_updated_at() IS 'Trigger function with fixed search_path';