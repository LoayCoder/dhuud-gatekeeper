
-- ============================================================
-- DEEP FIX: Drop ALL overloads and recreate gate pass functions
-- ============================================================

-- STEP 1: Drop every overload of submit_public_gate_pass
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT oid::regprocedure::text AS sig
    FROM pg_proc
    WHERE proname = 'submit_public_gate_pass'
      AND pronamespace = 'public'::regnamespace
  LOOP
    EXECUTE 'DROP FUNCTION IF EXISTS ' || r.sig || ' CASCADE';
  END LOOP;
END $$;

-- STEP 2: Drop every overload of get_public_gate_pass_status
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT oid::regprocedure::text AS sig
    FROM pg_proc
    WHERE proname = 'get_public_gate_pass_status'
      AND pronamespace = 'public'::regnamespace
  LOOP
    EXECUTE 'DROP FUNCTION IF EXISTS ' || r.sig || ' CASCADE';
  END LOOP;
END $$;

-- STEP 3: Drop validate_gate_pass_guard_access
DROP FUNCTION IF EXISTS public.validate_gate_pass_guard_access(UUID) CASCADE;

-- STEP 4: Drop validate_gate_pass_dates trigger function
DROP FUNCTION IF EXISTS public.validate_gate_pass_dates() CASCADE;

