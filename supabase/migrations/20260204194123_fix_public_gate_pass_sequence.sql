-- ============================================
-- FIX: Use database sequence for reference number generation
-- This prevents race conditions when multiple requests are processed concurrently
-- ============================================

-- Create sequence for public gate pass reference numbers
CREATE SEQUENCE IF NOT EXISTS public.public_gate_pass_ref_sequence
  START WITH 1
  INCREMENT BY 1
  NO MINVALUE
  NO MAXVALUE
  CACHE 1;

-- Update the submit_public_gate_pass function to use the sequence
CREATE OR REPLACE FUNCTION public.submit_public_gate_pass(
  p_tenant_slug TEXT,
  p_branch_id UUID,
  p_requester_name TEXT,
  p_requester_phone TEXT,
  p_requester_email TEXT DEFAULT NULL,
  p_requester_company TEXT DEFAULT NULL,
  p_pass_type TEXT DEFAULT 'in',
  p_material_description TEXT DEFAULT '',
  p_quantity TEXT DEFAULT NULL,
  p_vehicle_plate TEXT DEFAULT NULL,
  p_driver_name TEXT DEFAULT NULL,
  p_driver_mobile TEXT DEFAULT NULL,
  p_pass_date DATE DEFAULT CURRENT_DATE,
  p_time_window_start TIME DEFAULT NULL,
  p_time_window_end TIME DEFAULT NULL,
  p_notify_whatsapp BOOLEAN DEFAULT TRUE,
  p_notify_email BOOLEAN DEFAULT TRUE,
  p_notify_sms BOOLEAN DEFAULT FALSE,
  p_client_ip INET DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
  v_tenant_allows_public BOOLEAN;
  v_gate_pass_id UUID;
  v_reference_number TEXT;
  v_public_token UUID;
  v_rate_limit_count INTEGER;
  v_sequence BIGINT;
BEGIN
  -- 1. Validate tenant exists and allows public requests
  SELECT id, allow_public_gate_pass_requests
  INTO v_tenant_id, v_tenant_allows_public
  FROM public.tenants
  WHERE slug = p_tenant_slug;

  IF v_tenant_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid tenant');
  END IF;

  IF NOT v_tenant_allows_public THEN
    RETURN jsonb_build_object('success', false, 'error', 'Public gate pass requests are not enabled for this organization');
  END IF;

  -- 2. Rate limiting check (5 requests per hour per IP)
  IF p_client_ip IS NOT NULL THEN
    SELECT COALESCE(SUM(request_count), 0)
    INTO v_rate_limit_count
    FROM public.public_request_rate_limits
    WHERE ip_address = p_client_ip
      AND endpoint = 'gate_pass_submit'
      AND window_start > NOW() - INTERVAL '1 hour';

    IF v_rate_limit_count >= 5 THEN
      RETURN jsonb_build_object('success', false, 'error', 'Rate limit exceeded. Please try again later.');
    END IF;

    -- Record this request for rate limiting
    INSERT INTO public.public_request_rate_limits (ip_address, endpoint, request_count)
    VALUES (p_client_ip, 'gate_pass_submit', 1)
    ON CONFLICT (ip_address, endpoint, window_start)
    DO UPDATE SET request_count = public.public_request_rate_limits.request_count + 1;
  END IF;

  -- 3. Validate required fields
  IF p_requester_name IS NULL OR p_requester_name = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Requester name is required');
  END IF;

  IF p_requester_phone IS NULL OR p_requester_phone = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Phone number is required');
  END IF;

  -- 4. Validate branch belongs to tenant
  IF p_branch_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.branches WHERE id = p_branch_id AND tenant_id = v_tenant_id) THEN
      RETURN jsonb_build_object('success', false, 'error', 'Invalid branch');
    END IF;
  END IF;

  -- 5. Generate reference number using sequence (race-condition safe)
  SELECT nextval('public.public_gate_pass_ref_sequence') INTO v_sequence;
  v_reference_number := 'PGP-' || EXTRACT(YEAR FROM NOW())::TEXT || '-' || LPAD(v_sequence::TEXT, 5, '0');
  v_public_token := gen_random_uuid();

  -- 6. Create the gate pass
  INSERT INTO public.material_gate_passes (
    tenant_id,
    branch_id,
    is_public_request,
    public_access_token,
    public_requester_name,
    public_requester_phone,
    public_requester_email,
    public_requester_company,
    pass_type,
    material_description,
    quantity,
    vehicle_plate,
    driver_name,
    driver_mobile,
    pass_date,
    time_window_start,
    time_window_end,
    reference_number,
    status,
    notify_by_whatsapp,
    notify_by_email,
    notify_by_sms,
    requested_by
  ) VALUES (
    v_tenant_id,
    p_branch_id,
    true,
    v_public_token,
    p_requester_name,
    p_requester_phone,
    p_requester_email,
    p_requester_company,
    p_pass_type,
    p_material_description,
    p_quantity,
    p_vehicle_plate,
    p_driver_name,
    p_driver_mobile,
    p_pass_date,
    p_time_window_start,
    p_time_window_end,
    v_reference_number,
    'pending_mgmt',  -- New status for public requests
    p_notify_whatsapp,
    p_notify_email,
    p_notify_sms,
    '00000000-0000-0000-0000-000000000000'::UUID  -- Placeholder for public requests
  )
  RETURNING id INTO v_gate_pass_id;

  -- 7. Return success with token
  RETURN jsonb_build_object(
    'success', true,
    'gate_pass_id', v_gate_pass_id,
    'reference_number', v_reference_number,
    'public_access_token', v_public_token,
    'tracking_url', '/' || p_tenant_slug || '/track/' || v_public_token::TEXT
  );
END;
$$;

-- Grant execute permission to anonymous users
GRANT EXECUTE ON FUNCTION public.submit_public_gate_pass TO anon;
