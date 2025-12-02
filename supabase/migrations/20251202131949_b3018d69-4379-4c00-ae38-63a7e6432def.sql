
/* =========================================
   0. PREREQUISITES
   ========================================= */

-- Sites table (required for visit_requests)
CREATE TABLE public.sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Function to get current user's tenant_id (security definer to avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.get_auth_tenant_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id FROM public.invitations 
  WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
  LIMIT 1
$$;

/* =========================================
   1. SECURITY & COMPLIANCE TABLES
   ========================================= */

-- Blacklist: The first line of defense
CREATE TABLE public.security_blacklist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  national_id TEXT,
  full_name TEXT,
  reason TEXT,
  listed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  listed_by UUID
);

CREATE UNIQUE INDEX idx_blacklist_identity ON public.security_blacklist(tenant_id, national_id);

-- Visitors: The "Reusable Identity"
CREATE TABLE public.visitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT,
  national_id TEXT,
  company_name TEXT,
  qr_code_token UUID DEFAULT gen_random_uuid() NOT NULL,
  is_active BOOLEAN DEFAULT true,
  last_visit_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Visit Requests: The "Event"
CREATE TYPE public.visit_status AS ENUM (
  'pending_security',
  'approved',
  'rejected',
  'checked_in',
  'checked_out',
  'expired'
);

CREATE TABLE public.visit_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  visitor_id UUID REFERENCES public.visitors(id) ON DELETE CASCADE NOT NULL,
  host_id UUID NOT NULL,
  site_id UUID REFERENCES public.sites(id) ON DELETE CASCADE NOT NULL,
  status public.visit_status DEFAULT 'pending_security',
  valid_from TIMESTAMP WITH TIME ZONE NOT NULL,
  valid_until TIMESTAMP WITH TIME ZONE NOT NULL,
  security_notes TEXT,
  approved_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

/* =========================================
   2. ROW LEVEL SECURITY
   ========================================= */

ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_blacklist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visit_requests ENABLE ROW LEVEL SECURITY;

-- Sites policies
CREATE POLICY "Users can view sites in their tenant" ON public.sites 
  FOR SELECT USING (tenant_id = get_auth_tenant_id());

CREATE POLICY "Admins can manage sites" ON public.sites 
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Blacklist policies (admin only)
CREATE POLICY "Admins can view blacklist" ON public.security_blacklist 
  FOR SELECT USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage blacklist" ON public.security_blacklist 
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Visitors policies
CREATE POLICY "Users can view visitors in their tenant" ON public.visitors 
  FOR SELECT USING (tenant_id = get_auth_tenant_id());

CREATE POLICY "Users can create visitors" ON public.visitors 
  FOR INSERT WITH CHECK (tenant_id = get_auth_tenant_id());

-- Visit requests policies
CREATE POLICY "Users can view visit requests in their tenant" ON public.visit_requests 
  FOR SELECT USING (tenant_id = get_auth_tenant_id());

CREATE POLICY "Users can create visit requests" ON public.visit_requests 
  FOR INSERT WITH CHECK (tenant_id = get_auth_tenant_id());

CREATE POLICY "Admins can update visit requests" ON public.visit_requests 
  FOR UPDATE USING (has_role(auth.uid(), 'admin'));