-- ============================================================
-- RECREATE: submit_public_gate_pass (22 params)
-- ============================================================
CREATE OR REPLACE FUNCTION public.submit_public_gate_pass(
  p_tenant_slug TEXT,
  p_branch_id UUID,
  p_requester_name TEXT,
  p_requester_phone TEXT,
  p_requester_email TEXT,
  p_requester_company TEXT,
  p_pass_type TEXT,
  p_material_description TEXT,
  p_quantity TEXT,
  p_vehicle_plate TEXT,
  p_vehicle_plate_letters TEXT,
  p_vehicle_plate_numbers TEXT,
  p_driver_name TEXT,
  p_driver_mobile TEXT,
  p_pass_date DATE,
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
AS $fn$
DECLARE
  v_tenant_id UUID;
  v_tenant_name TEXT;
  v_tenant_enabled BOOLEAN;
  v_gate_pass_id UUID;
  v_access_token UUID;
  v_reference_id TEXT;
  v_rate_limit_count INT;
  v_actual_start DATE;
  v_actual_end DATE;
  v_item JSONB;
  v_item_id UUID;
BEGIN
  -- 1. Resolve tenant (NO deleted_at filter — tenants table has no such column)
  SELECT id, name, allow_public_gate_pass_requests
  INTO v_tenant_id, v_tenant_name, v_tenant_enabled
  FROM tenants
  WHERE slug = p_tenant_slug;

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Invalid tenant slug: %', p_tenant_slug;
  END IF;

  IF NOT COALESCE(v_tenant_enabled, false) THEN
    RAISE EXCEPTION 'Public gate pass requests are not enabled for this organization';
  END IF;

  -- 2. Validate branch belongs to tenant
  IF NOT EXISTS (
    SELECT 1 FROM branches
    WHERE id = p_branch_id
      AND tenant_id = v_tenant_id
      AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Invalid branch for this organization';
  END IF;

  -- 3. Rate limiting (max 10 per phone per tenant per day)
  SELECT COUNT(*) INTO v_rate_limit_count
  FROM material_gate_passes
  WHERE tenant_id = v_tenant_id
    AND requester_phone = p_requester_phone
    AND created_at > NOW() - INTERVAL '24 hours'
    AND deleted_at IS NULL;

  IF v_rate_limit_count >= 10 THEN
    RAISE EXCEPTION 'Rate limit exceeded. Please try again later.';
  END IF;

  -- 4. Date handling
  v_actual_start := COALESCE(p_start_date, p_pass_date);
  v_actual_end   := COALESCE(p_end_date, p_pass_date);

  -- Validate dates based on pass type
  IF p_pass_type IN ('in', 'out') THEN
    IF v_actual_start <> v_actual_end THEN
      RAISE EXCEPTION 'Single-direction passes (in/out) must have the same start and end date';
    END IF;
  ELSIF p_pass_type = 'in_out' THEN
    IF v_actual_end < v_actual_start THEN
      RAISE EXCEPTION 'End date cannot be before start date';
    END IF;
    IF (v_actual_end - v_actual_start) > 7 THEN
      RAISE EXCEPTION 'In/Out passes cannot exceed 7 days';
    END IF;
  END IF;

  -- 5. Generate token and reference
  v_access_token := gen_random_uuid();
  v_reference_id := 'GP-' || UPPER(SUBSTRING(encode(extensions.gen_random_bytes(6), 'hex') FROM 1 FOR 8));

  -- 6. Insert gate pass
  INSERT INTO material_gate_passes (
    tenant_id, branch_id, reference_id, pass_type,
    requester_name, requester_phone, requester_email, requester_company,
    material_description, quantity,
    vehicle_plate, vehicle_plate_letters, vehicle_plate_numbers,
    driver_name, driver_mobile,
    pass_date, start_date, end_date,
    status, public_access_token, token_expires_at,
    notify_whatsapp, notify_email, notify_sms,
    submission_ip, is_public_request
  ) VALUES (
    v_tenant_id, p_branch_id, v_reference_id, p_pass_type,
    p_requester_name, p_requester_phone, p_requester_email, p_requester_company,
    p_material_description, p_quantity,
    p_vehicle_plate, p_vehicle_plate_letters, p_vehicle_plate_numbers,
    p_driver_name, p_driver_mobile,
    p_pass_date, v_actual_start, v_actual_end,
    'pending_club_mgmt_ack', v_access_token, NOW() + INTERVAL '30 days',
    p_notify_whatsapp, p_notify_email, p_notify_sms,
    p_client_ip, true
  )
  RETURNING id INTO v_gate_pass_id;

  -- 7. Insert items
  IF p_items IS NOT NULL AND jsonb_array_length(p_items) > 0 THEN
    IF jsonb_array_length(p_items) > 10 THEN
      RAISE EXCEPTION 'Maximum 10 items per gate pass';
    END IF;

    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
      INSERT INTO public_gate_pass_items (
        gate_pass_id, tenant_id, branch_id,
        item_name, item_description, quantity, unit,
        photo_storage_path, photo_file_name, photo_mime_type, photo_file_size,
        sort_order
      ) VALUES (
        v_gate_pass_id, v_tenant_id, p_branch_id,
        v_item->>'item_name',
        v_item->>'item_description',
        COALESCE((v_item->>'quantity')::int, 1),
        COALESCE(v_item->>'unit', 'piece'),
        v_item->>'photo_storage_path',
        v_item->>'photo_file_name',
        v_item->>'photo_mime_type',
        (v_item->>'photo_file_size')::int,
        COALESCE((v_item->>'sort_order')::int, 0)
      );
    END LOOP;
  END IF;

  -- 8. Return result
  RETURN jsonb_build_object(
    'success', true,
    'gate_pass_id', v_gate_pass_id,
    'reference_id', v_reference_id,
    'access_token', v_access_token,
    'status', 'pending_club_mgmt_ack',
    'tenant_name', v_tenant_name
  );
END;
$fn$;

-- ============================================================
-- RECREATE: get_public_gate_pass_status (single UUID overload)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_public_gate_pass_status(
  p_access_token UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'gate_pass', jsonb_build_object(
      'id', gp.id,
      'reference_id', gp.reference_id,
      'status', gp.status,
      'pass_type', gp.pass_type,
      'requester_name', gp.requester_name,
      'requester_company', gp.requester_company,
      'material_description', gp.material_description,
      'quantity', gp.quantity,
      'vehicle_plate', gp.vehicle_plate,
      'driver_name', gp.driver_name,
      'pass_date', gp.pass_date,
      'start_date', gp.start_date,
      'end_date', gp.end_date,
      'created_at', gp.created_at,
      'rejection_reason', gp.rejection_reason,
      'qr_token', gp.qr_token,
      'items', COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'id', i.id,
          'item_name', i.item_name,
          'item_description', i.item_description,
          'quantity', i.quantity,
          'unit', i.unit,
          'photo_storage_path', i.photo_storage_path,
          'photo_file_name', i.photo_file_name,
          'sort_order', i.sort_order
        ) ORDER BY i.sort_order)
        FROM public_gate_pass_items i
        WHERE i.gate_pass_id = gp.id
          AND i.deleted_at IS NULL
      ), '[]'::jsonb)
    ),
    'branch', jsonb_build_object(
      'id', b.id,
      'name', b.name,
      'name_ar', b.name_ar
    ),
    'tenant', jsonb_build_object(
      'id', t.id,
      'name', t.name,
      'slug', t.slug,
      'logo_url', t.logo_light_url,
      'brand_color', t.brand_color
    )
  ) INTO v_result
  FROM material_gate_passes gp
  JOIN branches b ON b.id = gp.branch_id
  JOIN tenants t ON t.id = gp.tenant_id
  WHERE gp.public_access_token = p_access_token
    AND gp.deleted_at IS NULL
    AND gp.token_expires_at > NOW();

  IF v_result IS NULL THEN
    RAISE EXCEPTION 'Gate pass not found or token expired';
  END IF;

  RETURN v_result;
