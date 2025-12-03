
-- ============================================
-- PHASE 1: Dynamic Pricing Schema
-- ============================================

-- 1. Create modules master table (replaces enum-based approach)
CREATE TABLE public.modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  base_price_monthly INTEGER DEFAULT 0, -- price in cents
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  icon TEXT, -- lucide icon name for UI
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on modules
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;

-- Everyone can view active modules
CREATE POLICY "Modules are viewable by everyone"
ON public.modules FOR SELECT
USING (true);

-- Only admins can manage modules
CREATE POLICY "Admins can manage modules"
ON public.modules FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Seed modules from existing module_code enum
INSERT INTO public.modules (code, name, description, base_price_monthly, sort_order, icon) VALUES
  ('hsse_core', 'HSSE Core', 'Core health, safety, security & environment features', 0, 1, 'Shield'),
  ('visitor_management', 'Visitor Management', 'Complete visitor tracking and badge printing', 2500, 2, 'Users'),
  ('incidents', 'Incident Reporting', 'Incident tracking, investigation and reporting', 1500, 3, 'AlertTriangle'),
  ('audits', 'Audits & Inspections', 'Scheduled audits and inspection management', 2000, 4, 'ClipboardCheck'),
  ('reports_analytics', 'Reports & Analytics', 'Advanced reporting and analytics dashboards', 3000, 5, 'BarChart3'),
  ('api_access', 'API Access', 'REST API access for integrations', 5000, 6, 'Code');

-- 2. Add dynamic pricing columns to plans table
ALTER TABLE public.plans 
ADD COLUMN IF NOT EXISTS base_price_monthly INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS price_per_user INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS included_users INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS is_custom BOOLEAN DEFAULT false;

-- Update existing plans with dynamic pricing structure
UPDATE public.plans SET 
  base_price_monthly = price_monthly,
  price_per_user = CASE 
    WHEN name = 'starter' THEN 500
    WHEN name = 'pro' THEN 400
    WHEN name = 'enterprise' THEN 300
    ELSE 500
  END,
  included_users = CASE
    WHEN name = 'starter' THEN 3
    WHEN name = 'pro' THEN 10
    WHEN name = 'enterprise' THEN 25
    ELSE 1
  END;

