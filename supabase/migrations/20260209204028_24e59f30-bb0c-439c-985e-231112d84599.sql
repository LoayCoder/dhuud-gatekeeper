
-- Drop existing function first
DROP FUNCTION IF EXISTS public.submit_public_gate_pass(text,uuid,text,text,text,text,text,text,text,text,text,text,text,text,date,boolean,boolean,boolean,text,jsonb,date,date);

-- Recreate with fixed tenant query (no deleted_at reference)
CREATE OR REPLACE FUNCTION public.submit_public_gate_pass(
  p_tenant_slug TEXT,
  p_branch_id UUID,
  p_requester_name TEXT,
  p_requester_phone TEXT,
  p_requester_email TEXT DEFAULT NULL,
  p_requester_company TEXT DEFAULT NULL,
  p_pass_type TEXT DEFAULT 'in',
  p_material_description TEXT DEFAULT NULL,
  p_quantity TEXT DEFAULT NULL,
  p_vehicle_plate TEXT DEFAULT NULL,
  p_vehicle_plate_letters TEXT DEFAULT NULL,
  p_vehicle_plate_numbers TEXT DEFAULT NULL,
  p_driver_name TEXT DEFAULT NULL,
  p_driver_mobile TEXT DEFAULT NULL,
  p_pass_date DATE DEFAULT CURRENT_DATE,
  p_notify_whatsapp BOOLEAN DEFAULT false,
  p_notify_email BOOLEAN DEFAULT false,
  p_notify_sms BOOLEAN DEFAULT false,
  p_client_ip TEXT DEFAULT NULL,
  p_items JSONB DEFAULT '[]'::jsonb,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
  v_tenant_record RECORD;
  v_gate_pass_id UUID;
  v_access_token UUID;
  v_reference_number TEXT;
  v_item_record RECORD;
  v_combined_plate TEXT;
  v_material_description TEXT;
  v_rate_limit_count INTEGER;
  v_start_date DATE;
  v_end_date DATE;
  v_date_diff INT;
BEGIN
  IF p_requester_name IS NULL OR p_requester_phone IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Requester name and phone are required');
  END IF;

  v_start_date := COALESCE(p_start_date, p_pass_date, CURRENT_DATE);
  v_end_date := COALESCE(p_end_date, p_start_date, p_pass_date, CURRENT_DATE);
  v_date_diff := v_end_date - v_start_date;

  IF v_date_diff < 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'End date must be on or after start date');
  END IF;

  IF p_pass_type IN ('in', 'out') THEN
    IF v_date_diff > 0 THEN
      RETURN jsonb_build_object('success', false, 'error', 'Entry-only and Exit-only passes are valid for one day only');
    END IF;
  ELSE
    IF v_date_diff > 6 THEN
      RETURN jsonb_build_object('success', false, 'error', 'Entry & Exit date range cannot exceed 7 days');
    END IF;
  END IF;

  SELECT id, name, allow_public_gate_pass_requests
  INTO v_tenant_record
  FROM tenants
  WHERE slug = p_tenant_slug;

  IF v_tenant_record.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Organization not found');
  END IF;

  IF NOT v_tenant_record.allow_public_gate_pass_requests THEN
    RETURN jsonb_build_object('success', false, 'error', 'Public gate pass requests are not enabled for this organization');
  END IF;

  v_tenant_id := v_tenant_record.id;

  IF p_client_ip IS NOT NULL THEN
    SELECT COUNT(*) INTO v_rate_limit_count
    FROM material_gate_passes
    WHERE is_public_request = true
      AND tenant_id = v_tenant_id
      AND created_at > (now() - interval '1 hour')
      AND public_requester_phone = p_requester_phone;

    IF v_rate_limit_count >= 5 THEN
      RETURN jsonb_build_object('success', false, 'error', 'Rate limit exceeded. Please try again later.');
    END IF;
  END IF;

  v_access_token := gen_random_uuid();
  v_reference_number := 'PUB-' || to_char(now(), 'YYYYMMDD') || '-' || substring(v_access_token::text, 1, 8);

  v_combined_plate := NULLIF(TRIM(COALESCE(p_vehicle_plate_letters, '') || ' ' || COALESCE(p_vehicle_plate_numbers, '')), '');
  IF v_combined_plate IS NULL THEN
    v_combined_plate := p_vehicle_plate;
  END IF;

  IF jsonb_array_length(p_items) > 0 THEN
    SELECT STRING_AGG(item->>'item_name', ', ')
    INTO v_material_description
    FROM jsonb_array_elements(p_items) AS item;
  ELSE
    v_material_description := p_material_description;
  END IF;

  INSERT INTO material_gate_passes (
    tenant_id, branch_id, reference_number, pass_type,
    material_description, quantity, vehicle_plate,
    vehicle_plate_letters, vehicle_plate_numbers,
    driver_name, driver_mobile, pass_date, start_date, end_date,
    status, is_public_request, public_access_token,
    public_requester_name, public_requester_phone,
    public_requester_email, public_requester_company,
    notify_whatsapp, notify_email, notify_sms, token_expires_at
  ) VALUES (
    v_tenant_id, p_branch_id, v_reference_number, p_pass_type,
    v_material_description, p_quantity, v_combined_plate,
    p_vehicle_plate_letters, p_vehicle_plate_numbers,
    p_driver_name, p_driver_mobile, v_start_date, v_start_date, v_end_date,
    'pending_club_mgmt_ack', true, v_access_token,
    p_requester_name, p_requester_phone,
    p_requester_email, p_requester_company,
    p_notify_whatsapp, p_notify_email, p_notify_sms,
    now() + interval '30 days'
  )
  RETURNING id INTO v_gate_pass_id;

  IF jsonb_array_length(p_items) > 0 THEN
    FOR v_item_record IN SELECT * FROM jsonb_to_recordset(p_items) AS x(
      sr_number TEXT, item_name TEXT, description TEXT,
      quantity TEXT, unit TEXT, photo_path TEXT,
      photo_file_name TEXT, photo_file_size INTEGER, photo_mime_type TEXT
    )
    LOOP
      INSERT INTO public_gate_pass_items (
        gate_pass_id, tenant_id, sr_number, item_name,
        description, quantity, unit,
        photo_path, photo_file_name, photo_file_size, photo_mime_type
      ) VALUES (
        v_gate_pass_id, v_tenant_id, v_item_record.sr_number, v_item_record.item_name,
        v_item_record.description, v_item_record.quantity, v_item_record.unit,
        v_item_record.photo_path, v_item_record.photo_file_name,
        v_item_record.photo_file_size, v_item_record.photo_mime_type
      );
    END LOOP;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'gate_pass_id', v_gate_pass_id,
    'reference_number', v_reference_number,
    'access_token', v_access_token,
    'status', 'pending_club_mgmt_ack'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_public_gate_pass TO anon;
GRANT EXECUTE ON FUNCTION public.submit_public_gate_pass TO authenticated;

NOTIFY pgrst, 'reload schema';
