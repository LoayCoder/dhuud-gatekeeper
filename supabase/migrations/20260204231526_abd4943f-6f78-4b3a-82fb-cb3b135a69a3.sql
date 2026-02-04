-- =============================================
-- PUBLIC GATE PASS FEATURE - PHASE 2 MIGRATION
-- =============================================

-- 1. Add public gate pass columns to tenants
ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS allow_public_gate_pass_requests BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS public_gate_pass_instructions TEXT,
ADD COLUMN IF NOT EXISTS public_gate_pass_instructions_ar TEXT;

-- 2. Add contact columns to branches  
ALTER TABLE branches
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS contact_phone TEXT,
ADD COLUMN IF NOT EXISTS contact_email TEXT;

-- 3. Add public requester columns to material_gate_passes
ALTER TABLE material_gate_passes
ADD COLUMN IF NOT EXISTS is_public_request BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS public_access_token UUID DEFAULT gen_random_uuid(),
ADD COLUMN IF NOT EXISTS public_requester_name TEXT,
ADD COLUMN IF NOT EXISTS public_requester_phone TEXT,
ADD COLUMN IF NOT EXISTS public_requester_email TEXT,
ADD COLUMN IF NOT EXISTS public_requester_company TEXT,
ADD COLUMN IF NOT EXISTS notify_whatsapp BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS notify_email BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS notify_sms BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMPTZ;

-- 4. Create index for public access token lookups (without deleted_at filter)
CREATE INDEX IF NOT EXISTS idx_material_gate_passes_public_token 
ON material_gate_passes(public_access_token) 
WHERE is_public_request = true;

-- 5. Create rate limiting table for public requests
CREATE TABLE IF NOT EXISTS public_request_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_ip TEXT NOT NULL,
  tenant_id UUID REFERENCES tenants(id),
  request_type TEXT NOT NULL DEFAULT 'gate_pass',
  request_count INTEGER DEFAULT 1,
  first_request_at TIMESTAMPTZ DEFAULT now(),
  last_request_at TIMESTAMPTZ DEFAULT now(),
  blocked_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for rate limit lookups
CREATE INDEX IF NOT EXISTS idx_rate_limits_ip_tenant 
ON public_request_rate_limits(client_ip, tenant_id, request_type);

-- Enable RLS on rate limits table
ALTER TABLE public_request_rate_limits ENABLE ROW LEVEL SECURITY;

-- Allow anon to insert rate limit records (for tracking)
CREATE POLICY "Allow anon insert rate limits" ON public_request_rate_limits
FOR INSERT TO anon WITH CHECK (true);

-- Allow anon to read own rate limit (by IP)
CREATE POLICY "Allow anon read own rate limits" ON public_request_rate_limits
FOR SELECT TO anon USING (client_ip = current_setting('request.headers', true)::json->>'x-forwarded-for');

-- 6. RLS policy for anonymous tenant lookup (only if public gate pass enabled)
CREATE POLICY "Allow anon read public tenant info" ON tenants
FOR SELECT TO anon
USING (allow_public_gate_pass_requests = true);

-- 7. RLS policy for anonymous branch lookup (only for tenants with public gate pass)
CREATE POLICY "Allow anon read branches for public tenants" ON branches
FOR SELECT TO anon
USING (
  EXISTS (
    SELECT 1 FROM tenants t 
    WHERE t.id = branches.tenant_id 
    AND t.allow_public_gate_pass_requests = true
  )
);

-- 8. RLS policy for anonymous to read own gate pass by token
CREATE POLICY "Allow anon read own public gate pass" ON material_gate_passes
FOR SELECT TO anon
USING (
  is_public_request = true 
  AND (token_expires_at IS NULL OR token_expires_at > now())
  AND public_access_token = (
    NULLIF(current_setting('request.headers', true)::json->>'x-public-token', '')::uuid
  )
);

