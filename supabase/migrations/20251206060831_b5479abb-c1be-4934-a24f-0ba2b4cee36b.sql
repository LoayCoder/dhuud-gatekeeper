
-- Create evidence_items table for comprehensive evidence management
CREATE TABLE public.evidence_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  
  -- Evidence Type Classification
  evidence_type TEXT NOT NULL CHECK (evidence_type IN ('photo', 'document', 'cctv', 'ptw', 'checklist', 'video_clip')),
  
  -- File Reference
  storage_path TEXT,
  file_name TEXT,
  file_size INTEGER,
  mime_type TEXT,
  
  -- Reference IDs (for PTW, Checklist)
  reference_id TEXT,
  reference_type TEXT CHECK (reference_type IS NULL OR reference_type IN ('ptw', 'checklist')),
  
  -- CCTV-Specific Fields (JSONB for up to 3 cameras)
  cctv_data JSONB,
  
  -- Description & Notes
  description TEXT,
  
  -- Review Comment (added by reviewer)
  review_comment TEXT,
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  
  -- Security Login Reference (traceability)
  uploaded_by UUID NOT NULL REFERENCES profiles(id),
  upload_session_id UUID REFERENCES user_activity_logs(id),
  
  -- Audit Fields
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.evidence_items ENABLE ROW LEVEL SECURITY;

-- Performance indexes
CREATE INDEX idx_evidence_items_incident ON evidence_items(incident_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_evidence_items_tenant_type ON evidence_items(tenant_id, evidence_type) WHERE deleted_at IS NULL;
CREATE INDEX idx_evidence_items_uploaded_by ON evidence_items(uploaded_by);
CREATE INDEX idx_evidence_items_session ON evidence_items(upload_session_id);

-- RLS Policies
CREATE POLICY "Users can view evidence in their tenant"
ON evidence_items FOR SELECT
USING (tenant_id = get_auth_tenant_id() AND deleted_at IS NULL);

CREATE POLICY "HSSE users can create evidence"
ON evidence_items FOR INSERT
WITH CHECK (tenant_id = get_auth_tenant_id() AND has_hsse_incident_access(auth.uid()));

CREATE POLICY "HSSE users can update evidence"
ON evidence_items FOR UPDATE
USING (tenant_id = get_auth_tenant_id() AND deleted_at IS NULL AND has_hsse_incident_access(auth.uid()));

CREATE POLICY "Admins can delete evidence"
ON evidence_items FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_auth_tenant_id());

-- Updated_at trigger
CREATE TRIGGER update_evidence_items_updated_at
BEFORE UPDATE ON evidence_items
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
