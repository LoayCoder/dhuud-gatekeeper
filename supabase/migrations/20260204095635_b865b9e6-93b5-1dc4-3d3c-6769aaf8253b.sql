-- ============================================
-- PUBLIC MULTI-TENANT GATE PASS SYSTEM
-- Migration for public/anonymous gate pass requests
-- ============================================

-- ============================================
-- PHASE 1: Add Public Gate Pass Columns to material_gate_passes
-- ============================================

-- Add branch_id for branch-specific gate passes
ALTER TABLE public.material_gate_passes
ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id);

-- Add public access token for anonymous tracking
ALTER TABLE public.material_gate_passes
ADD COLUMN IF NOT EXISTS public_access_token UUID DEFAULT gen_random_uuid() UNIQUE;

-- Add flag to identify public requests
ALTER TABLE public.material_gate_passes
ADD COLUMN IF NOT EXISTS is_public_request BOOLEAN DEFAULT FALSE;

-- Add public requester identity fields
ALTER TABLE public.material_gate_passes
ADD COLUMN IF NOT EXISTS public_requester_name TEXT;

ALTER TABLE public.material_gate_passes
ADD COLUMN IF NOT EXISTS public_requester_phone TEXT;

ALTER TABLE public.material_gate_passes
ADD COLUMN IF NOT EXISTS public_requester_email TEXT;

ALTER TABLE public.material_gate_passes
ADD COLUMN IF NOT EXISTS public_requester_company TEXT;

-- Add token expiration (default 48 hours from creation)
ALTER TABLE public.material_gate_passes
ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMPTZ;

-- Create trigger to auto-set token expiration on insert
CREATE OR REPLACE FUNCTION public.set_gate_pass_token_expiry()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only set expiration for public requests
  IF NEW.is_public_request = true AND NEW.token_expires_at IS NULL THEN
    NEW.token_expires_at = NOW() + INTERVAL '48 hours';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_gate_pass_token_expiry_trigger ON public.material_gate_passes;
CREATE TRIGGER set_gate_pass_token_expiry_trigger
BEFORE INSERT ON public.material_gate_passes
FOR EACH ROW EXECUTE FUNCTION public.set_gate_pass_token_expiry();

-- ============================================
-- PHASE 2: Add Public Gate Pass Settings to Tenants
-- ============================================

ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS allow_public_gate_pass_requests BOOLEAN DEFAULT FALSE;

-- Add tenant-specific gate pass settings
ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS public_gate_pass_instructions TEXT;

ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS public_gate_pass_instructions_ar TEXT;

-- ============================================
-- PHASE 3: Add Branch Location Coordinates
-- ============================================

ALTER TABLE public.branches
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8);

ALTER TABLE public.branches
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);

ALTER TABLE public.branches
ADD COLUMN IF NOT EXISTS address TEXT;

ALTER TABLE public.branches
ADD COLUMN IF NOT EXISTS contact_phone TEXT;

ALTER TABLE public.branches
ADD COLUMN IF NOT EXISTS contact_email TEXT;

-- ============================================
-- PHASE 4: Rate Limiting Table for Public Endpoints
-- ============================================

CREATE TABLE IF NOT EXISTS public.public_request_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address INET NOT NULL,
  endpoint TEXT NOT NULL,
  request_count INTEGER DEFAULT 1,
  window_start TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(ip_address, endpoint, window_start)
);

-- Index for efficient rate limit lookups
CREATE INDEX IF NOT EXISTS idx_rate_limits_ip_endpoint
ON public.public_request_rate_limits(ip_address, endpoint, window_start);

-- Auto-cleanup old rate limit entries (keep 24 hours)
CREATE OR REPLACE FUNCTION public.cleanup_old_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.public_request_rate_limits
  WHERE window_start < NOW() - INTERVAL '24 hours';
END;
$$;

-- ============================================
-- PHASE 5: RLS Policies for Anonymous Access
-- ============================================

-- Allow anonymous users to view tenant info (for branding)
DROP POLICY IF EXISTS "Public can view tenant branding" ON public.tenants;
CREATE POLICY "Public can view tenant branding" ON public.tenants
FOR SELECT TO anon
USING (true);