-- 9. Create submit_public_gate_pass RPC function
CREATE OR REPLACE FUNCTION submit_public_gate_pass(
  p_tenant_slug TEXT,
  p_branch_id UUID DEFAULT NULL,
  p_requester_name TEXT DEFAULT NULL,
  p_requester_phone TEXT DEFAULT NULL,
  p_requester_email TEXT DEFAULT NULL,
  p_requester_company TEXT DEFAULT NULL,
  p_pass_type TEXT DEFAULT 'incoming',
  p_material_description TEXT DEFAULT NULL,
  p_quantity TEXT DEFAULT NULL,
  p_vehicle_plate TEXT DEFAULT NULL,
  p_driver_name TEXT DEFAULT NULL,
  p_driver_mobile TEXT DEFAULT NULL,
  p_pass_date DATE DEFAULT CURRENT_DATE,
  p_time_window_start TIME DEFAULT NULL,
  p_time_window_end TIME DEFAULT NULL,
  p_notify_whatsapp BOOLEAN DEFAULT true,
  p_notify_email BOOLEAN DEFAULT true,
  p_notify_sms BOOLEAN DEFAULT false,
  p_client_ip TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
  v_tenant_name TEXT;
  v_gate_pass_id UUID;
  v_access_token UUID;
  v_reference_id TEXT;
  v_rate_limit_count INTEGER;
  v_branch_valid BOOLEAN;
BEGIN
  -- 1. Validate tenant exists and has public gate pass enabled
  SELECT id, name INTO v_tenant_id, v_tenant_name
  FROM tenants
  WHERE slug = p_tenant_slug
    AND allow_public_gate_pass_requests = true;
  
  IF v_tenant_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Public gate pass requests are not enabled for this organization'
    );
  END IF;

  -- 2. Validate branch belongs to tenant (if provided)
  IF p_branch_id IS NOT NULL THEN
    SELECT EXISTS(
      SELECT 1 FROM branches 
      WHERE id = p_branch_id 
        AND tenant_id = v_tenant_id
    ) INTO v_branch_valid;
    
    IF NOT v_branch_valid THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Invalid branch selected'
      );
    END IF;
  END IF;

  -- 3. Check rate limiting (max 5 requests per IP per hour)
  SELECT COUNT(*) INTO v_rate_limit_count
  FROM public_request_rate_limits
  WHERE client_ip = p_client_ip
    AND tenant_id = v_tenant_id
    AND request_type = 'gate_pass'
    AND last_request_at > now() - interval '1 hour';
  
  IF v_rate_limit_count >= 5 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Too many requests. Please try again later.'
    );
  END IF;

  -- 4. Record rate limit
  INSERT INTO public_request_rate_limits (client_ip, tenant_id, request_type)
  VALUES (p_client_ip, v_tenant_id, 'gate_pass')
  ON CONFLICT DO NOTHING;

  -- 5. Generate access token and reference ID
  v_access_token := gen_random_uuid();
  v_reference_id := 'PUB-' || to_char(now(), 'YYYYMMDD') || '-' || 
                    substring(v_access_token::text from 1 for 8);

  -- 6. Create the gate pass
  INSERT INTO material_gate_passes (
    tenant_id,
    branch_id,
    reference_id,
    pass_type,
    material_description,
    quantity,
    vehicle_plate,
    driver_name,
    driver_mobile,
    pass_date,
    time_window_start,
    time_window_end,
    status,
    is_public_request,
    public_access_token,
    public_requester_name,
    public_requester_phone,
    public_requester_email,
    public_requester_company,
    notify_whatsapp,
    notify_email,
    notify_sms,
    token_expires_at
  ) VALUES (
    v_tenant_id,
    p_branch_id,
    v_reference_id,
    p_pass_type,
    p_material_description,
    p_quantity,
    p_vehicle_plate,
    p_driver_name,
    p_driver_mobile,
    p_pass_date,
    p_time_window_start,
    p_time_window_end,
    'pending_approval',
    true,
    v_access_token,
    p_requester_name,
    p_requester_phone,
    p_requester_email,
    p_requester_company,
    p_notify_whatsapp,
    p_notify_email,
    p_notify_sms,
    now() + interval '30 days'
  )
  RETURNING id INTO v_gate_pass_id;

  -- 7. Return success with token
  RETURN jsonb_build_object(
    'success', true,
    'gate_pass_id', v_gate_pass_id,
    'reference_id', v_reference_id,
    'public_access_token', v_access_token,
    'message', 'Gate pass request submitted successfully'
  );
END;
$$;

-- 10. Create get_public_gate_pass_status RPC function
CREATE OR REPLACE FUNCTION get_public_gate_pass_status(
  p_tenant_slug TEXT,
  p_access_token UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
  v_gate_pass RECORD;
  v_branch_name TEXT;
BEGIN
  -- 1. Validate tenant
  SELECT id INTO v_tenant_id
  FROM tenants
  WHERE slug = p_tenant_slug
    AND allow_public_gate_pass_requests = true;
  
  IF v_tenant_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Organization not found'
    );
  END IF;

  -- 2. Find gate pass by token
  SELECT 
    mgp.id,
    mgp.reference_id,
    mgp.status,
    mgp.pass_type,
    mgp.material_description,
    mgp.quantity,
    mgp.vehicle_plate,
    mgp.driver_name,
    mgp.pass_date,
    mgp.time_window_start,
    mgp.time_window_end,
    mgp.public_requester_name,
    mgp.public_requester_company,
    mgp.approved_at,
    mgp.approved_by,
    mgp.rejection_reason,
    mgp.created_at,
    mgp.token_expires_at,
    mgp.branch_id
  INTO v_gate_pass
  FROM material_gate_passes mgp
  WHERE mgp.public_access_token = p_access_token
    AND mgp.tenant_id = v_tenant_id
    AND mgp.is_public_request = true;
  
  IF v_gate_pass IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Gate pass not found or token expired'
    );
  END IF;

  -- Check token expiry
  IF v_gate_pass.token_expires_at IS NOT NULL AND v_gate_pass.token_expires_at < now() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Access token has expired'
    );
  END IF;

  -- 3. Get branch name if available
  IF v_gate_pass.branch_id IS NOT NULL THEN
    SELECT name INTO v_branch_name
    FROM branches
    WHERE id = v_gate_pass.branch_id;
  END IF;

  -- 4. Return gate pass details
  RETURN jsonb_build_object(
    'success', true,
    'data', jsonb_build_object(
      'id', v_gate_pass.id,
      'reference_id', v_gate_pass.reference_id,
      'status', v_gate_pass.status,
      'pass_type', v_gate_pass.pass_type,
      'material_description', v_gate_pass.material_description,
      'quantity', v_gate_pass.quantity,
      'vehicle_plate', v_gate_pass.vehicle_plate,
      'driver_name', v_gate_pass.driver_name,
      'pass_date', v_gate_pass.pass_date,
      'time_window_start', v_gate_pass.time_window_start,
      'time_window_end', v_gate_pass.time_window_end,
      'requester_name', v_gate_pass.public_requester_name,
      'requester_company', v_gate_pass.public_requester_company,
      'branch_name', v_branch_name,
      'approved_at', v_gate_pass.approved_at,
      'rejection_reason', v_gate_pass.rejection_reason,
      'created_at', v_gate_pass.created_at
    )
  );
END;
$$;

-- 11. Grant execute permissions to anon role
GRANT EXECUTE ON FUNCTION submit_public_gate_pass TO anon;
GRANT EXECUTE ON FUNCTION get_public_gate_pass_status TO anon;