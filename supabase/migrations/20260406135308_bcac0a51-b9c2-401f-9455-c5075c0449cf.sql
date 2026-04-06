
-- 1. Create gate_pass_counters table
CREATE TABLE public.gate_pass_counters (
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  counter_type TEXT NOT NULL DEFAULT 'internal',
  current_value BIGINT NOT NULL DEFAULT 0,
  PRIMARY KEY (tenant_id, counter_type)
);

ALTER TABLE public.gate_pass_counters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read own tenant counters"
ON public.gate_pass_counters
FOR SELECT
TO authenticated
USING (tenant_id = get_auth_tenant_id());

-- 2. Create next_gate_pass_ref function (SECURITY DEFINER, atomic upsert)
CREATE OR REPLACE FUNCTION public.next_gate_pass_ref(p_tenant_id UUID, p_counter_type TEXT DEFAULT 'internal')
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_next BIGINT;
BEGIN
  INSERT INTO gate_pass_counters (tenant_id, counter_type, current_value)
  VALUES (p_tenant_id, p_counter_type, 1)
  ON CONFLICT (tenant_id, counter_type)
  DO UPDATE SET current_value = gate_pass_counters.current_value + 1
  RETURNING current_value INTO v_next;

  RETURN v_next;
END;
$$;

-- 3. Backfill internal counters from existing passes
INSERT INTO gate_pass_counters (tenant_id, counter_type, current_value)
SELECT tenant_id, 'internal', COUNT(*)
FROM material_gate_passes
WHERE deleted_at IS NULL
  AND is_public_request = false
GROUP BY tenant_id
ON CONFLICT (tenant_id, counter_type) DO UPDATE
SET current_value = EXCLUDED.current_value;

-- Backfill public counters
INSERT INTO gate_pass_counters (tenant_id, counter_type, current_value)
SELECT tenant_id, 'public', COUNT(*)
FROM material_gate_passes
WHERE deleted_at IS NULL
  AND is_public_request = true
GROUP BY tenant_id
ON CONFLICT (tenant_id, counter_type) DO UPDATE
SET current_value = EXCLUDED.current_value;

-- 4. Update submit_public_gate_pass to use tenant-scoped counter
-- First get the current function signature to drop it
DROP FUNCTION IF EXISTS public.submit_public_gate_pass(text, uuid, text, text, text, text, text, text, text, text, date, date, date, text, text, text, text, boolean, boolean, boolean, jsonb);

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
  p_items JSONB DEFAULT '[]'::JSONB
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
  v_seq BIGINT;
