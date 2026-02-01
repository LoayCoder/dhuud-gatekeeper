-- Create gate_pass_item_photos table to store photos linked to specific items
CREATE TABLE gate_pass_item_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES gate_pass_items(id) ON DELETE CASCADE,
  gate_pass_id UUID NOT NULL REFERENCES material_gate_passes(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  branch_id UUID REFERENCES branches(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- Indexes for performance
CREATE INDEX idx_gate_pass_item_photos_item_id ON gate_pass_item_photos(item_id);
CREATE INDEX idx_gate_pass_item_photos_gate_pass_id ON gate_pass_item_photos(gate_pass_id);
CREATE INDEX idx_gate_pass_item_photos_tenant_id ON gate_pass_item_photos(tenant_id);

-- RLS policies
ALTER TABLE gate_pass_item_photos ENABLE ROW LEVEL SECURITY;

-- Tenant isolation policy for SELECT
CREATE POLICY "Tenant isolation for item photos select"
  ON gate_pass_item_photos
  FOR SELECT
  USING (tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid);

-- Users can insert their own item photos
CREATE POLICY "Users can insert own item photos"
  ON gate_pass_item_photos
  FOR INSERT
  WITH CHECK (
    tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
    AND uploaded_by = auth.uid()
  );

-- Users can update their own photos
CREATE POLICY "Users can update own item photos"
  ON gate_pass_item_photos
  FOR UPDATE
  USING (
    tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
    AND uploaded_by = auth.uid()
  );

-- Users can delete their own photos (soft delete)
CREATE POLICY "Users can delete own item photos"
  ON gate_pass_item_photos
  FOR DELETE
  USING (
    tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
    AND uploaded_by = auth.uid()
  );