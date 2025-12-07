-- Create asset_transfers table for tracking transfers, disposals, and decommissions
CREATE TABLE public.asset_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  asset_id UUID NOT NULL REFERENCES hsse_assets(id),
  
  -- Transfer type: location_transfer, disposal, decommission
  transfer_type TEXT NOT NULL CHECK (transfer_type IN ('location_transfer', 'disposal', 'decommission')),
  -- Status: pending, approved, rejected, in_transit, completed, cancelled
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'in_transit', 'completed', 'cancelled')),
  
  -- Source location (captured from asset at request time)
  from_branch_id UUID REFERENCES branches(id),
  from_site_id UUID REFERENCES sites(id),
  from_building_id UUID REFERENCES buildings(id),
  from_floor_zone_id UUID REFERENCES floors_zones(id),
  
  -- Destination location (for transfers only)
  to_branch_id UUID REFERENCES branches(id),
  to_site_id UUID REFERENCES sites(id),
  to_building_id UUID REFERENCES buildings(id),
  to_floor_zone_id UUID REFERENCES floors_zones(id),
  
  -- Disposal fields
  disposal_method TEXT CHECK (disposal_method IN ('sold', 'scrapped', 'donated', 'recycled', 'returned')),
  disposal_value DECIMAL(12,2),
  disposal_notes TEXT,
  disposal_certificate_path TEXT,
  
  -- Workflow tracking
  reason TEXT NOT NULL,
  notes TEXT,
  
  -- Request/Approval cycle
  requested_by UUID NOT NULL REFERENCES profiles(id),
  requested_at TIMESTAMPTZ DEFAULT now(),
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  completed_by UUID REFERENCES profiles(id),
  completed_at TIMESTAMPTZ,
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- Indexes for performance
CREATE INDEX idx_asset_transfers_tenant ON asset_transfers(tenant_id);
CREATE INDEX idx_asset_transfers_asset ON asset_transfers(asset_id);
CREATE INDEX idx_asset_transfers_status ON asset_transfers(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_asset_transfers_pending ON asset_transfers(tenant_id, status) 
  WHERE status = 'pending' AND deleted_at IS NULL;
CREATE INDEX idx_asset_transfers_requested_by ON asset_transfers(requested_by);

-- Enable RLS
ALTER TABLE asset_transfers ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view transfers in their tenant"
ON asset_transfers FOR SELECT
USING (tenant_id = get_auth_tenant_id() AND deleted_at IS NULL);

CREATE POLICY "HSSE users can create transfers"
ON asset_transfers FOR INSERT
WITH CHECK (tenant_id = get_auth_tenant_id() AND has_asset_management_access(auth.uid()));

CREATE POLICY "HSSE users can update transfers"
ON asset_transfers FOR UPDATE
USING (tenant_id = get_auth_tenant_id() AND deleted_at IS NULL AND has_asset_management_access(auth.uid()));

CREATE POLICY "Admins can delete transfers"
ON asset_transfers FOR DELETE
USING (has_role(auth.uid(), 'admin') AND tenant_id = get_auth_tenant_id());

-- Trigger for updated_at
CREATE TRIGGER update_asset_transfers_updated_at
  BEFORE UPDATE ON asset_transfers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();