END;
$fn$;

-- ============================================================
-- RECREATE: validate_gate_pass_dates (trigger function)
-- ============================================================
CREATE OR REPLACE FUNCTION public.validate_gate_pass_dates()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $fn$
BEGIN
  -- Ensure start_date and end_date are set
  IF NEW.start_date IS NULL THEN
    NEW.start_date := NEW.pass_date;
  END IF;
  IF NEW.end_date IS NULL THEN
    NEW.end_date := NEW.pass_date;
  END IF;

  -- Validate based on pass type
  IF NEW.pass_type IN ('in', 'out') THEN
    IF NEW.start_date <> NEW.end_date THEN
      RAISE EXCEPTION 'Single-direction passes must have the same start and end date';
    END IF;
  ELSIF NEW.pass_type = 'in_out' THEN
    IF NEW.end_date < NEW.start_date THEN
      RAISE EXCEPTION 'End date cannot be before start date';
    END IF;
    IF (NEW.end_date - NEW.start_date) > 7 THEN
      RAISE EXCEPTION 'In/Out passes cannot exceed 7 days';
    END IF;
  END IF;

  RETURN NEW;
END;
$fn$;

-- Reattach trigger
DROP TRIGGER IF EXISTS trg_validate_gate_pass_dates ON material_gate_passes;
CREATE TRIGGER trg_validate_gate_pass_dates
  BEFORE INSERT OR UPDATE ON material_gate_passes
  FOR EACH ROW
  EXECUTE FUNCTION validate_gate_pass_dates();

-- ============================================================
-- RECREATE: validate_gate_pass_guard_access
-- ============================================================
CREATE OR REPLACE FUNCTION public.validate_gate_pass_guard_access(
  p_qr_token UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_result JSONB;
  v_pass RECORD;
BEGIN
  SELECT gp.*, b.name AS branch_name, b.name_ar AS branch_name_ar,
         t.name AS tenant_name
  INTO v_pass
  FROM material_gate_passes gp
  JOIN branches b ON b.id = gp.branch_id
  JOIN tenants t ON t.id = gp.tenant_id
  WHERE gp.qr_token = p_qr_token
    AND gp.deleted_at IS NULL;

  IF v_pass IS NULL THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Gate pass not found');
  END IF;

  IF v_pass.status NOT IN ('approved', 'used') THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Gate pass is not approved', 'status', v_pass.status);
  END IF;

  -- Check date validity
  IF CURRENT_DATE < v_pass.start_date OR CURRENT_DATE > v_pass.end_date THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Gate pass is not valid for today', 'start_date', v_pass.start_date, 'end_date', v_pass.end_date);
  END IF;

  RETURN jsonb_build_object(
    'valid', true,
    'gate_pass_id', v_pass.id,
    'reference_id', v_pass.reference_id,
    'pass_type', v_pass.pass_type,
    'status', v_pass.status,
    'requester_name', v_pass.requester_name,
    'requester_company', v_pass.requester_company,
    'material_description', v_pass.material_description,
    'vehicle_plate', v_pass.vehicle_plate,
    'driver_name', v_pass.driver_name,
    'start_date', v_pass.start_date,
    'end_date', v_pass.end_date,
    'branch_name', v_pass.branch_name,
    'tenant_name', v_pass.tenant_name
  );
END;
$fn$;

-- ============================================================
-- PERMISSIONS
-- ============================================================
GRANT EXECUTE ON FUNCTION public.submit_public_gate_pass(TEXT, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, DATE, BOOLEAN, BOOLEAN, BOOLEAN, TEXT, JSONB, DATE, DATE) TO anon;
GRANT EXECUTE ON FUNCTION public.submit_public_gate_pass(TEXT, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, DATE, BOOLEAN, BOOLEAN, BOOLEAN, TEXT, JSONB, DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_gate_pass_status(UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.get_public_gate_pass_status(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_gate_pass_guard_access(UUID) TO authenticated;

-- ============================================================
-- FORCE SCHEMA CACHE RELOAD
-- ============================================================
NOTIFY pgrst, 'reload schema';
