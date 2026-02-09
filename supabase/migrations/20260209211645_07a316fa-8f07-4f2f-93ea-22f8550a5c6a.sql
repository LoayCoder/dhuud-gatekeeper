
-- ============================================================
-- PART 1: Add missing columns (additive, non-destructive)
-- ============================================================
ALTER TABLE public.material_gate_passes
  ADD COLUMN IF NOT EXISTS vehicle_plate_letters TEXT,
  ADD COLUMN IF NOT EXISTS vehicle_plate_numbers TEXT,
  ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS submission_ip TEXT;

ALTER TABLE public.public_gate_pass_items
  ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id),
  ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- ============================================================
-- PART 2: Drop triggers FIRST, then functions
-- ============================================================
DROP TRIGGER IF EXISTS trg_validate_gate_pass_dates ON public.material_gate_passes;

DROP FUNCTION IF EXISTS public.submit_public_gate_pass(TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,DATE,DATE,JSONB);
DROP FUNCTION IF EXISTS public.submit_public_gate_pass(TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,DATE,DATE,JSONB);
DROP FUNCTION IF EXISTS public.submit_public_gate_pass(TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,JSONB);
DROP FUNCTION IF EXISTS public.submit_public_gate_pass(TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,JSONB);
DROP FUNCTION IF EXISTS public.get_public_gate_pass_status(TEXT);
DROP FUNCTION IF EXISTS public.get_public_gate_pass_status(UUID);
DROP FUNCTION IF EXISTS public.validate_gate_pass_dates();
DROP FUNCTION IF EXISTS public.validate_gate_pass_guard_access(UUID);

