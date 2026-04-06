
-- Add short_name column to tenants
ALTER TABLE public.tenants ADD COLUMN short_name VARCHAR(10);

-- Backfill existing tenants
UPDATE public.tenants SET short_name = 'GS' WHERE id = 'e30ae1a5-7eab-4776-bd0b-bb0b391e68e8';
UPDATE public.tenants SET short_name = 'DP' WHERE id = '9290e913-c735-405c-91c6-141e966011ae';

-- Add unique constraint
ALTER TABLE public.tenants ADD CONSTRAINT uq_tenants_short_name UNIQUE (short_name);

-- Update submit_public_gate_pass to use tenant short_name prefix
CREATE OR REPLACE FUNCTION public.submit_public_gate_pass(
  p_tenant_slug TEXT,
  p_branch_id UUID DEFAULT NULL,
  p_pass_type TEXT DEFAULT 'in_out',
  p_material_description TEXT DEFAULT NULL,
  p_quantity TEXT DEFAULT NULL,
  p_vehicle_plate TEXT DEFAULT NULL,
  p_vehicle_plate_letters TEXT DEFAULT NULL,
  p_vehicle_plate_numbers TEXT DEFAULT NULL,
  p_driver_name TEXT DEFAULT NULL,
  p_driver_mobile TEXT DEFAULT NULL,
  p_pass_date DATE DEFAULT NULL,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL,
  p_requester_name TEXT DEFAULT NULL,
  p_requester_phone TEXT DEFAULT NULL,
  p_requester_email TEXT DEFAULT NULL,
  p_requester_company TEXT DEFAULT NULL,
  p_notify_whatsapp BOOLEAN DEFAULT FALSE,
  p_notify_email BOOLEAN DEFAULT FALSE,
  p_notify_sms BOOLEAN DEFAULT FALSE,
  p_items JSONB DEFAULT '[]'::jsonb
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
  v_inserted_item_id UUID;
  v_combined_plate TEXT;
  v_material_description TEXT;
  v_rate_limit_count INTEGER;
  v_start_date DATE;
  v_end_date DATE;
  v_date_diff INT;
  v_prefix TEXT;
BEGIN
  IF p_requester_name IS NULL OR p_requester_phone IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Requester name and phone are required',
      'error_code', 'MISSING_REQUIRED_FIELDS'
    );
  END IF;

  v_start_date := COALESCE(p_start_date, p_pass_date, CURRENT_DATE);
  v_end_date := COALESCE(p_end_date, p_start_date, p_pass_date, CURRENT_DATE);
  v_date_diff := v_end_date - v_start_date;

  IF v_date_diff < 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'End date must be on or after start date', 'error_code', 'INVALID_DATE_RANGE');
  END IF;

  IF p_pass_type IN ('in', 'out') THEN
    IF v_date_diff > 0 THEN
      RETURN jsonb_build_object('success', false, 'error', 'Entry-only and Exit-only passes are valid for one day only', 'error_code', 'SINGLE_DAY_PASS_VIOLATION');
    END IF;
  ELSE
    IF v_date_diff > 6 THEN
      RETURN jsonb_build_object('success', false, 'error', 'Entry & Exit date range cannot exceed 7 days', 'error_code', 'DATE_RANGE_EXCEEDS_LIMIT');
    END IF;
  END IF;

  SELECT id, name, short_name, allow_public_gate_pass_requests INTO v_tenant_record
  FROM tenants WHERE slug = p_tenant_slug;

  IF v_tenant_record.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Organization not found', 'error_code', 'TENANT_NOT_FOUND');
  END IF;

  IF NOT v_tenant_record.allow_public_gate_pass_requests THEN
    RETURN jsonb_build_object('success', false, 'error', 'This organization does not accept public gate pass requests', 'error_code', 'PUBLIC_REQUESTS_DISABLED');
  END IF;

  v_tenant_id := v_tenant_record.id;

  -- Rate limiting
  SELECT COUNT(*) INTO v_rate_limit_count
  FROM material_gate_passes
  WHERE tenant_id = v_tenant_id
    AND is_public_request = true
    AND public_requester_phone = p_requester_phone
    AND submitted_at > now() - interval '1 hour';

  IF v_rate_limit_count >= 5 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Too many requests. Please try again later.', 'error_code', 'RATE_LIMITED');
  END IF;

  v_access_token := gen_random_uuid();

  -- Use tenant short_name as prefix, fallback to 'PUB'
  v_prefix := COALESCE(v_tenant_record.short_name, 'PUB');
  v_reference_number := v_prefix || '-PUB-' || to_char(now(), 'YYYYMMDD') || '-' || substring(v_access_token::text, 1, 8);

  -- Build combined plate
  IF p_vehicle_plate_letters IS NOT NULL AND p_vehicle_plate_numbers IS NOT NULL THEN
    v_combined_plate := p_vehicle_plate_letters || ' ' || p_vehicle_plate_numbers;
  ELSIF p_vehicle_plate IS NOT NULL THEN
    v_combined_plate := p_vehicle_plate;
  ELSE
    v_combined_plate := NULL;
  END IF;

  -- Build material description from items if not provided
  IF p_material_description IS NOT NULL AND p_material_description <> '' THEN
    v_material_description := p_material_description;
  ELSIF jsonb_array_length(p_items) > 0 THEN
    v_material_description := '';
    FOR v_item_record IN SELECT * FROM jsonb_to_recordset(p_items) AS x(
      sr_number TEXT, item_name TEXT, description TEXT,
      quantity TEXT, unit TEXT, photo_storage_path TEXT,
      photo_file_name TEXT, photo_file_size INTEGER, photo_mime_type TEXT
    )
    LOOP
      IF v_material_description <> '' THEN
        v_material_description := v_material_description || '; ';
      END IF;
      v_material_description := v_material_description || COALESCE(v_item_record.item_name, '');
      IF v_item_record.quantity IS NOT NULL THEN
        v_material_description := v_material_description || ' (' || v_item_record.quantity;
        IF v_item_record.unit IS NOT NULL THEN
          v_material_description := v_material_description || ' ' || v_item_record.unit;
        END IF;
        v_material_description := v_material_description || ')';
      END IF;
    END LOOP;
  ELSE
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Material description is required. Please provide either a description or at least one item with a name.',
      'error_code', 'MISSING_MATERIAL_DESCRIPTION'
    );
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
      quantity TEXT, unit TEXT, photo_storage_path TEXT,
      photo_file_name TEXT, photo_file_size INTEGER, photo_mime_type TEXT
    )
    LOOP
      INSERT INTO public_gate_pass_items (
        gate_pass_id, tenant_id, sr_number, item_name, description,
        quantity, unit, photo_storage_path, photo_file_name,
        photo_file_size, photo_mime_type
      ) VALUES (
        v_gate_pass_id, v_tenant_id, v_item_record.sr_number,
        v_item_record.item_name, v_item_record.description,
        v_item_record.quantity, v_item_record.unit,
        v_item_record.photo_storage_path, v_item_record.photo_file_name,
        v_item_record.photo_file_size, v_item_record.photo_mime_type
      );
    END LOOP;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'gate_pass_id', v_gate_pass_id,
    'reference_number', v_reference_number,
    'public_access_token', v_access_token
  );
END;
$$;