-- 3. Add module_id FK to plan_modules (linking to new modules table)
ALTER TABLE public.plan_modules
ADD COLUMN IF NOT EXISTS module_id UUID REFERENCES public.modules(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS custom_price INTEGER, -- override module base price
ADD COLUMN IF NOT EXISTS included_in_base BOOLEAN DEFAULT false;

-- Populate module_id from existing module codes
UPDATE public.plan_modules pm
SET module_id = m.id
FROM public.modules m
WHERE pm.module::text = m.code;

-- 4. Create subscription_request_status enum
DO $$ BEGIN
  CREATE TYPE subscription_request_status AS ENUM (
    'pending',
    'under_review', 
    'approved',
    'declined',
    'modified',
    'canceled'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 5. Create subscription_request_type enum
DO $$ BEGIN
  CREATE TYPE subscription_request_type AS ENUM (
    'new',
    'upgrade',
    'downgrade',
    'modify',
    'cancel'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 6. Create subscription_requests table
CREATE TABLE public.subscription_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  request_type subscription_request_type NOT NULL DEFAULT 'new',
  
  -- Requested configuration
  requested_plan_id UUID REFERENCES public.plans(id),
  requested_user_limit INTEGER NOT NULL DEFAULT 5,
  requested_modules UUID[] DEFAULT '{}', -- array of module IDs
  
  -- Pricing (calculated at submission)
  calculated_base_price INTEGER DEFAULT 0,
  calculated_user_price INTEGER DEFAULT 0,
  calculated_module_price INTEGER DEFAULT 0,
  calculated_total_monthly INTEGER DEFAULT 0,
  
  -- Status tracking
  status subscription_request_status DEFAULT 'pending',
  
  -- Notes
  tenant_notes TEXT,
  admin_notes TEXT,
  
  -- Admin modifications (if approved with changes)
  approved_plan_id UUID REFERENCES public.plans(id),
  approved_user_limit INTEGER,
  approved_modules UUID[],
  approved_total_monthly INTEGER,
  
  -- Audit fields
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on subscription_requests
ALTER TABLE public.subscription_requests ENABLE ROW LEVEL SECURITY;

-- Tenants can view their own requests
CREATE POLICY "Tenants can view their own requests"
ON public.subscription_requests FOR SELECT
USING (tenant_id = get_auth_tenant_id());

-- Tenants can create requests for their tenant
CREATE POLICY "Tenants can create requests"
ON public.subscription_requests FOR INSERT
WITH CHECK (tenant_id = get_auth_tenant_id());

-- Tenants can cancel their pending requests
CREATE POLICY "Tenants can cancel pending requests"
ON public.subscription_requests FOR UPDATE
USING (tenant_id = get_auth_tenant_id() AND status = 'pending')
WITH CHECK (status = 'canceled');

-- Admins can manage all requests
CREATE POLICY "Admins can manage all requests"
ON public.subscription_requests FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- 7. Create function to calculate subscription price
CREATE OR REPLACE FUNCTION public.calculate_subscription_price(
  p_plan_id UUID,
  p_user_count INTEGER,
  p_module_ids UUID[]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan RECORD;
  v_base_price INTEGER := 0;
  v_user_price INTEGER := 0;
  v_module_price INTEGER := 0;
  v_extra_users INTEGER := 0;
  v_module RECORD;
BEGIN
  -- Get plan details
  SELECT * INTO v_plan FROM plans WHERE id = p_plan_id;
  
  IF v_plan IS NULL THEN
    RETURN jsonb_build_object('error', 'Plan not found');
  END IF;
  
  -- Base price from plan
  v_base_price := COALESCE(v_plan.base_price_monthly, v_plan.price_monthly, 0);
  
  -- Calculate extra user cost
  v_extra_users := GREATEST(0, p_user_count - COALESCE(v_plan.included_users, 1));
  v_user_price := v_extra_users * COALESCE(v_plan.price_per_user, 0);
  
  -- Calculate module costs (only for modules not included in base plan)
  FOR v_module IN 
    SELECT m.id, m.code, m.name, 
           COALESCE(pm.custom_price, m.base_price_monthly) as price,
           COALESCE(pm.included_in_base, false) as included
    FROM unnest(p_module_ids) AS mid
    JOIN modules m ON m.id = mid
    LEFT JOIN plan_modules pm ON pm.module_id = m.id AND pm.plan_id = p_plan_id
    WHERE m.is_active = true
  LOOP
    IF NOT v_module.included THEN
      v_module_price := v_module_price + v_module.price;
    END IF;
  END LOOP;
  
  RETURN jsonb_build_object(
    'base_price', v_base_price,
    'included_users', COALESCE(v_plan.included_users, 1),
    'extra_users', v_extra_users,
    'price_per_user', COALESCE(v_plan.price_per_user, 0),
    'user_price', v_user_price,
    'module_price', v_module_price,
    'total_monthly', v_base_price + v_user_price + v_module_price
  );
END;
$$;

-- 8. Create trigger to auto-add new modules to enterprise plan
CREATE OR REPLACE FUNCTION public.auto_add_module_to_plans()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_enterprise_plan_id UUID;
BEGIN
  -- Get enterprise plan ID
  SELECT id INTO v_enterprise_plan_id FROM plans WHERE name = 'enterprise' LIMIT 1;
  
  IF v_enterprise_plan_id IS NOT NULL THEN
    -- Add new module to enterprise plan as included in base
    INSERT INTO plan_modules (plan_id, module, module_id, included_in_base)
    VALUES (v_enterprise_plan_id, NEW.code::module_code, NEW.id, true)
    ON CONFLICT DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for auto-adding modules
DROP TRIGGER IF EXISTS trigger_auto_add_module ON public.modules;
CREATE TRIGGER trigger_auto_add_module
  AFTER INSERT ON public.modules
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_add_module_to_plans();

-- 9. Create updated_at trigger for new tables
CREATE TRIGGER update_modules_updated_at
  BEFORE UPDATE ON public.modules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_subscription_requests_updated_at
  BEFORE UPDATE ON public.subscription_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 10. Add subscription request events to existing enum
ALTER TYPE subscription_event_type ADD VALUE IF NOT EXISTS 'request_submitted';
ALTER TYPE subscription_event_type ADD VALUE IF NOT EXISTS 'request_approved';
ALTER TYPE subscription_event_type ADD VALUE IF NOT EXISTS 'request_declined';
ALTER TYPE subscription_event_type ADD VALUE IF NOT EXISTS 'request_modified';
