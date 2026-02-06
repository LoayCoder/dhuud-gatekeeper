-- ==============================================================
-- Public Gate Pass Enhancement: Multi-Item Support with Photos
-- ==============================================================

-- 1. Add vehicle plate structured columns to material_gate_passes
ALTER TABLE material_gate_passes
ADD COLUMN IF NOT EXISTS vehicle_plate_letters TEXT,
ADD COLUMN IF NOT EXISTS vehicle_plate_numbers TEXT;

-- Add comment for documentation
COMMENT ON COLUMN material_gate_passes.vehicle_plate_letters IS 'Separated vehicle plate letters (e.g., ABC)';
COMMENT ON COLUMN material_gate_passes.vehicle_plate_numbers IS 'Separated vehicle plate numbers (e.g., 1234)';

-- 2. Create public_gate_pass_items table
CREATE TABLE IF NOT EXISTS public.public_gate_pass_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gate_pass_id UUID NOT NULL REFERENCES material_gate_passes(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  sr_number TEXT,
  item_name TEXT NOT NULL,
  description TEXT,
  quantity TEXT,
  unit TEXT,
  photo_storage_path TEXT,
  photo_file_name TEXT,
  photo_file_size INTEGER,
  photo_mime_type TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_public_gate_pass_items_gate_pass ON public_gate_pass_items(gate_pass_id);
CREATE INDEX IF NOT EXISTS idx_public_gate_pass_items_tenant ON public_gate_pass_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_public_gate_pass_items_deleted ON public_gate_pass_items(deleted_at) WHERE deleted_at IS NULL;

-- Enable RLS
ALTER TABLE public_gate_pass_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for public_gate_pass_items
-- Authenticated users with appropriate roles can view items
CREATE POLICY "Staff can view public gate pass items"
ON public_gate_pass_items FOR SELECT
TO authenticated
USING (
  tenant_id = get_auth_tenant_id()
  AND deleted_at IS NULL
);

-- 3. Create storage bucket for public gate pass photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'public-gate-pass-photos',
  'public-gate-pass-photos',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- 4. Storage policies for anonymous uploads
-- Allow anonymous users to upload photos
CREATE POLICY "Anon can upload public gate pass photos"
ON storage.objects FOR INSERT
TO anon
WITH CHECK (bucket_id = 'public-gate-pass-photos');

-- Allow public read access
CREATE POLICY "Public read access for gate pass photos"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'public-gate-pass-photos');