-- Allow anonymous users to view branches for tenants that allow public gate passes
DROP POLICY IF EXISTS "Public can view branches for public gate pass tenants" ON public.branches;
CREATE POLICY "Public can view branches for public gate pass tenants" ON public.branches
FOR SELECT TO anon
USING (
  EXISTS (
    SELECT 1 FROM public.tenants t
    WHERE t.id = tenant_id
    AND t.allow_public_gate_pass_requests = true
  )
);

-- Allow anonymous INSERT for public gate pass requests
DROP POLICY IF EXISTS "Public can create gate passes for enabled tenants" ON public.material_gate_passes;
CREATE POLICY "Public can create gate passes for enabled tenants" ON public.material_gate_passes
FOR INSERT TO anon
WITH CHECK (
  is_public_request = true
  AND EXISTS (
    SELECT 1 FROM public.tenants t
    WHERE t.id = tenant_id
    AND t.allow_public_gate_pass_requests = true
  )
);

-- Allow anonymous SELECT using public_access_token (via x-public-token header validation in app)
DROP POLICY IF EXISTS "Public can view their own gate pass by token" ON public.material_gate_passes;
CREATE POLICY "Public can view their own gate pass by token" ON public.material_gate_passes
FOR SELECT TO anon
USING (
  is_public_request = true
  AND public_access_token IS NOT NULL
  AND (token_expires_at IS NULL OR token_expires_at > NOW())
);

-- Allow public to upload photos for public gate passes
DROP POLICY IF EXISTS "Public can upload gate pass photos" ON public.gate_pass_photos;
CREATE POLICY "Public can upload gate pass photos" ON public.gate_pass_photos
FOR INSERT TO anon
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.material_gate_passes mgp
    WHERE mgp.id = gate_pass_id
    AND mgp.is_public_request = true
    AND (mgp.token_expires_at IS NULL OR mgp.token_expires_at > NOW())
  )
);

-- ============================================
-- PHASE 6: Storage Bucket Policies for Anonymous Uploads
-- ============================================

-- Note: Storage policies need to be created via Supabase Dashboard or separate migration
-- The following is the policy definition for reference:
-- Policy: Allow anonymous uploads to gate-pass-photos bucket for public requests
-- INSERT policy on storage.objects for bucket_id = 'gate-pass-photos'
-- WITH CHECK: name LIKE 'public/%'

-- ============================================
-- PHASE 7: Public Gate Pass Notification Preferences
-- ============================================

-- Add notification preference columns
ALTER TABLE public.material_gate_passes
ADD COLUMN IF NOT EXISTS notify_by_whatsapp BOOLEAN DEFAULT TRUE;

ALTER TABLE public.material_gate_passes
ADD COLUMN IF NOT EXISTS notify_by_email BOOLEAN DEFAULT TRUE;

ALTER TABLE public.material_gate_passes
ADD COLUMN IF NOT EXISTS notify_by_sms BOOLEAN DEFAULT FALSE;

-- ============================================
-- PHASE 8: Create RPC for Public Gate Pass Submission
-- ============================================

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
  v_sequence INTEGER;
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

  -- 5. Generate reference number
  SELECT COUNT(*) + 1 INTO v_sequence
  FROM public.material_gate_passes
  WHERE tenant_id = v_tenant_id;

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

-- ============================================
-- PHASE 9: Create RPC for Public Gate Pass Status
-- ============================================

