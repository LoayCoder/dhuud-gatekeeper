
-- ==============================================================================
-- FIX: Reapply gate pass entry/exit rules (original migration never executed)
-- Drops all old overloads and recreates with correct 22-param signature
-- ==============================================================================

-- 1. UPDATE validate_gate_pass_dates() TO ENFORCE PASS_TYPE-BASED DATE RULES
CREATE OR REPLACE FUNCTION public.validate_gate_pass_dates()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_date_diff INT;
BEGIN
  IF NEW.start_date IS NULL THEN
    NEW.start_date := COALESCE(NEW.pass_date, CURRENT_DATE);
  END IF;

  IF NEW.end_date IS NULL THEN
    NEW.end_date := NEW.start_date;
  END IF;

  v_date_diff := NEW.end_date - NEW.start_date;

  IF v_date_diff < 0 THEN
    RAISE EXCEPTION 'End date must be on or after start date';
  END IF;

  IF NEW.pass_type IN ('in', 'out') THEN
    IF v_date_diff > 0 THEN
      RAISE EXCEPTION 'Entry-only and Exit-only passes are valid for one day only';
    END IF;
  ELSE
    IF v_date_diff > 6 THEN
      RAISE EXCEPTION 'Date range cannot exceed 7 days (got % days)', v_date_diff + 1;
    END IF;
  END IF;

  NEW.pass_date := NEW.start_date;

  RETURN NEW;
END;
$$;

-- 2. DROP ALL OVERLOADS of submit_public_gate_pass
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS func_signature
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE p.proname = 'submit_public_gate_pass'
      AND n.nspname = 'public'
  LOOP
    EXECUTE 'DROP FUNCTION IF EXISTS ' || r.func_signature;
  END LOOP;
END;
$$;

