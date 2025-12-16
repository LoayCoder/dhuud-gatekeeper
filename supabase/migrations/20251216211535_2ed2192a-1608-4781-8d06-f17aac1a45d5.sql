-- Create asset_scan_logs table for audit logging
CREATE TABLE public.asset_scan_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  asset_id UUID REFERENCES public.hsse_assets(id),
  asset_code TEXT NOT NULL,
  scanned_by UUID NOT NULL REFERENCES public.profiles(id),
  scan_action TEXT NOT NULL CHECK (scan_action IN ('view', 'inspect', 'maintenance', 'transfer')),
  scan_method TEXT NOT NULL CHECK (scan_method IN ('barcode', 'qrcode', 'manual')),
  scan_result TEXT NOT NULL CHECK (scan_result IN ('success', 'not_found', 'wrong_tenant')),
  device_info JSONB,
  location_data JSONB,
  is_offline_scan BOOLEAN DEFAULT false,
  synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.asset_scan_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view scan logs in their tenant
CREATE POLICY "Users can view scan logs in their tenant"
  ON public.asset_scan_logs FOR SELECT
  USING (tenant_id = get_auth_tenant_id());

-- RLS Policy: Users can insert scan logs for their tenant
CREATE POLICY "Users can insert scan logs for their tenant"
  ON public.asset_scan_logs FOR INSERT
  WITH CHECK (tenant_id = get_auth_tenant_id());

-- Indexes for performance
CREATE INDEX idx_asset_scan_logs_tenant_created 
  ON public.asset_scan_logs(tenant_id, created_at DESC);
CREATE INDEX idx_asset_scan_logs_asset 
  ON public.asset_scan_logs(asset_id, created_at DESC);
CREATE INDEX idx_asset_scan_logs_user 
  ON public.asset_scan_logs(scanned_by, created_at DESC);

-- Add barcode_value column to hsse_assets
ALTER TABLE public.hsse_assets ADD COLUMN IF NOT EXISTS barcode_value TEXT;

-- Populate barcode_value from asset_code for existing assets
UPDATE public.hsse_assets SET barcode_value = asset_code WHERE barcode_value IS NULL;

-- Create unique index for barcode lookup within tenant
CREATE UNIQUE INDEX idx_asset_barcode_tenant 
  ON public.hsse_assets(tenant_id, barcode_value) 
  WHERE deleted_at IS NULL AND barcode_value IS NOT NULL;