CREATE OR REPLACE FUNCTION public.get_public_gate_pass_status(
  p_tenant_slug TEXT,
  p_access_token UUID
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
BEGIN
  -- 1. Get tenant
  SELECT id INTO v_tenant_id
  FROM public.tenants
  WHERE slug = p_tenant_slug;

  IF v_tenant_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid tenant');
  END IF;

  -- 2. Get gate pass by token
  SELECT
    mgp.*,
    b.name as branch_name,
    b.location as branch_location,
    b.latitude,
    b.longitude,
    b.address as branch_address,
    b.contact_phone as branch_phone
  INTO v_gate_pass
  FROM public.material_gate_passes mgp
  LEFT JOIN public.branches b ON b.id = mgp.branch_id
  WHERE mgp.tenant_id = v_tenant_id
    AND mgp.public_access_token = p_access_token
    AND mgp.is_public_request = true
    AND mgp.deleted_at IS NULL;

  IF v_gate_pass IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Gate pass not found or expired');
  END IF;

  -- Check token expiration
  IF v_gate_pass.token_expires_at IS NOT NULL AND v_gate_pass.token_expires_at < NOW() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Access token has expired');
  END IF;

  -- 3. Get tenant branding
  SELECT name, logo_url, brand_color, public_gate_pass_instructions, public_gate_pass_instructions_ar
  INTO v_tenant
  FROM public.tenants
  WHERE id = v_tenant_id;

  -- 4. Return gate pass details
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
      'driver_name', v_gate_pass.driver_name,
      'driver_mobile', v_gate_pass.driver_mobile,
      'requester_name', v_gate_pass.public_requester_name,
      'requester_phone', v_gate_pass.public_requester_phone,
      'requester_company', v_gate_pass.public_requester_company,
      'created_at', v_gate_pass.created_at,
      'pm_approved_at', v_gate_pass.pm_approved_at,
      'safety_approved_at', v_gate_pass.safety_approved_at,
      'rejected_at', v_gate_pass.rejected_at,
      'rejection_reason', v_gate_pass.rejection_reason,
      'entry_time', v_gate_pass.entry_time,
      'exit_time', v_gate_pass.exit_time
    ),
    'branch', CASE WHEN v_gate_pass.branch_id IS NOT NULL THEN jsonb_build_object(
      'name', v_gate_pass.branch_name,
      'location', v_gate_pass.branch_location,
      'address', v_gate_pass.branch_address,
      'latitude', v_gate_pass.latitude,
      'longitude', v_gate_pass.longitude,
      'phone', v_gate_pass.branch_phone
    ) ELSE NULL END,
    'tenant', jsonb_build_object(
      'name', v_tenant.name,
      'logo_url', v_tenant.logo_url,
      'brand_color', v_tenant.brand_color,
      'instructions', v_tenant.public_gate_pass_instructions,
      'instructions_ar', v_tenant.public_gate_pass_instructions_ar
    )
  );
END;
$$;

-- Grant execute permission to anonymous users
GRANT EXECUTE ON FUNCTION public.get_public_gate_pass_status TO anon;

-- ============================================
-- PHASE 10: Indexes for Performance
-- ============================================

CREATE INDEX IF NOT EXISTS idx_material_gate_passes_public_token
ON public.material_gate_passes(public_access_token)
WHERE is_public_request = true AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_material_gate_passes_tenant_public
ON public.material_gate_passes(tenant_id, is_public_request, status)
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_material_gate_passes_branch
ON public.material_gate_passes(branch_id)
WHERE deleted_at IS NULL;

-- ============================================
-- PHASE 11: Update Status Enum for Public Workflow
-- ============================================

-- Add 'pending_mgmt' status for public requests (pending management acknowledgment)
ALTER TABLE public.material_gate_passes
DROP CONSTRAINT IF EXISTS material_gate_passes_status_check;

ALTER TABLE public.material_gate_passes
ADD CONSTRAINT material_gate_passes_status_check
CHECK (status IN (
  'pending_pm',
  'pending_safety',
  'pending_mgmt',
  'pending_contractor_approval',
  'pending_dept_approval',
  'acknowledged',
  'approved',
  'rejected',
  'used',
  'expired',
  'cancelled',
  'completed'
));

-- ============================================
-- PHASE 12: Enable Realtime for Public Gate Passes
-- ============================================

ALTER TABLE public.material_gate_passes REPLICA IDENTITY FULL;

-- Add to realtime publication if not already added
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND tablename = 'material_gate_passes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.material_gate_passes;
  END IF;
END;
$$;

