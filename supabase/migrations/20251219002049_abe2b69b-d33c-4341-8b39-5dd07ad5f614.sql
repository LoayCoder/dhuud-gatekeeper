-- Step 1: Create security definer function to safely check company membership
CREATE OR REPLACE FUNCTION public.is_contractor_rep_for_company(p_company_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.contractor_representatives
    WHERE company_id = p_company_id
      AND user_id = auth.uid()
      AND deleted_at IS NULL
  )
$$;

-- Step 2: Drop the problematic self-referencing policy
DROP POLICY IF EXISTS "Contractor reps can view own company reps" 
ON public.contractor_representatives;

-- Step 3: Create fixed policy using the security definer function
CREATE POLICY "Contractor reps can view own company reps"
ON public.contractor_representatives FOR SELECT
USING (
  tenant_id = get_auth_tenant_id() 
  AND deleted_at IS NULL 
  AND (
    user_id = auth.uid()
    OR is_contractor_rep_for_company(company_id)
  )
);