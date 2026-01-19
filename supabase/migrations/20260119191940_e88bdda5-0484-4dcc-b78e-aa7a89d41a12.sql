-- ============================================
-- FIX: Secure visitor_self_registrations INSERT policy
-- ============================================

-- Step 1: Create a security definer function to validate self-registration
CREATE OR REPLACE FUNCTION public.validate_visitor_self_registration(
  _tenant_id uuid,
  _full_name text,
  _phone text,
  _company_name text,
  _national_id text,
  _expected_visit_date date
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    -- Tenant must exist and be active
    EXISTS (
      SELECT 1 FROM tenants 
      WHERE id = _tenant_id 
        AND status = 'active'
    )
    -- Required fields validation
    AND _full_name IS NOT NULL AND _full_name <> ''
    AND _phone IS NOT NULL AND _phone <> ''
    AND _company_name IS NOT NULL AND _company_name <> ''
    AND _national_id IS NOT NULL AND _national_id <> ''
    AND _expected_visit_date IS NOT NULL
    -- Visit date should be today or future
    AND _expected_visit_date >= CURRENT_DATE
$$;

-- Step 2: Drop the insecure policy
DROP POLICY IF EXISTS "Allow public self-registration insert" ON public.visitor_self_registrations;

-- Step 3: Create the new secure policy using the validation function
CREATE POLICY "Secure public self-registration insert" 
ON public.visitor_self_registrations 
FOR INSERT TO anon 
WITH CHECK (
  public.validate_visitor_self_registration(
    tenant_id,
    full_name,
    phone,
    company_name,
    national_id,
    expected_visit_date
  )
);