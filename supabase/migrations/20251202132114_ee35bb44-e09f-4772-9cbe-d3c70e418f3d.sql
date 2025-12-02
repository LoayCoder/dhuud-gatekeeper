
-- Create branches table
CREATE TABLE public.branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  location TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view branches in their tenant" ON public.branches 
  FOR SELECT USING (tenant_id = get_auth_tenant_id());

CREATE POLICY "Admins can manage branches" ON public.branches 
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Add missing columns to sites
ALTER TABLE public.sites 
  ADD COLUMN branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  ADD COLUMN is_active BOOLEAN DEFAULT true;
