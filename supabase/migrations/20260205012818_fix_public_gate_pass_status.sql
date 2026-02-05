-- ==============================================================================
-- FIX: Public Gate Pass Status Function
-- ==============================================================================
-- This migration:
-- 1. Adds missing columns for public gate pass requests to material_gate_passes
-- 2. Adds missing columns to tenants for public gate pass settings
-- 3. Adds missing columns to branches for complete location data
-- 4. Creates the get_public_gate_pass_status function with correct structure
-- ==============================================================================

-- 1. ADD MISSING COLUMNS TO material_gate_passes FOR PUBLIC REQUESTS
-- ==============================================================================
ALTER TABLE public.material_gate_passes
ADD COLUMN IF NOT EXISTS is_public_request BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS public_access_token UUID UNIQUE,
ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS public_requester_name TEXT,
ADD COLUMN IF NOT EXISTS public_requester_phone TEXT,
ADD COLUMN IF NOT EXISTS public_requester_email TEXT,
ADD COLUMN IF NOT EXISTS public_requester_company TEXT;

-- Create index for public access token lookup
CREATE INDEX IF NOT EXISTS idx_material_gate_passes_public_token
ON public.material_gate_passes(public_access_token)
WHERE public_access_token IS NOT NULL;

-- Create index for public requests
CREATE INDEX IF NOT EXISTS idx_material_gate_passes_public_requests
ON public.material_gate_passes(tenant_id, is_public_request)
WHERE is_public_request = true AND deleted_at IS NULL;

-- 2. ADD MISSING COLUMNS TO tenants FOR PUBLIC GATE PASS SETTINGS
-- ==============================================================================
ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS allow_public_gate_pass_requests BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS public_gate_pass_instructions TEXT,
ADD COLUMN IF NOT EXISTS public_gate_pass_instructions_ar TEXT;

-- 3. ADD MISSING COLUMNS TO branches FOR COMPLETE LOCATION DATA
-- ==============================================================================
ALTER TABLE public.branches
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT;

