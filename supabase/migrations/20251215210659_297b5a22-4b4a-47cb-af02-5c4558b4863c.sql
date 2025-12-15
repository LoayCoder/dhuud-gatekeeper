-- Create gate_pass_items table for multiple items per gate pass
CREATE TABLE public.gate_pass_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gate_pass_id UUID NOT NULL REFERENCES material_gate_passes(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  description TEXT,
  quantity TEXT,
  unit TEXT,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- Create gate_pass_photos table for photo attachments
CREATE TABLE public.gate_pass_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gate_pass_id UUID NOT NULL REFERENCES material_gate_passes(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  uploaded_by UUID REFERENCES profiles(id),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.gate_pass_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gate_pass_photos ENABLE ROW LEVEL SECURITY;

-- RLS policies for gate_pass_items
CREATE POLICY "Admins can manage gate pass items"
ON public.gate_pass_items FOR ALL
USING (tenant_id = get_auth_tenant_id() AND is_admin(auth.uid()));

CREATE POLICY "Security users can view gate pass items"
ON public.gate_pass_items FOR SELECT
USING (tenant_id = get_auth_tenant_id() AND deleted_at IS NULL AND has_security_access(auth.uid()));

CREATE POLICY "Contractor reps can manage own items"
ON public.gate_pass_items FOR ALL
USING (tenant_id = get_auth_tenant_id() AND deleted_at IS NULL AND EXISTS (
  SELECT 1 FROM material_gate_passes mgp
  JOIN contractor_companies cc ON mgp.company_id = cc.id
  JOIN contractor_representatives cr ON cr.company_id = cc.id
  WHERE mgp.id = gate_pass_items.gate_pass_id
  AND cr.user_id = auth.uid()
  AND cr.deleted_at IS NULL
));

-- RLS policies for gate_pass_photos
CREATE POLICY "Admins can manage gate pass photos"
ON public.gate_pass_photos FOR ALL
USING (tenant_id = get_auth_tenant_id() AND is_admin(auth.uid()));

CREATE POLICY "Security users can view gate pass photos"
ON public.gate_pass_photos FOR SELECT
USING (tenant_id = get_auth_tenant_id() AND deleted_at IS NULL AND has_security_access(auth.uid()));

CREATE POLICY "Contractor reps can manage own photos"
ON public.gate_pass_photos FOR ALL
USING (tenant_id = get_auth_tenant_id() AND deleted_at IS NULL AND EXISTS (
  SELECT 1 FROM material_gate_passes mgp
  JOIN contractor_companies cc ON mgp.company_id = cc.id
  JOIN contractor_representatives cr ON cr.company_id = cc.id
  WHERE mgp.id = gate_pass_photos.gate_pass_id
  AND cr.user_id = auth.uid()
  AND cr.deleted_at IS NULL
));

-- Create storage bucket for gate pass photos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('gate-pass-photos', 'gate-pass-photos', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Authenticated users can upload gate pass photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'gate-pass-photos' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can view gate pass photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'gate-pass-photos' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete own gate pass photos"
ON storage.objects FOR DELETE
USING (bucket_id = 'gate-pass-photos' AND auth.uid() IS NOT NULL);

-- Indexes for performance
CREATE INDEX idx_gate_pass_items_gate_pass_id ON public.gate_pass_items(gate_pass_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_gate_pass_photos_gate_pass_id ON public.gate_pass_photos(gate_pass_id) WHERE deleted_at IS NULL;