-- ============================================================
-- RECREATE: submit_public_gate_pass (22 params)
-- ============================================================
CREATE OR REPLACE FUNCTION public.submit_public_gate_pass(
  p_tenant_slug TEXT,
  p_branch_id TEXT,
  p_pass_type TEXT,
  p_requester_name TEXT,
  p_requester_phone TEXT,
  p_requester_email TEXT,
  p_requester_company TEXT,
  p_material_description TEXT,
  p_quantity TEXT,
  p_vehicle_plate TEXT,
  p_vehicle_plate_letters TEXT,
  p_vehicle_plate_numbers TEXT,
  p_driver_name TEXT,
  p_driver_mobile TEXT,
  p_project_id TEXT,
  p_purpose TEXT,
  p_notes TEXT,
  p_submission_ip TEXT,
  p_captcha_token TEXT,
  p_start_date DATE,
  p_end_date DATE,
  p_items JSONB DEFAULT '[]'::JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
  v_tenant_name TEXT;
  v_tenant_enabled BOOLEAN;
  v_branch_uuid UUID;
  v_project_uuid UUID;
  v_pass_id UUID;
  v_reference_number TEXT;
  v_access_token UUID;
  v_item JSONB;
  v_item_index INTEGER := 0;
BEGIN
  SELECT id, name, allow_public_gate_pass_requests
  INTO v_tenant_id, v_tenant_name, v_tenant_enabled
  FROM tenants
  WHERE slug = p_tenant_slug;

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Invalid tenant';
  END IF;

  IF NOT v_tenant_enabled THEN
    RAISE EXCEPTION 'Public gate pass requests are not enabled for this organization';
  END IF;

  v_branch_uuid := p_branch_id::UUID;
  PERFORM 1 FROM branches
  WHERE id = v_branch_uuid AND tenant_id = v_tenant_id AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid branch';
  END IF;

  IF p_project_id IS NOT NULL AND p_project_id != '' THEN
    v_project_uuid := p_project_id::UUID;
    PERFORM 1 FROM contractor_projects
    WHERE id = v_project_uuid AND tenant_id = v_tenant_id AND deleted_at IS NULL;
    IF NOT FOUND THEN
      v_project_uuid := NULL;
    END IF;
  END IF;

  v_reference_number := 'GP-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' ||
    UPPER(SUBSTRING(ENCODE(extensions.gen_random_bytes(4), 'hex') FROM 1 FOR 6));
  v_access_token := extensions.uuid_generate_v4();

  INSERT INTO material_gate_passes (
    tenant_id, branch_id, pass_type,
    public_requester_name, public_requester_phone, public_requester_email, public_requester_company,
    material_description, quantity, vehicle_plate, vehicle_plate_letters, vehicle_plate_numbers,
    driver_name, driver_mobile, project_id, purpose, notes, submission_ip,
    reference_number, qr_code_token, token_expires_at,
    start_date, end_date, status, is_public_request, created_at, updated_at
  ) VALUES (
    v_tenant_id, v_branch_uuid, p_pass_type,
    p_requester_name, p_requester_phone, p_requester_email, p_requester_company,
    p_material_description, p_quantity, p_vehicle_plate, p_vehicle_plate_letters, p_vehicle_plate_numbers,
    p_driver_name, p_driver_mobile, v_project_uuid, p_purpose, p_notes, p_submission_ip,
    v_reference_number, v_access_token, NOW() + INTERVAL '30 days',
    p_start_date, p_end_date, 'pending', TRUE, NOW(), NOW()
  )
  RETURNING id INTO v_pass_id;

  IF p_items IS NOT NULL AND jsonb_array_length(p_items) > 0 THEN
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
      INSERT INTO public_gate_pass_items (
        gate_pass_id, tenant_id, branch_id, item_name, description, quantity, unit, sort_order, created_at
      ) VALUES (
        v_pass_id, v_tenant_id, v_branch_uuid,
        COALESCE(v_item->>'item_name', 'Item ' || (v_item_index + 1)),
        v_item->>'description', v_item->>'quantity', v_item->>'unit',
        v_item_index, NOW()
      );
      v_item_index := v_item_index + 1;
    END LOOP;
  END IF;

  RETURN jsonb_build_object(
    'success', TRUE, 'gate_pass_id', v_pass_id,
    'reference_number', v_reference_number, 'access_token', v_access_token,
    'tenant_name', v_tenant_name, 'status', 'pending'
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', FALSE, 'error', SQLERRM);
END;
$$;

-- ============================================================
-- RECREATE: get_public_gate_pass_status (UUID param)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_public_gate_pass_status(
  p_access_token UUID
)
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
  WHERE mgp.qr_code_token = p_access_token AND mgp.deleted_at IS NULL;

  IF v_pass IS NULL THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Gate pass not found or access token expired');
  END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', pi.id, 'item_name', pi.item_name, 'description', pi.description,
    'quantity', pi.quantity, 'unit', pi.unit
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

-- ============================================================
-- RECREATE: validate_gate_pass_dates (trigger function)
-- ============================================================
CREATE OR REPLACE FUNCTION public.validate_gate_pass_dates()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.start_date IS NULL THEN RAISE EXCEPTION 'start_date is required'; END IF;
  IF NEW.end_date IS NULL THEN RAISE EXCEPTION 'end_date is required'; END IF;
  IF NEW.end_date < NEW.start_date THEN RAISE EXCEPTION 'end_date cannot be before start_date'; END IF;
  IF NEW.pass_type IN ('in', 'out') AND NEW.end_date != NEW.start_date THEN
    RAISE EXCEPTION 'in/out passes must be for a single day';
  END IF;
  IF NEW.pass_type = 'in_out' AND (NEW.end_date - NEW.start_date) > 7 THEN
    RAISE EXCEPTION 'in_out passes cannot exceed 7 days';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_gate_pass_dates
  BEFORE INSERT OR UPDATE ON public.material_gate_passes
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_gate_pass_dates();

-- ============================================================
-- RECREATE: validate_gate_pass_guard_access
-- ============================================================
CREATE OR REPLACE FUNCTION public.validate_gate_pass_guard_access(p_gate_pass_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pass RECORD;
  v_is_valid BOOLEAN := TRUE;
  v_errors TEXT[] := '{}';
  v_warnings TEXT[] := '{}';
  v_today DATE := CURRENT_DATE;
BEGIN
  SELECT mgp.id, mgp.reference_number, mgp.pass_type, mgp.status,
    mgp.start_date, mgp.end_date, mgp.vehicle_plate, mgp.driver_name,
    mgp.driver_mobile, mgp.material_description, mgp.entry_time, mgp.exit_time,
    mgp.public_requester_name, mgp.public_requester_company
  INTO v_pass
  FROM material_gate_passes mgp
  WHERE mgp.id = p_gate_pass_id AND mgp.deleted_at IS NULL;

  IF v_pass IS NULL THEN
    RETURN jsonb_build_object('is_valid', FALSE, 'errors', ARRAY['Gate pass not found'], 'warnings', '{}'::TEXT[]);
  END IF;

  IF v_pass.status != 'approved' THEN
    v_is_valid := FALSE;
    v_errors := array_append(v_errors, 'Gate pass is not approved (status: ' || v_pass.status || ')');
  END IF;

  IF v_today < v_pass.start_date OR v_today > v_pass.end_date THEN
    v_is_valid := FALSE;
    v_errors := array_append(v_errors, 'Gate pass is valid from ' || v_pass.start_date || ' to ' || v_pass.end_date || ', not valid today');
  END IF;

  IF v_pass.exit_time IS NOT NULL THEN
    v_is_valid := FALSE;
    v_errors := array_append(v_errors, 'Gate pass already completed (exit recorded)');
  END IF;

  RETURN jsonb_build_object(
    'is_valid', v_is_valid, 'errors', to_jsonb(v_errors), 'warnings', to_jsonb(v_warnings),
    'pass', jsonb_build_object(
      'id', v_pass.id, 'reference_number', v_pass.reference_number,
      'pass_type', v_pass.pass_type, 'status', v_pass.status,
      'start_date', v_pass.start_date, 'end_date', v_pass.end_date,
      'vehicle_plate', v_pass.vehicle_plate, 'driver_name', v_pass.driver_name,
      'driver_mobile', v_pass.driver_mobile, 'material_description', v_pass.material_description,
      'requester_name', v_pass.public_requester_name,
      'requester_company', v_pass.public_requester_company,
      'entry_time', v_pass.entry_time, 'exit_time', v_pass.exit_time
    )
  );
END;
$$;

-- ============================================================
-- PART 3: Permissions and schema cache reload
-- ============================================================
GRANT EXECUTE ON FUNCTION public.submit_public_gate_pass(TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,DATE,DATE,JSONB) TO anon;
GRANT EXECUTE ON FUNCTION public.submit_public_gate_pass(TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,DATE,DATE,JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_gate_pass_status(UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.get_public_gate_pass_status(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_gate_pass_guard_access(UUID) TO authenticated;
NOTIFY pgrst, 'reload schema';