-- 5. Update submit_public_gate_pass function to handle items
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
  p_time_window_start TIME DEFAULT NULL,
  p_time_window_end TIME DEFAULT NULL,
  p_notify_whatsapp BOOLEAN DEFAULT true,
  p_notify_email BOOLEAN DEFAULT true,
  p_notify_sms BOOLEAN DEFAULT false,
  p_client_ip TEXT DEFAULT NULL,
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
BEGIN
  -- Validate required fields
  IF p_requester_name IS NULL OR p_requester_phone IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Requester name and phone are required'
    );
  END IF;

  -- Get tenant by slug
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

  -- Rate limiting: Check submissions from this IP in the last hour
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

  -- Generate unique access token and reference number
  v_access_token := gen_random_uuid();
  v_reference_number := 'PUB-' || to_char(now(), 'YYYYMMDD') || '-' || substring(v_access_token::text, 1, 8);

  -- Combine plate letters and numbers for legacy column
  v_combined_plate := NULLIF(TRIM(COALESCE(p_vehicle_plate_letters, '') || ' ' || COALESCE(p_vehicle_plate_numbers, '')), '');
  IF v_combined_plate IS NULL THEN
    v_combined_plate := p_vehicle_plate;
  END IF;

  -- Build material description from items if provided
  IF jsonb_array_length(p_items) > 0 THEN
    SELECT STRING_AGG(item->>'item_name', ', ')
    INTO v_material_description
    FROM jsonb_array_elements(p_items) AS item;
  ELSE
    v_material_description := p_material_description;
  END IF;

  -- Create gate pass
  INSERT INTO material_gate_passes (
    tenant_id,
    branch_id,
    reference_number,
    pass_type,
    material_description,
    quantity,
    vehicle_plate,
    vehicle_plate_letters,
    vehicle_plate_numbers,
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
    v_material_description,
    p_quantity,
    v_combined_plate,
    p_vehicle_plate_letters,
    p_vehicle_plate_numbers,
    p_driver_name,
    p_driver_mobile,
    p_pass_date,
    p_time_window_start,
    p_time_window_end,
    'pending_club_mgmt_ack',
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

  -- Insert items if provided
  IF jsonb_array_length(p_items) > 0 THEN
    FOR v_item_record IN SELECT * FROM jsonb_to_recordset(p_items) AS x(
      sr_number TEXT,
      item_name TEXT,
      description TEXT,
      quantity TEXT,
      unit TEXT,
      photo_path TEXT,
      photo_file_name TEXT,
      photo_file_size INTEGER,
      photo_mime_type TEXT
    )
    LOOP
      INSERT INTO public_gate_pass_items (
        gate_pass_id,
        tenant_id,
        sr_number,
        item_name,
        description,
        quantity,
        unit,
        photo_storage_path,
        photo_file_name,
        photo_file_size,
        photo_mime_type
      ) VALUES (
        v_gate_pass_id,
        v_tenant_id,
        v_item_record.sr_number,
        v_item_record.item_name,
        v_item_record.description,
        v_item_record.quantity,
        v_item_record.unit,
        v_item_record.photo_path,
        v_item_record.photo_file_name,
        v_item_record.photo_file_size,
        v_item_record.photo_mime_type
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

-- 6. Update get_public_gate_pass_status to return items
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
  -- Get Supabase URL for constructing photo URLs
  v_supabase_url := current_setting('app.settings.supabase_url', true);
  IF v_supabase_url IS NULL THEN
    v_supabase_url := 'https://xdlowvfzhvjzbtgvurzj.supabase.co';
  END IF;

  -- Get tenant
  SELECT id INTO v_tenant_id
  FROM tenants
  WHERE slug = p_tenant_slug
    AND deleted_at IS NULL;

  IF v_tenant_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Organization not found'
    );
  END IF;

  -- Get gate pass
  SELECT
    mgp.id,
    mgp.reference_number,
    mgp.status,
    mgp.pass_type,
    mgp.pass_date,
    mgp.time_window_start,
    mgp.time_window_end,
    mgp.material_description,
    mgp.quantity,
    mgp.vehicle_plate,
    mgp.vehicle_plate_letters,
    mgp.vehicle_plate_numbers,
    mgp.driver_name,
    mgp.driver_mobile,
    mgp.public_requester_name AS requester_name,
    mgp.public_requester_phone AS requester_phone,
    mgp.public_requester_company AS requester_company,
    mgp.created_at,
    mgp.pm_approved_at,
    mgp.safety_approved_at,
    mgp.rejected_at,
    mgp.rejection_reason,
    mgp.entry_time,
    mgp.exit_time,
    mgp.branch_id
  INTO v_gate_pass
  FROM material_gate_passes mgp
  WHERE mgp.tenant_id = v_tenant_id
    AND mgp.public_access_token = p_access_token::uuid
    AND mgp.is_public_request = true
    AND mgp.token_expires_at > now()
    AND mgp.deleted_at IS NULL;

  IF v_gate_pass.id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Gate pass not found or expired'
    );
  END IF;

  -- Get items with photo URLs
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', i.id,
      'sr_number', i.sr_number,
      'item_name', i.item_name,
      'description', i.description,
      'quantity', i.quantity,
      'unit', i.unit,
      'photo_url', CASE 
        WHEN i.photo_storage_path IS NOT NULL 
        THEN v_supabase_url || '/storage/v1/object/public/public-gate-pass-photos/' || i.photo_storage_path
        ELSE NULL 
      END
    )
  ), '[]'::jsonb)
  INTO v_items
  FROM public_gate_pass_items i
  WHERE i.gate_pass_id = v_gate_pass.id
    AND i.deleted_at IS NULL;

  -- Get branch info if exists
  IF v_gate_pass.branch_id IS NOT NULL THEN
    SELECT
      b.name,
      b.location,
      b.address,
      b.latitude,
      b.longitude,
      b.contact_phone AS phone
    INTO v_branch
    FROM branches b
    WHERE b.id = v_gate_pass.branch_id
      AND b.deleted_at IS NULL;
  END IF;

  -- Get tenant info
  SELECT
    t.name,
    t.logo_url,
    t.brand_color,
    t.public_gate_pass_instructions AS instructions,
    t.public_gate_pass_instructions_ar AS instructions_ar
  INTO v_tenant
  FROM tenants t
  WHERE t.id = v_tenant_id;

  RETURN jsonb_build_object(
    'success', true,
    'gate_pass', jsonb_build_object(
      'id', v_gate_pass.id,
      'reference_number', v_gate_pass.reference_number,
      'status', v_gate_pass.status,
      'pass_type', v_gate_pass.pass_type,
      'pass_date', v_gate_pass.pass_date,
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
      'name', v_branch.name,
      'location', v_branch.location,
      'address', v_branch.address,
      'latitude', v_branch.latitude,
      'longitude', v_branch.longitude,
      'phone', v_branch.phone
    ) ELSE NULL END,
    'tenant', jsonb_build_object(
      'name', v_tenant.name,
      'logo_url', v_tenant.logo_url,
      'brand_color', v_tenant.brand_color,
      'instructions', v_tenant.instructions,
      'instructions_ar', v_tenant.instructions_ar
    )
  );
END;
$$;