BEGIN
  IF p_requester_name IS NULL OR p_requester_phone IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Requester name and phone are required',
      'error_code', 'MISSING_REQUIRED_FIELDS'
    );
  END IF;

  SELECT id, name, short_name, allow_public_gate_pass_requests INTO v_tenant_record
  FROM tenants
  WHERE slug = p_tenant_slug AND deleted_at IS NULL;

  IF v_tenant_record IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Organization not found', 'error_code', 'TENANT_NOT_FOUND');
  END IF;

  v_tenant_id := v_tenant_record.id;

  IF NOT COALESCE(v_tenant_record.allow_public_gate_pass_requests, false) THEN
    RETURN jsonb_build_object('success', false, 'error', 'This organization does not accept public gate pass requests', 'error_code', 'PUBLIC_REQUESTS_DISABLED');
  END IF;

  SELECT COUNT(*) INTO v_rate_limit_count
  FROM material_gate_passes
  WHERE tenant_id = v_tenant_id
    AND requester_phone = p_requester_phone
    AND is_public_request = true
    AND created_at > now() - interval '1 hour';

  IF v_rate_limit_count >= 10 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Too many requests. Please try again later.', 'error_code', 'RATE_LIMIT_EXCEEDED');
  END IF;

  v_access_token := gen_random_uuid();

  -- Use tenant-scoped counter for reference number
  v_prefix := COALESCE(v_tenant_record.short_name, 'PUB');
  v_seq := next_gate_pass_ref(v_tenant_id, 'public');
  v_reference_number := v_prefix || '-PUB-' || to_char(now(), 'YYYYMMDD') || '-' || LPAD(v_seq::text, 5, '0');

  IF p_vehicle_plate IS NOT NULL THEN
    v_combined_plate := p_vehicle_plate;
  ELSIF p_vehicle_plate_letters IS NOT NULL OR p_vehicle_plate_numbers IS NOT NULL THEN
    v_combined_plate := COALESCE(p_vehicle_plate_letters, '') || ' ' || COALESCE(p_vehicle_plate_numbers, '');
  END IF;

  v_material_description := p_material_description;
  IF (v_material_description IS NULL OR v_material_description = '') AND p_items IS NOT NULL AND jsonb_array_length(p_items) > 0 THEN
    SELECT string_agg(
      COALESCE(item->>'item_name', item->>'name', 'Unknown Item') ||
      CASE WHEN item->>'quantity' IS NOT NULL THEN ' (' || (item->>'quantity') || COALESCE(' ' || (item->>'unit'), '') || ')' ELSE '' END,
      '; '
    ) INTO v_material_description
    FROM jsonb_array_elements(p_items) AS item;
  END IF;

  IF v_material_description IS NULL OR v_material_description = '' THEN
    v_material_description := 'Material request - ' || v_reference_number;
  END IF;

  v_start_date := COALESCE(p_start_date, p_pass_date, CURRENT_DATE);
  v_end_date := COALESCE(p_end_date, v_start_date + interval '7 days');
  v_date_diff := v_end_date - v_start_date;
  IF v_date_diff < 0 THEN
    v_end_date := v_start_date + interval '7 days';
  ELSIF v_date_diff > 365 THEN
    v_end_date := v_start_date + interval '365 days';
  END IF;

  INSERT INTO material_gate_passes (
    tenant_id, branch_id, reference_number, pass_type,
    requester_name, requester_phone, requester_email, requester_company,
    material_description, quantity, vehicle_plate_number,
    driver_name, driver_mobile,
    status, workflow_status, is_public_request,
    public_access_token, submitted_at, start_date, end_date,
    notify_whatsapp, notify_email, notify_sms
  ) VALUES (
    v_tenant_id, p_branch_id, v_reference_number, p_pass_type,
    p_requester_name, p_requester_phone, p_requester_email, p_requester_company,
    v_material_description, p_quantity, v_combined_plate,
    p_driver_name, p_driver_mobile,
    'pending_acknowledgment', 'pending_acknowledgment', true,
    v_access_token, now(), v_start_date, v_end_date,
    p_notify_whatsapp, p_notify_email, p_notify_sms
  )
  RETURNING id INTO v_gate_pass_id;

  IF p_items IS NOT NULL AND jsonb_array_length(p_items) > 0 THEN
    FOR v_item_record IN
      SELECT * FROM jsonb_to_recordset(p_items) AS x(
        item_name TEXT,
        name TEXT,
        description TEXT,
        quantity TEXT,
        unit TEXT,
        sr_number TEXT,
        serial_number TEXT,
        photo_storage_path TEXT
      )
    LOOP
      INSERT INTO material_gate_pass_items (
        gate_pass_id, tenant_id, item_name, description,
        quantity, unit, sr_number, photo_storage_path
      ) VALUES (
        v_gate_pass_id, v_tenant_id,
        COALESCE(v_item_record.item_name, v_item_record.name, 'Unknown Item'),
        v_item_record.description,
        v_item_record.quantity,
        v_item_record.unit,
        COALESCE(v_item_record.sr_number, v_item_record.serial_number),
        v_item_record.photo_storage_path
      )
      RETURNING id INTO v_inserted_item_id;
    END LOOP;
  END IF;

  INSERT INTO gate_pass_audit_log (
    gate_pass_id, tenant_id, action, performed_by_name,
    details, ip_address
  ) VALUES (
    v_gate_pass_id, v_tenant_id, 'created', p_requester_name,
    jsonb_build_object('source', 'public_form', 'pass_type', p_pass_type),
    NULL
  );

  RETURN jsonb_build_object(
    'success', true,
    'gate_pass_id', v_gate_pass_id,
    'access_token', v_access_token,
    'reference_number', v_reference_number,
    'status', 'pending_acknowledgment'
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'error_code', 'INTERNAL_ERROR'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_public_gate_pass(TEXT, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, DATE, DATE, DATE, TEXT, TEXT, TEXT, TEXT, BOOLEAN, BOOLEAN, BOOLEAN, JSONB) TO anon;
GRANT EXECUTE ON FUNCTION public.submit_public_gate_pass(TEXT, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, DATE, DATE, DATE, TEXT, TEXT, TEXT, TEXT, BOOLEAN, BOOLEAN, BOOLEAN, JSONB) TO authenticated;
