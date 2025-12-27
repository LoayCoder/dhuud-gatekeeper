-- =============================================
-- Spare Parts Inventory Tables
-- =============================================

-- Part stock transactions for audit trail
CREATE TABLE public.part_stock_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  part_id UUID NOT NULL REFERENCES public.maintenance_parts(id),
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('receipt', 'issue', 'adjustment', 'return')),
  quantity INTEGER NOT NULL,
  previous_quantity INTEGER,
  new_quantity INTEGER,
  reference_type TEXT,
  reference_id UUID,
  unit_cost DECIMAL(12,2),
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- Purchase order management
CREATE TABLE public.part_purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  po_number TEXT NOT NULL,
  supplier_name TEXT,
  supplier_contact TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'received', 'cancelled')),
  order_date DATE,
  expected_delivery_date DATE,
  actual_delivery_date DATE,
  total_amount DECIMAL(12,2),
  currency TEXT DEFAULT 'SAR',
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id),
  approved_by UUID REFERENCES public.profiles(id),
  approved_at TIMESTAMPTZ,
  received_by UUID REFERENCES public.profiles(id),
  received_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- Purchase order line items
CREATE TABLE public.part_purchase_order_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  purchase_order_id UUID NOT NULL REFERENCES public.part_purchase_orders(id) ON DELETE CASCADE,
  part_id UUID NOT NULL REFERENCES public.maintenance_parts(id),
  quantity_ordered INTEGER NOT NULL,
  quantity_received INTEGER DEFAULT 0,
  unit_cost DECIMAL(12,2),
  created_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- Enable RLS on all tables
ALTER TABLE public.part_stock_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.part_purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.part_purchase_order_lines ENABLE ROW LEVEL SECURITY;

-- RLS Policies for part_stock_transactions
CREATE POLICY "Tenant isolation for part_stock_transactions"
  ON public.part_stock_transactions
  FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

-- RLS Policies for part_purchase_orders
CREATE POLICY "Tenant isolation for part_purchase_orders"
  ON public.part_purchase_orders
  FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

-- RLS Policies for part_purchase_order_lines
CREATE POLICY "Tenant isolation for part_purchase_order_lines"
  ON public.part_purchase_order_lines
  FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

-- Indexes
CREATE INDEX idx_part_stock_transactions_part ON public.part_stock_transactions(part_id);
CREATE INDEX idx_part_stock_transactions_tenant ON public.part_stock_transactions(tenant_id);
CREATE INDEX idx_part_purchase_orders_tenant ON public.part_purchase_orders(tenant_id);
CREATE INDEX idx_part_purchase_orders_status ON public.part_purchase_orders(status);
CREATE INDEX idx_part_purchase_order_lines_po ON public.part_purchase_order_lines(purchase_order_id);

-- Trigger for updated_at on purchase orders
CREATE TRIGGER update_part_purchase_orders_updated_at
  BEFORE UPDATE ON public.part_purchase_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();