-- ============================================
-- PHASE 13: Insert Notification Templates
-- ============================================

INSERT INTO public.notification_templates (
  tenant_id, slug, content_pattern, variable_keys, default_gateway, category, language, is_active, channel_type, email_subject
)
SELECT
  t.id,
  template.slug,
  template.content_pattern,
  template.variable_keys,
  'wasender',
  'gate_pass',
  'en',
  true,
  'both',
  template.email_subject
FROM public.tenants t
CROSS JOIN (
  VALUES
    ('public_gate_pass_submitted',
     'Your gate pass request {{reference_number}} has been submitted successfully. Track status: {{tracking_url}}',
     ARRAY['reference_number', 'tracking_url', 'requester_name', 'tenant_name'],
     'Gate Pass Request Submitted - {{reference_number}}'),
    ('public_gate_pass_acknowledged',
     'Your gate pass {{reference_number}} has been acknowledged by management. We will notify you once approved.',
     ARRAY['reference_number', 'requester_name', 'tenant_name'],
     'Gate Pass Acknowledged - {{reference_number}}'),
    ('public_gate_pass_approved',
     'Great news! Your gate pass {{reference_number}} has been approved. View your digital pass: {{tracking_url}}',
     ARRAY['reference_number', 'tracking_url', 'requester_name', 'tenant_name', 'pass_date'],
     'Gate Pass Approved - {{reference_number}}'),
    ('public_gate_pass_rejected',
     'Your gate pass request {{reference_number}} has been declined. Reason: {{rejection_reason}}',
     ARRAY['reference_number', 'rejection_reason', 'requester_name', 'tenant_name'],
     'Gate Pass Request Declined - {{reference_number}}'),
    ('staff_new_public_gate_pass',
     'New public gate pass request {{reference_number}} from {{requester_name}} ({{requester_company}}). Materials: {{material_description}}. Review: {{review_url}}',
     ARRAY['reference_number', 'requester_name', 'requester_company', 'material_description', 'review_url', 'branch_name'],
     'New Public Gate Pass Request - {{reference_number}}')
) AS template(slug, content_pattern, variable_keys, email_subject)
WHERE NOT EXISTS (
  SELECT 1 FROM public.notification_templates nt
  WHERE nt.tenant_id = t.id AND nt.slug = template.slug
);

-- Arabic templates
INSERT INTO public.notification_templates (
  tenant_id, slug, content_pattern, variable_keys, default_gateway, category, language, is_active, channel_type, email_subject
)
SELECT
  t.id,
  template.slug,
  template.content_pattern,
  template.variable_keys,
  'wasender',
  'gate_pass',
  'ar',
  true,
  'both',
  template.email_subject
FROM public.tenants t
CROSS JOIN (
  VALUES
    ('public_gate_pass_submitted',
     'تم تقديم طلب تصريح الدخول {{reference_number}} بنجاح. تتبع الحالة: {{tracking_url}}',
     ARRAY['reference_number', 'tracking_url', 'requester_name', 'tenant_name'],
     'تم تقديم طلب تصريح الدخول - {{reference_number}}'),
    ('public_gate_pass_approved',
     'أخبار رائعة! تمت الموافقة على تصريح الدخول {{reference_number}}. عرض التصريح الرقمي: {{tracking_url}}',
     ARRAY['reference_number', 'tracking_url', 'requester_name', 'tenant_name', 'pass_date'],
     'تمت الموافقة على تصريح الدخول - {{reference_number}}'),
    ('public_gate_pass_rejected',
     'تم رفض طلب تصريح الدخول {{reference_number}}. السبب: {{rejection_reason}}',
     ARRAY['reference_number', 'rejection_reason', 'requester_name', 'tenant_name'],
     'تم رفض طلب تصريح الدخول - {{reference_number}}')
) AS template(slug, content_pattern, variable_keys, email_subject)
WHERE NOT EXISTS (
  SELECT 1 FROM public.notification_templates nt
  WHERE nt.tenant_id = t.id AND nt.slug = template.slug AND nt.language = 'ar'
);
