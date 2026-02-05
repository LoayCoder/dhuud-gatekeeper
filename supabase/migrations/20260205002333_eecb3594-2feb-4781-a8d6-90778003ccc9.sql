-- Fix submit_public_gate_pass function:
-- 1. Change reference_id to reference_number
-- 2. Handle requested_by NOT NULL by making it nullable for public requests

-- First, make requested_by nullable for public requests
ALTER TABLE material_gate_passes 
ALTER COLUMN requested_by DROP NOT NULL;

-- Add a check constraint to ensure requested_by is set for non-public requests
ALTER TABLE material_gate_passes 
ADD CONSTRAINT chk_requested_by_for_internal 
CHECK (is_public_request = true OR requested_by IS NOT NULL);

-- Now fix the submit_public_gate_pass function
CREATE OR REPLACE FUNCTION public.submit_public_gate_pass(
  p_tenant_slug text, 
  p_branch_id uuid DEFAULT NULL::uuid, 
  p_requester_name text DEFAULT NULL::text, 
  p_requester_phone text DEFAULT NULL::text, 
  p_requester_email text DEFAULT NULL::text, 
  p_requester_company text DEFAULT NULL::text, 
  p_pass_type text DEFAULT 'incoming'::text, 
  p_material_description text DEFAULT NULL::text, 
  p_quantity text DEFAULT NULL::text, 
  p_vehicle_plate text DEFAULT NULL::text, 
  p_driver_name text DEFAULT NULL::text, 
  p_driver_mobile text DEFAULT NULL::text, 
  p_pass_date date DEFAULT CURRENT_DATE, 
  p_time_window_start time without time zone DEFAULT NULL::time without time zone, 
  p_time_window_end time without time zone DEFAULT NULL::time without time zone, 
  p_notify_whatsapp boolean DEFAULT true, 
  p_notify_email boolean DEFAULT true, 
  p_notify_sms boolean DEFAULT false, 
  p_client_ip text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_tenant_id UUID;
  v_tenant_name TEXT;
  v_gate_pass_id UUID;
  v_access_token UUID;
  v_reference_number TEXT;
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

  -- 5. Generate access token and reference number
  v_access_token := gen_random_uuid();
  v_reference_number := 'PUB-' || to_char(now(), 'YYYYMMDD') || '-' || 
                        substring(v_access_token::text from 1 for 8);

  -- 6. Create the gate pass (requested_by is NULL for public requests)
  INSERT INTO material_gate_passes (
    tenant_id,
    branch_id,
    reference_number,
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
    v_reference_number,
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
    'reference_number', v_reference_number,
    'public_access_token', v_access_token,
    'message', 'Gate pass request submitted successfully'
  );
END;
$function$;