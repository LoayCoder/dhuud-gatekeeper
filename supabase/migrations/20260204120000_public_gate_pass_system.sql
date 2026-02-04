-- =====================================================
-- PUBLIC GATE PASS SYSTEM MIGRATION
-- Enables multi-tenant public gate pass submissions
-- =====================================================

-- 1. Add allow_public_gate_pass_requests to tenants table
ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS allow_public_gate_pass_requests BOOLEAN DEFAULT false;

-- 2. Add public gate pass columns to material_gate_passes
ALTER TABLE public.material_gate_passes
ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id),
ADD COLUMN IF NOT EXISTS public_access_token UUID DEFAULT gen_random_uuid(),
ADD COLUMN IF NOT EXISTS is_public_request BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS public_requester_name TEXT,
ADD COLUMN IF NOT EXISTS public_requester_phone TEXT,
ADD COLUMN IF NOT EXISTS public_requester_email TEXT,
ADD COLUMN IF NOT EXISTS public_requester_company TEXT,
ADD COLUMN IF NOT EXISTS public_attachment_urls TEXT[];

-- 3. Create index for public access token lookups
CREATE INDEX IF NOT EXISTS idx_material_gate_passes_public_token
ON public.material_gate_passes(public_access_token)
WHERE is_public_request = true AND deleted_at IS NULL;

-- 4. Create index for branch-based queries
CREATE INDEX IF NOT EXISTS idx_material_gate_passes_branch
ON public.material_gate_passes(branch_id)
WHERE deleted_at IS NULL;

-- 5. Add new status for public flow: pending_management
DO $$
BEGIN
  -- Update the status check constraint to include new statuses
  ALTER TABLE public.material_gate_passes
  DROP CONSTRAINT IF EXISTS material_gate_passes_status_check;

  ALTER TABLE public.material_gate_passes
  ADD CONSTRAINT material_gate_passes_status_check
  CHECK (status IN (
    'pending_pm', 'pending_safety', 'approved', 'rejected',
    'used', 'expired', 'cancelled',
    'pending_contractor_approval', 'pending_dept_ack',
    'pending_dept_approval', 'pending_security_approval',
    'pending_management'  -- New status for public requests
  ));
END $$;

-- 6. Create public_gate_pass_rate_limits table for anti-spam
CREATE TABLE IF NOT EXISTS public.public_gate_pass_rate_limits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  ip_address TEXT NOT NULL,
  phone_number TEXT,
  request_count INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, ip_address, phone_number)
);

-- Enable RLS on rate limits table
ALTER TABLE public.public_gate_pass_rate_limits ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policy: Allow anonymous insert for public submissions (restricted by tenant toggle)
DROP POLICY IF EXISTS "allow_public_submission" ON public.material_gate_passes;
CREATE POLICY "allow_public_submission" ON public.material_gate_passes
FOR INSERT TO anon
WITH CHECK (
  is_public_request = true
  AND EXISTS (
    SELECT 1 FROM public.tenants
    WHERE id = material_gate_passes.tenant_id
    AND allow_public_gate_pass_requests = true
  )
);

-- 8. RLS Policy: Allow anonymous view via public access token
DROP POLICY IF EXISTS "allow_public_view_via_token" ON public.material_gate_passes;
CREATE POLICY "allow_public_view_via_token" ON public.material_gate_passes
FOR SELECT TO anon
USING (
  is_public_request = true
  AND public_access_token IS NOT NULL
  AND (
    -- Allow if token matches query parameter (set via Edge Function headers)
    public_access_token::text = COALESCE(
      current_setting('request.headers', true)::jsonb->>'x-public-token',
      ''
    )
  )
);

