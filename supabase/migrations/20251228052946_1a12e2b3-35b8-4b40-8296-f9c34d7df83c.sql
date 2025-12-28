-- Asset Approval Workflow Configuration Table
CREATE TABLE public.asset_approval_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  
  workflow_type TEXT NOT NULL CHECK (workflow_type IN ('transfer', 'disposal', 'purchase')),
  name TEXT NOT NULL,
  description TEXT,
  
  -- Threshold for auto-approval (below this value, no approval needed)
  auto_approve_below_amount NUMERIC(15,2),
  currency TEXT NOT NULL DEFAULT 'SAR',
  
  -- Whether this workflow is active
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  -- Escalation settings
  escalation_enabled BOOLEAN NOT NULL DEFAULT true,
  escalation_hours INTEGER NOT NULL DEFAULT 48,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  deleted_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES public.profiles(id),
  
  UNIQUE(tenant_id, workflow_type, name)
);

-- Enable RLS
ALTER TABLE public.asset_approval_configs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for approval configs
CREATE POLICY "Users can view approval configs for their tenant"
ON public.asset_approval_configs FOR SELECT
USING (
  tenant_id IN (
    SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "HSSE managers can manage approval configs"
ON public.asset_approval_configs FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_role_assignments ura
    JOIN public.roles r ON r.id = ura.role_id
    WHERE ura.user_id = auth.uid() 
      AND ura.tenant_id = asset_approval_configs.tenant_id
      AND r.code IN ('hsse_manager', 'admin')
  )
);

-- Asset Approval Levels Table (multi-level approval chain)
CREATE TABLE public.asset_approval_levels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  config_id UUID NOT NULL REFERENCES public.asset_approval_configs(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  
  level_order INTEGER NOT NULL DEFAULT 1,
  name TEXT NOT NULL,
  
  -- Who can approve at this level
  required_role TEXT,  -- Role code that can approve
  specific_user_id UUID REFERENCES public.profiles(id),  -- Or a specific user
  
  -- Timeout for this level
  timeout_hours INTEGER NOT NULL DEFAULT 24,
  
  -- Min/max amount thresholds for this level
  min_amount NUMERIC(15,2),
  max_amount NUMERIC(15,2),
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  deleted_at TIMESTAMP WITH TIME ZONE,
  
  UNIQUE(config_id, level_order)
);

-- Enable RLS
ALTER TABLE public.asset_approval_levels ENABLE ROW LEVEL SECURITY;

-- RLS Policies for approval levels
CREATE POLICY "Users can view approval levels for their tenant"
ON public.asset_approval_levels FOR SELECT
USING (
  tenant_id IN (
    SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "HSSE managers can manage approval levels"
ON public.asset_approval_levels FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_role_assignments ura
    JOIN public.roles r ON r.id = ura.role_id
    WHERE ura.user_id = auth.uid() 
      AND ura.tenant_id = asset_approval_levels.tenant_id
      AND r.code IN ('hsse_manager', 'admin')
  )
);

-- Asset Purchase Requests Table
CREATE TABLE public.asset_purchase_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  
  request_number TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  
  -- Asset details
  asset_category_id UUID REFERENCES public.asset_categories(id),
  asset_type_id UUID REFERENCES public.asset_types(id),
  quantity INTEGER NOT NULL DEFAULT 1,
  
  -- Financial
  estimated_cost NUMERIC(15,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'SAR',
  budget_code TEXT,
  justification TEXT,
  
  -- Vendor info
  vendor_name TEXT,
  vendor_quote_path TEXT,
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled', 'ordered', 'received')),
  current_approval_level INTEGER NOT NULL DEFAULT 1,
  
  -- Workflow
  approval_config_id UUID REFERENCES public.asset_approval_configs(id),
  
  -- Request metadata
  requested_by UUID NOT NULL REFERENCES public.profiles(id),
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Final decision
  final_decision_at TIMESTAMP WITH TIME ZONE,
  final_decision_by UUID REFERENCES public.profiles(id),
  rejection_reason TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.asset_purchase_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view purchase requests for their tenant"
ON public.asset_purchase_requests FOR SELECT
USING (
  tenant_id IN (
    SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can create purchase requests"
ON public.asset_purchase_requests FOR INSERT
WITH CHECK (
  tenant_id IN (
    SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
  ) AND requested_by = auth.uid()
);

CREATE POLICY "Users can update own pending requests or managers can update"
ON public.asset_purchase_requests FOR UPDATE
USING (
  tenant_id IN (
    SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
  ) AND (
    requested_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.user_role_assignments ura
      JOIN public.roles r ON r.id = ura.role_id
      WHERE ura.user_id = auth.uid() 
        AND ura.tenant_id = asset_purchase_requests.tenant_id
        AND r.code IN ('manager', 'hsse_manager', 'admin')
    )
  )
);

-- Asset Purchase Approval History
CREATE TABLE public.asset_purchase_approvals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID NOT NULL REFERENCES public.asset_purchase_requests(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  
  approval_level INTEGER NOT NULL,
  approver_id UUID NOT NULL REFERENCES public.profiles(id),
  decision TEXT NOT NULL CHECK (decision IN ('approved', 'rejected', 'returned')),
  notes TEXT,
  
  decided_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.asset_purchase_approvals ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view approvals for their tenant"
ON public.asset_purchase_approvals FOR SELECT
USING (
  tenant_id IN (
    SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Approvers can insert approvals"
ON public.asset_purchase_approvals FOR INSERT
WITH CHECK (
  tenant_id IN (
    SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
  ) AND approver_id = auth.uid()
);

-- Update trigger for asset_approval_configs
CREATE TRIGGER update_asset_approval_configs_updated_at
BEFORE UPDATE ON public.asset_approval_configs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Update trigger for asset_purchase_requests
CREATE TRIGGER update_asset_purchase_requests_updated_at
BEFORE UPDATE ON public.asset_purchase_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Generate purchase request number
CREATE OR REPLACE FUNCTION public.generate_purchase_request_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  year_suffix TEXT;
  sequence_num INTEGER;
BEGIN
  year_suffix := TO_CHAR(NOW(), 'YYYY');
  
  SELECT COALESCE(MAX(
    CAST(NULLIF(SPLIT_PART(request_number, '-', 3), '') AS INTEGER)
  ), 0) + 1
  INTO sequence_num
  FROM asset_purchase_requests
  WHERE tenant_id = NEW.tenant_id
    AND request_number LIKE 'APR-' || year_suffix || '-%';
  
  NEW.request_number := 'APR-' || year_suffix || '-' || LPAD(sequence_num::text, 4, '0');
  RETURN NEW;
END;
$$;

CREATE TRIGGER generate_purchase_request_number_trigger
BEFORE INSERT ON public.asset_purchase_requests
FOR EACH ROW
EXECUTE FUNCTION public.generate_purchase_request_number();