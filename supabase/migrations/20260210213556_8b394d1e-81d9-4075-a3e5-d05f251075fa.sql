
-- Fix Bug 1: submit_public_gate_pass - change photo_path to photo_storage_path in jsonb_to_recordset
-- Fix Bug 2: get_public_gate_pass_status - add photo_storage_path and sr_number to items JSON

CREATE OR REPLACE FUNCTION public.submit_public_gate_pass(
  p_tenant_slug TEXT,
  p_branch_id UUID,
  p_pass_type TEXT,
  p_requester_name TEXT,
  p_requester_phone TEXT,
  p_requester_email TEXT DEFAULT NULL,
  p_requester_company TEXT DEFAULT NULL,
  p_material_description TEXT DEFAULT NULL,
  p_quantity TEXT DEFAULT NULL,
  p_vehicle_plate TEXT DEFAULT NULL,
  p_vehicle_plate_letters TEXT DEFAULT NULL,
  p_vehicle_plate_numbers TEXT DEFAULT NULL,
  p_driver_name TEXT DEFAULT NULL,
  p_driver_mobile TEXT DEFAULT NULL,
  p_items JSONB DEFAULT '[]'::JSONB,
  p_pass_date DATE DEFAULT NULL,
  p_notify_whatsapp BOOLEAN DEFAULT FALSE,
  p_notify_email BOOLEAN DEFAULT FALSE,
  p_notify_sms BOOLEAN DEFAULT FALSE,
  p_client_ip TEXT DEFAULT NULL,
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
  v_inserted_item_id UUID;
  v_combined_plate TEXT;
  v_material_description TEXT;
  v_rate_limit_count INTEGER;
  v_start_date DATE;
  v_end_date DATE;
  v_date_diff INT;
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

  SELECT id, name, allow_public_gate_pass_requests INTO v_tenant_record
  FROM tenants WHERE slug = p_tenant_slug;

  IF v_tenant_record.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Organization not found', 'error_code', 'TENANT_NOT_FOUND');
  END IF;

  IF NOT v_tenant_record.allow_public_gate_pass_requests THEN
    RETURN jsonb_build_object('success', false, 'error', 'Public gate pass requests are not enabled for this organization', 'error_code', 'PUBLIC_REQUESTS_DISABLED');
  END IF;

  v_tenant_id := v_tenant_record.id;

  IF p_client_ip IS NOT NULL THEN
    SELECT COUNT(*) INTO v_rate_limit_count
    FROM material_gate_passes
    WHERE is_public_request = true AND tenant_id = v_tenant_id
      AND created_at > (now() - interval '1 hour')
      AND public_requester_phone = p_requester_phone;

    IF v_rate_limit_count >= 5 THEN
      RETURN jsonb_build_object('success', false, 'error', 'Rate limit exceeded. Please try again later.', 'error_code', 'RATE_LIMIT_EXCEEDED');
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
    FROM jsonb_array_elements(p_items) AS item
    WHERE NULLIF(TRIM(item->>'item_name'), '') IS NOT NULL;
  ELSE
    v_material_description := p_material_description;
  END IF;

  IF v_material_description IS NULL OR TRIM(v_material_description) = '' THEN
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

-- Fix get_public_gate_pass_status to include photo_storage_path and sr_number in items
CREATE OR REPLACE FUNCTION public.get_public_gate_pass_status(p_access_token UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pass RECORD;
  v_items JSONB;
  v_branch RECORD;
  v_tenant RECORD;
BEGIN
  SELECT mgp.id, mgp.reference_number, mgp.pass_type,
    mgp.public_requester_name, mgp.public_requester_phone,
    mgp.public_requester_email, mgp.public_requester_company,
    mgp.material_description, mgp.quantity, mgp.vehicle_plate,
    mgp.driver_name, mgp.driver_mobile, mgp.start_date, mgp.end_date,
    mgp.purpose, mgp.notes, mgp.status, mgp.rejection_reason,
    mgp.entry_time, mgp.exit_time, mgp.created_at, mgp.updated_at,
    mgp.branch_id, mgp.tenant_id, mgp.qr_code_token
  INTO v_pass
  FROM material_gate_passes mgp
  WHERE mgp.public_access_token = p_access_token AND mgp.deleted_at IS NULL;

  IF v_pass IS NULL THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Gate pass not found or access token expired');
  END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', pi.id, 'sr_number', pi.sr_number,
    'item_name', pi.item_name, 'description', pi.description,
    'quantity', pi.quantity, 'unit', pi.unit,
    'photo_storage_path', pi.photo_storage_path
  ) ORDER BY pi.sort_order, pi.created_at), '[]'::JSONB)
  INTO v_items
  FROM public_gate_pass_items pi
  WHERE pi.gate_pass_id = v_pass.id AND pi.deleted_at IS NULL;

  SELECT b.id, b.name, b.location, b.address, b.contact_phone, b.contact_email
  INTO v_branch
  FROM branches b WHERE b.id = v_pass.branch_id AND b.deleted_at IS NULL;

  SELECT t.id, t.name, t.slug, t.logo_light_url, t.brand_color
  INTO v_tenant FROM tenants t WHERE t.id = v_pass.tenant_id;

  RETURN jsonb_build_object(
    'success', TRUE,
    'gate_pass', jsonb_build_object(
      'id', v_pass.id, 'reference_number', v_pass.reference_number,
      'pass_type', v_pass.pass_type,
      'requester_name', v_pass.public_requester_name,
      'requester_phone', v_pass.public_requester_phone,
      'requester_email', v_pass.public_requester_email,
      'requester_company', v_pass.public_requester_company,
      'material_description', v_pass.material_description,
      'quantity', v_pass.quantity, 'vehicle_plate', v_pass.vehicle_plate,
      'driver_name', v_pass.driver_name, 'driver_mobile', v_pass.driver_mobile,
      'start_date', v_pass.start_date, 'end_date', v_pass.end_date,
      'purpose', v_pass.purpose, 'notes', v_pass.notes,
      'status', v_pass.status, 'rejection_reason', v_pass.rejection_reason,
      'entry_time', v_pass.entry_time, 'exit_time', v_pass.exit_time,
      'qr_code_token', v_pass.qr_code_token,
      'created_at', v_pass.created_at, 'updated_at', v_pass.updated_at
    ),
    'items', v_items,
    'branch', jsonb_build_object(
      'id', v_branch.id, 'name', v_branch.name, 'location', v_branch.location,
      'address', v_branch.address, 'contact_phone', v_branch.contact_phone,
      'contact_email', v_branch.contact_email
    ),
    'tenant', jsonb_build_object(
      'id', v_tenant.id, 'name', v_tenant.name, 'slug', v_tenant.slug,
      'logo_url', v_tenant.logo_light_url, 'brand_color', v_tenant.brand_color
    )
  );
END;
$$;