-- 4. CREATE THE get_public_gate_pass_status FUNCTION
-- ==============================================================================
-- This function:
-- - Takes tenant slug and access token as parameters
-- - Returns the gate pass status with correct structure for frontend
-- - Includes complete gate_pass, branch, and tenant data
-- - Is SECURITY DEFINER so it can be called without authentication
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.get_public_gate_pass_status(
  p_tenant_slug TEXT,
  p_access_token UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
  v_tenant_record RECORD;
  v_gate_pass RECORD;
  v_branch RECORD;
BEGIN
  -- 1. Validate tenant and fetch tenant info
  SELECT
    id,
    name,
    logo_light_url,
    brand_color,
    public_gate_pass_instructions,
    public_gate_pass_instructions_ar
  INTO v_tenant_record
  FROM tenants
  WHERE slug = p_tenant_slug
    AND allow_public_gate_pass_requests = true;

  IF v_tenant_record IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Organization not found or public gate pass requests not enabled'
    );
  END IF;

  v_tenant_id := v_tenant_record.id;

  -- 2. Find gate pass by token with ALL required fields
  SELECT
    mgp.id,
    mgp.reference_number,
    mgp.status,
    mgp.pass_type,
    mgp.material_description,
    mgp.quantity,
    mgp.vehicle_plate,
    mgp.driver_name,
    mgp.driver_mobile,
    mgp.pass_date,
    mgp.time_window_start,
    mgp.time_window_end,
    mgp.public_requester_name,
    mgp.public_requester_phone,
    mgp.public_requester_email,
    mgp.public_requester_company,
    mgp.safety_approved_at AS approved_at,
    mgp.rejection_reason,
    mgp.entry_time,
    mgp.exit_time,
    mgp.created_at,
    mgp.token_expires_at,
    mgp.branch_id,
    mgp.qr_code_token
  INTO v_gate_pass
  FROM material_gate_passes mgp
  WHERE mgp.public_access_token = p_access_token
    AND mgp.tenant_id = v_tenant_id
    AND mgp.is_public_request = true
    AND mgp.deleted_at IS NULL;

  IF v_gate_pass IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Gate pass not found or access token invalid'
    );
  END IF;

  -- 3. Check token expiry
  IF v_gate_pass.token_expires_at IS NOT NULL
     AND v_gate_pass.token_expires_at < now() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Access token has expired'
    );
  END IF;

  -- 4. Get branch info if available
  IF v_gate_pass.branch_id IS NOT NULL THEN
    SELECT name, location, address, latitude, longitude, phone
    INTO v_branch
    FROM branches
    WHERE id = v_gate_pass.branch_id
      AND deleted_at IS NULL;
  END IF;

  -- 5. Return CORRECT structure matching frontend PublicGatePassStatusResponse
  RETURN jsonb_build_object(
    'success', true,
    'gate_pass', jsonb_build_object(
      'id', v_gate_pass.id,
      'reference_number', v_gate_pass.reference_number,
      'status', v_gate_pass.status,
      'pass_type', v_gate_pass.pass_type,
      'pass_date', v_gate_pass.pass_date,
      'time_window_start', v_gate_pass.time_window_start,
      'time_window_end', v_gate_pass.time_window_end,
      'material_description', v_gate_pass.material_description,
      'quantity', v_gate_pass.quantity,
      'vehicle_plate', v_gate_pass.vehicle_plate,
      'driver_name', v_gate_pass.driver_name,
      'driver_mobile', v_gate_pass.driver_mobile,
      'requester_name', v_gate_pass.public_requester_name,
      'requester_phone', v_gate_pass.public_requester_phone,
      'requester_email', v_gate_pass.public_requester_email,
      'requester_company', v_gate_pass.public_requester_company,
      'approved_at', v_gate_pass.approved_at,
      'rejection_reason', v_gate_pass.rejection_reason,
      'entry_time', v_gate_pass.entry_time,
      'exit_time', v_gate_pass.exit_time,
      'created_at', v_gate_pass.created_at,
      'qr_code_token', v_gate_pass.qr_code_token
    ),
    'branch', CASE WHEN v_branch IS NOT NULL THEN
      jsonb_build_object(
        'name', v_branch.name,
        'location', v_branch.location,
        'address', v_branch.address,
        'latitude', v_branch.latitude,
        'longitude', v_branch.longitude,
        'phone', v_branch.phone
      )
    ELSE NULL END,
    'tenant', jsonb_build_object(
      'name', v_tenant_record.name,
      'logo_url', v_tenant_record.logo_light_url,
      'brand_color', v_tenant_record.brand_color,
      'instructions', v_tenant_record.public_gate_pass_instructions,
      'instructions_ar', v_tenant_record.public_gate_pass_instructions_ar
    )
  );
END;
$$;

-- Grant execute permission to anon role (for public access without auth)
GRANT EXECUTE ON FUNCTION public.get_public_gate_pass_status(TEXT, UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.get_public_gate_pass_status(TEXT, UUID) TO authenticated;

-- 5. ADD COMMENTS FOR DOCUMENTATION
-- ==============================================================================
COMMENT ON COLUMN public.material_gate_passes.is_public_request IS 'True if this gate pass was created via public request form';
COMMENT ON COLUMN public.material_gate_passes.public_access_token IS 'UUID token for public status page access';
COMMENT ON COLUMN public.material_gate_passes.token_expires_at IS 'Expiry time for the public access token';
COMMENT ON COLUMN public.material_gate_passes.public_requester_name IS 'Name of requester for public requests';
COMMENT ON COLUMN public.material_gate_passes.public_requester_phone IS 'Phone number of requester for public requests';
COMMENT ON COLUMN public.material_gate_passes.public_requester_email IS 'Email of requester for public requests';
COMMENT ON COLUMN public.material_gate_passes.public_requester_company IS 'Company of requester for public requests';

COMMENT ON COLUMN public.tenants.allow_public_gate_pass_requests IS 'Enable/disable public gate pass request form';
COMMENT ON COLUMN public.tenants.public_gate_pass_instructions IS 'Instructions shown on public gate pass status page (English)';
COMMENT ON COLUMN public.tenants.public_gate_pass_instructions_ar IS 'Instructions shown on public gate pass status page (Arabic)';

COMMENT ON COLUMN public.branches.address IS 'Full address of the branch';
COMMENT ON COLUMN public.branches.phone IS 'Contact phone number for the branch';

COMMENT ON FUNCTION public.get_public_gate_pass_status(TEXT, UUID) IS
'Retrieves public gate pass status by tenant slug and access token.
Returns gate_pass, branch, and tenant info for the status page.
Accessible without authentication.';