-- 9. Function to check rate limit for public submissions
CREATE OR REPLACE FUNCTION public.check_public_gate_pass_rate_limit(
  p_tenant_id UUID,
  p_ip_address TEXT,
  p_phone_number TEXT DEFAULT NULL,
  p_max_requests INTEGER DEFAULT 5,
  p_window_minutes INTEGER DEFAULT 60
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_record RECORD;
  v_window_start TIMESTAMPTZ;
BEGIN
  v_window_start := now() - (p_window_minutes || ' minutes')::INTERVAL;

  -- Check if there's an existing rate limit record within the window
  SELECT * INTO v_record
  FROM public.public_gate_pass_rate_limits
  WHERE tenant_id = p_tenant_id
    AND ip_address = p_ip_address
    AND (phone_number = p_phone_number OR (phone_number IS NULL AND p_phone_number IS NULL))
    AND window_start > v_window_start;

  IF v_record IS NULL THEN
    -- No recent record, create new one
    INSERT INTO public.public_gate_pass_rate_limits (tenant_id, ip_address, phone_number, request_count, window_start)
    VALUES (p_tenant_id, p_ip_address, p_phone_number, 1, now())
    ON CONFLICT (tenant_id, ip_address, phone_number)
    DO UPDATE SET
      request_count = 1,
      window_start = now();
    RETURN TRUE;
  ELSIF v_record.request_count >= p_max_requests THEN
    -- Rate limit exceeded
    RETURN FALSE;
  ELSE
    -- Increment counter
    UPDATE public.public_gate_pass_rate_limits
    SET request_count = request_count + 1
    WHERE id = v_record.id;
    RETURN TRUE;
  END IF;
END;
$$;

-- 10. Function to get staff to notify for a branch
CREATE OR REPLACE FUNCTION public.get_branch_gate_pass_approvers(
  p_tenant_id UUID,
  p_branch_id UUID
)
RETURNS TABLE (
  user_id UUID,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  role_code TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT
    p.id as user_id,
    p.full_name,
    p.email,
    p.phone,
    r.code as role_code
  FROM public.profiles p
  JOIN public.user_role_assignments ura ON ura.user_id = p.id
  JOIN public.roles r ON r.id = ura.role_id
  LEFT JOIN public.user_branch_assignments uba ON uba.user_id = p.id
  WHERE p.tenant_id = p_tenant_id
    AND r.code IN ('golf_club_mgmt', 'security_supervisor', 'hsse_manager', 'admin', 'department_representative')
    AND (
      -- User is assigned to the specific branch
      uba.branch_id = p_branch_id
      -- Or user has full branch access (super admin/multi-branch user)
      OR EXISTS (
        SELECT 1 FROM public.profiles p2
        WHERE p2.id = p.id
        AND (p2.has_full_branch_access = true OR r.code = 'admin')
      )
    )
    AND p.deleted_at IS NULL;
$$;

-- 11. Function to generate public tracking URL
CREATE OR REPLACE FUNCTION public.get_public_gate_pass_tracking_url(
  p_tenant_slug TEXT,
  p_public_access_token UUID
)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT format('/p/%s/gate-pass/status/%s', p_tenant_slug, p_public_access_token::text);
$$;

-- 12. Add comment for documentation
COMMENT ON COLUMN public.material_gate_passes.public_access_token IS
'UUID token for unauthenticated public access to gate pass status. Used in tracking URLs.';

COMMENT ON COLUMN public.material_gate_passes.is_public_request IS
'Indicates if this gate pass was submitted via the public form (not by authenticated users).';

COMMENT ON COLUMN public.material_gate_passes.branch_id IS
'Branch/location where the gate pass is for. Required for public requests to route to correct approvers.';

COMMENT ON COLUMN public.tenants.allow_public_gate_pass_requests IS
'Enables the public gate pass submission form for this tenant.';

-- 13. Clean up old rate limit records (runs periodically via cron or edge function)
CREATE OR REPLACE FUNCTION public.cleanup_expired_rate_limits()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  DELETE FROM public.public_gate_pass_rate_limits
  WHERE window_start < now() - INTERVAL '24 hours';

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;
