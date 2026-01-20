-- Create table for tracking asset hierarchy bulk import operations
CREATE TABLE public.asset_import_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  user_id UUID NOT NULL,
  branch_id UUID REFERENCES public.branches(id),
  
  -- Import details
  file_name TEXT,
  import_mode TEXT NOT NULL CHECK (import_mode IN ('insert_only', 'update_or_insert')),
  
  -- Counts
  categories_created INTEGER DEFAULT 0,
  categories_updated INTEGER DEFAULT 0,
  types_created INTEGER DEFAULT 0,
  types_updated INTEGER DEFAULT 0,
  subtypes_created INTEGER DEFAULT 0,
  subtypes_updated INTEGER DEFAULT 0,
  parts_created INTEGER DEFAULT 0,
  parts_updated INTEGER DEFAULT 0,
  total_rows_processed INTEGER DEFAULT 0,
  skipped_count INTEGER DEFAULT 0,
  
  -- Status
  status TEXT NOT NULL CHECK (status IN ('success', 'partial', 'failed')),
  error_messages JSONB,
  
  -- Timestamps (soft delete for HSSA compliance)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- Enable RLS for multi-tenant isolation
ALTER TABLE public.asset_import_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view import history for their tenant"
  ON public.asset_import_history FOR SELECT
  USING (
    deleted_at IS NULL AND
    tenant_id IN (
      SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert import history for their tenant"
  ON public.asset_import_history FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Index for performance on common queries
CREATE INDEX idx_asset_import_history_tenant_created 
  ON public.asset_import_history(tenant_id, created_at DESC)
  WHERE deleted_at IS NULL;

-- Add comment for documentation
COMMENT ON TABLE public.asset_import_history IS 'Audit log for asset hierarchy bulk import operations';