-- RECREATE submit_public_gate_pass with correct signature
CREATE OR REPLACE FUNCTION public.submit_public_gate_pass(
  p_tenant_slug TEXT,
  p_branch_id UUID DEFAULT NULL,
  p_requester_name TEXT DEFAULT NULL,
  p_requester_phone TEXT DEFAULT NULL,
  p_requester_email TEXT DEFAULT NULL,
  p_requester_company TEXT DEFAULT NULL,
  p_pass_type TEXT DEFAULT 'in_out',
  p_material_description TEXT DEFAULT NULL,
  p_quantity TEXT DEFAULT NULL,
  p_vehicle_plate TEXT DEFAULT NULL,
  p_vehicle_plate_letters TEXT DEFAULT NULL,
  p_vehicle_plate_numbers TEXT DEFAULT NULL,
  p_driver_name TEXT DEFAULT NULL,
  p_driver_mobile TEXT DEFAULT NULL,
  p_pass_date DATE DEFAULT CURRENT_DATE,
  p_notify_whatsapp BOOLEAN DEFAULT true,
  p_notify_email BOOLEAN DEFAULT true,
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
      'error', 'Requester name and phone are required'
    );
  END IF;

  v_start_date := COALESCE(p_start_date, p_pass_date, CURRENT_DATE);
  v_end_date := COALESCE(p_end_date, p_start_date, p_pass_date, CURRENT_DATE);

  v_date_diff := v_end_date - v_start_date;

  IF v_date_diff < 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'End date must be on or after start date'
    );
  END IF;

  IF p_pass_type IN ('in', 'out') THEN
    IF v_date_diff > 0 THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Entry-only and Exit-only passes are valid for one day only'
      );
    END IF;
  ELSE
    IF v_date_diff > 6 THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Entry & Exit date range cannot exceed 7 days'
      );
    END IF;
  END IF;

  SELECT id, name, allow_public_gate_pass_requests
  INTO v_tenant_record
  FROM tenants
  WHERE slug = p_tenant_slug
    AND deleted_at IS NULL;

  IF v_tenant_record.id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Organization not found'
    );
  END IF;

  IF NOT v_tenant_record.allow_public_gate_pass_requests THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Public gate pass requests are not enabled for this organization'
    );
  END IF;

  v_tenant_id := v_tenant_record.id;

  IF p_client_ip IS NOT NULL THEN
    SELECT COUNT(*)
    INTO v_rate_limit_count
    FROM material_gate_passes
    WHERE is_public_request = true
      AND tenant_id = v_tenant_id
      AND created_at > (now() - interval '1 hour')
      AND public_requester_phone = p_requester_phone;

    IF v_rate_limit_count >= 5 THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Rate limit exceeded. Please try again later.'
      );
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
        gate_pass_id, tenant_id, sr_number, item_name, description,
        quantity, unit, photo_storage_path, photo_file_name,
        photo_file_size, photo_mime_type
      ) VALUES (
        v_gate_pass_id, v_tenant_id, v_item_record.sr_number,
        v_item_record.item_name, v_item_record.description,
        v_item_record.quantity, v_item_record.unit,
        v_item_record.photo_path, v_item_record.photo_file_name,
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

-- 3. UPDATE get_public_gate_pass_status TO RETURN start_date/end_date
CREATE OR REPLACE FUNCTION public.get_public_gate_pass_status(
  p_tenant_slug TEXT,
  p_access_token TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
  v_gate_pass RECORD;
  v_branch RECORD;
  v_tenant RECORD;
  v_items JSONB;
  v_supabase_url TEXT;
BEGIN
  v_supabase_url := current_setting('app.settings.supabase_url', true);
  IF v_supabase_url IS NULL THEN
    v_supabase_url := 'https://xdlowvfzhvjzbtgvurzj.supabase.co';
  END IF;

  SELECT id INTO v_tenant_id
  FROM tenants
  WHERE slug = p_tenant_slug
    AND deleted_at IS NULL;

  IF v_tenant_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Organization not found');
  END IF;

  SELECT
    mgp.id, mgp.reference_number, mgp.status, mgp.pass_type,
    mgp.pass_date, mgp.start_date, mgp.end_date,
    mgp.time_window_start, mgp.time_window_end,
    mgp.material_description, mgp.quantity, mgp.vehicle_plate,
    mgp.vehicle_plate_letters, mgp.vehicle_plate_numbers,
    mgp.driver_name, mgp.driver_mobile,
    mgp.public_requester_name AS requester_name,
    mgp.public_requester_phone AS requester_phone,
    mgp.public_requester_company AS requester_company,
    mgp.created_at, mgp.pm_approved_at, mgp.safety_approved_at,
    mgp.rejected_at, mgp.rejection_reason,
    mgp.entry_time, mgp.exit_time, mgp.branch_id
  INTO v_gate_pass
  FROM material_gate_passes mgp
  WHERE mgp.tenant_id = v_tenant_id
    AND mgp.public_access_token = p_access_token::uuid
    AND mgp.is_public_request = true
    AND mgp.token_expires_at > now()
    AND mgp.deleted_at IS NULL;

  IF v_gate_pass.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Gate pass not found or expired');
  END IF;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', i.id, 'sr_number', i.sr_number, 'item_name', i.item_name,
      'description', i.description, 'quantity', i.quantity, 'unit', i.unit,
      'photo_url', CASE
        WHEN i.photo_storage_path IS NOT NULL
        THEN v_supabase_url || '/storage/v1/object/public/public-gate-pass-photos/' || i.photo_storage_path
        ELSE NULL
      END
    )
  ), '[]'::jsonb)
  INTO v_items
  FROM public_gate_pass_items i
  WHERE i.gate_pass_id = v_gate_pass.id AND i.deleted_at IS NULL;

  IF v_gate_pass.branch_id IS NOT NULL THEN
    SELECT b.name, b.location, b.address, b.latitude, b.longitude, b.contact_phone AS phone
    INTO v_branch
    FROM branches b
    WHERE b.id = v_gate_pass.branch_id AND b.deleted_at IS NULL;
  END IF;

  SELECT t.name, t.logo_url, t.brand_color,
    t.public_gate_pass_instructions AS instructions,
    t.public_gate_pass_instructions_ar AS instructions_ar
  INTO v_tenant
  FROM tenants t WHERE t.id = v_tenant_id;

  RETURN jsonb_build_object(
    'success', true,
    'gate_pass', jsonb_build_object(
      'id', v_gate_pass.id,
      'reference_number', v_gate_pass.reference_number,
      'status', v_gate_pass.status,
      'pass_type', v_gate_pass.pass_type,
      'pass_date', v_gate_pass.pass_date,
      'start_date', v_gate_pass.start_date,
      'end_date', v_gate_pass.end_date,
      'time_window_start', v_gate_pass.time_window_start,
      'time_window_end', v_gate_pass.time_window_end,
      'material_description', v_gate_pass.material_description,
      'quantity', v_gate_pass.quantity,
      'vehicle_plate', v_gate_pass.vehicle_plate,
      'vehicle_plate_letters', v_gate_pass.vehicle_plate_letters,
      'vehicle_plate_numbers', v_gate_pass.vehicle_plate_numbers,
      'driver_name', v_gate_pass.driver_name,
      'driver_mobile', v_gate_pass.driver_mobile,
      'requester_name', v_gate_pass.requester_name,
      'requester_phone', v_gate_pass.requester_phone,
      'requester_company', v_gate_pass.requester_company,
      'created_at', v_gate_pass.created_at,
      'pm_approved_at', v_gate_pass.pm_approved_at,
      'safety_approved_at', v_gate_pass.safety_approved_at,
      'rejected_at', v_gate_pass.rejected_at,
      'rejection_reason', v_gate_pass.rejection_reason,
      'entry_time', v_gate_pass.entry_time,
      'exit_time', v_gate_pass.exit_time,
      'items', v_items
    ),
    'branch', CASE WHEN v_branch.name IS NOT NULL THEN jsonb_build_object(
      'name', v_branch.name, 'location', v_branch.location,
      'address', v_branch.address, 'latitude', v_branch.latitude,
      'longitude', v_branch.longitude, 'phone', v_branch.phone
    ) ELSE NULL END,
    'tenant', jsonb_build_object(
      'name', v_tenant.name, 'logo_url', v_tenant.logo_url,
      'brand_color', v_tenant.brand_color,
      'instructions', v_tenant.instructions,
      'instructions_ar', v_tenant.instructions_ar
    )
  );
