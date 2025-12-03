-- Phase 1: Complete SaaS Platform Database Foundation

-- 1.1 Create Plans Table
CREATE TABLE public.plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE, -- 'starter', 'pro', 'enterprise'
  display_name TEXT NOT NULL,
  description TEXT,
  price_monthly INTEGER NOT NULL DEFAULT 0, -- in cents
  price_yearly INTEGER, -- in cents (optional annual discount)
  max_users INTEGER NOT NULL DEFAULT 5,
  stripe_price_id_monthly TEXT,
  stripe_price_id_yearly TEXT,
  is_active BOOLEAN DEFAULT true,
  features JSONB DEFAULT '[]'::jsonb, -- Feature list for display
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 1.2 Create Module Code Enum and Plan Modules Table
CREATE TYPE module_code AS ENUM (
  'hsse_core', 
  'visitor_management', 
  'incidents', 
  'audits', 
  'reports_analytics',
  'api_access',
  'priority_support'
);

CREATE TABLE public.plan_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID REFERENCES public.plans(id) ON DELETE CASCADE NOT NULL,
  module module_code NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(plan_id, module)
);

-- 1.3 Create Support Ticket Enums
CREATE TYPE ticket_status AS ENUM ('open', 'in_progress', 'waiting_customer', 'resolved', 'closed');
CREATE TYPE ticket_priority AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE ticket_category AS ENUM ('billing', 'technical', 'feature_request', 'general');

-- 1.4 Create Support Tickets Table
CREATE TABLE public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number SERIAL,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  created_by UUID NOT NULL,
  assigned_to UUID,
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  status ticket_status DEFAULT 'open',
  priority ticket_priority DEFAULT 'medium',
  category ticket_category DEFAULT 'general',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ
);

-- 1.5 Create Ticket Messages Table
CREATE TABLE public.ticket_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES public.support_tickets(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID NOT NULL,
  message TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT false, -- Admin-only notes
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 1.6 Extend Tenants Table with Subscription/Trial columns
ALTER TABLE public.tenants 
  ADD COLUMN plan_id UUID REFERENCES public.plans(id),
  ADD COLUMN stripe_customer_id TEXT,
  ADD COLUMN stripe_subscription_id TEXT,
  ADD COLUMN subscription_status TEXT DEFAULT 'inactive',
  ADD COLUMN trial_start_date TIMESTAMPTZ,
  ADD COLUMN trial_end_date TIMESTAMPTZ,
  ADD COLUMN billing_email TEXT,
  ADD COLUMN max_users_override INTEGER;

-- 1.7 Create updated_at trigger for support_tickets
CREATE TRIGGER update_support_tickets_updated_at
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 1.8 Enable RLS on all new tables
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;

-- 1.9 RLS Policies for Plans (public read, admin write)
CREATE POLICY "Plans are viewable by everyone"
  ON public.plans FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage plans"
  ON public.plans FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 1.10 RLS Policies for Plan Modules (public read, admin write)
CREATE POLICY "Plan modules are viewable by everyone"
  ON public.plan_modules FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage plan modules"
  ON public.plan_modules FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 1.11 RLS Policies for Support Tickets
CREATE POLICY "Users can view tickets in their tenant"
  ON public.support_tickets FOR SELECT
  USING (tenant_id = get_auth_tenant_id());

CREATE POLICY "Users can create tickets for their tenant"
  ON public.support_tickets FOR INSERT
  WITH CHECK (tenant_id = get_auth_tenant_id() AND created_by = auth.uid());

CREATE POLICY "Admins can view all tickets"
  ON public.support_tickets FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage all tickets"
  ON public.support_tickets FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 1.12 RLS Policies for Ticket Messages
CREATE POLICY "Users can view messages for tickets in their tenant"
  ON public.ticket_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.support_tickets st 
      WHERE st.id = ticket_id AND st.tenant_id = get_auth_tenant_id()
    )
    AND (is_internal = false OR has_role(auth.uid(), 'admin'::app_role))
  );

CREATE POLICY "Users can add messages to their tickets"
  ON public.ticket_messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.support_tickets st 
      WHERE st.id = ticket_id AND st.tenant_id = get_auth_tenant_id()
    )
  );

CREATE POLICY "Admins can manage all messages"
  ON public.ticket_messages FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 1.13 Create function to check user limit
CREATE OR REPLACE FUNCTION public.check_user_limit(p_tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_users INTEGER;
  max_allowed INTEGER;
BEGIN
  SELECT COUNT(*) INTO current_users FROM profiles WHERE tenant_id = p_tenant_id;
  
  SELECT COALESCE(t.max_users_override, p.max_users, 5) INTO max_allowed
  FROM tenants t 
  LEFT JOIN plans p ON t.plan_id = p.id
  WHERE t.id = p_tenant_id;
  
  RETURN current_users < max_allowed;
END;
$$;

-- 1.14 Create function to get tenant's modules
CREATE OR REPLACE FUNCTION public.get_tenant_modules(p_tenant_id UUID)
RETURNS module_code[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  modules module_code[];
BEGIN
  SELECT ARRAY_AGG(pm.module) INTO modules
  FROM tenants t
  JOIN plan_modules pm ON pm.plan_id = t.plan_id
  WHERE t.id = p_tenant_id;
  
  RETURN COALESCE(modules, ARRAY[]::module_code[]);
END;
$$;

-- 1.15 Seed Default Plans
INSERT INTO public.plans (name, display_name, description, price_monthly, price_yearly, max_users, sort_order, features) VALUES
('starter', 'Starter', 'Perfect for small teams getting started', 0, 0, 5, 1, 
  '["Up to 5 users", "HSSE Core features", "Email support"]'::jsonb),
('pro', 'Professional', 'For growing organizations', 4900, 49000, 25, 2,
  '["Up to 25 users", "All Starter features", "Visitor Management", "Incidents & Audits", "Priority support"]'::jsonb),
('enterprise', 'Enterprise', 'For large organizations with custom needs', 14900, 149000, 999999, 3,
  '["Unlimited users", "All Pro features", "Reports & Analytics", "API Access", "Dedicated support", "Custom integrations"]'::jsonb);

-- 1.16 Seed Plan Modules
-- Starter modules
INSERT INTO public.plan_modules (plan_id, module)
SELECT p.id, m.module FROM public.plans p, (VALUES ('hsse_core'::module_code)) AS m(module) WHERE p.name = 'starter';

-- Pro modules
INSERT INTO public.plan_modules (plan_id, module)
SELECT p.id, m.module FROM public.plans p, 
  (VALUES ('hsse_core'::module_code), ('visitor_management'::module_code), ('incidents'::module_code), ('audits'::module_code), ('priority_support'::module_code)) AS m(module) 
WHERE p.name = 'pro';

-- Enterprise modules (all)
INSERT INTO public.plan_modules (plan_id, module)
SELECT p.id, m.module FROM public.plans p, 
  (VALUES ('hsse_core'::module_code), ('visitor_management'::module_code), ('incidents'::module_code), ('audits'::module_code), ('reports_analytics'::module_code), ('api_access'::module_code), ('priority_support'::module_code)) AS m(module) 
WHERE p.name = 'enterprise';

-- 1.17 Add index for performance
CREATE INDEX idx_support_tickets_tenant ON public.support_tickets(tenant_id);
CREATE INDEX idx_support_tickets_status ON public.support_tickets(status);
CREATE INDEX idx_ticket_messages_ticket ON public.ticket_messages(ticket_id);