END;
$$;

-- 4. CREATE validate_gate_pass_guard_access
CREATE OR REPLACE FUNCTION public.validate_gate_pass_guard_access(
  p_gate_pass_id UUID,
  p_action TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_pass RECORD;
  v_today DATE := CURRENT_DATE;
BEGIN
  SELECT id, pass_type, status, start_date, end_date, entry_time, exit_time
  INTO v_pass
  FROM public.material_gate_passes
  WHERE id = p_gate_pass_id AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'Gate pass not found');
  END IF;

  IF v_pass.status NOT IN ('approved', 'used') THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'Gate pass is not in an approved/active status');
  END IF;

  IF v_today < v_pass.start_date THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'Gate pass is not yet valid (future date)');
  END IF;

  IF v_today > v_pass.end_date THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'Gate pass has expired');
  END IF;

  IF v_pass.pass_type = 'in' THEN
    IF p_action = 'exit' THEN
      RETURN jsonb_build_object('allowed', false, 'reason', 'This is an Entry-only pass. Exit is not allowed.');
    END IF;
    IF v_pass.entry_time IS NOT NULL THEN
      RETURN jsonb_build_object('allowed', false, 'reason', 'Entry has already been recorded for this pass');
    END IF;
  ELSIF v_pass.pass_type = 'out' THEN
    IF p_action = 'entry' THEN
      RETURN jsonb_build_object('allowed', false, 'reason', 'This is an Exit-only pass. Entry is not allowed.');
    END IF;
    IF v_pass.exit_time IS NOT NULL THEN
      RETURN jsonb_build_object('allowed', false, 'reason', 'Exit has already been recorded for this pass');
    END IF;
  ELSE
    IF p_action = 'entry' AND v_pass.entry_time IS NOT NULL THEN
      RETURN jsonb_build_object('allowed', false, 'reason', 'Entry has already been recorded for this pass');
    END IF;
    IF p_action = 'exit' AND v_pass.exit_time IS NOT NULL THEN
      RETURN jsonb_build_object('allowed', false, 'reason', 'Exit has already been recorded for this pass');
    END IF;
    IF p_action = 'exit' AND v_pass.entry_time IS NULL THEN
      RETURN jsonb_build_object('allowed', false, 'reason', 'Cannot record exit without a prior entry');
    END IF;
  END IF;

  RETURN jsonb_build_object('allowed', true);
END;
$$;

-- 5. GRANT PERMISSIONS
GRANT EXECUTE ON FUNCTION public.validate_gate_pass_guard_access(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_public_gate_pass(TEXT, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, DATE, BOOLEAN, BOOLEAN, BOOLEAN, TEXT, JSONB, DATE, DATE) TO anon;

-- 6. RELOAD SCHEMA CACHE
NOTIFY pgrst, 'reload schema';
