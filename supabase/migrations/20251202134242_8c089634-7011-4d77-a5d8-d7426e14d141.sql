/* =========================================
   1. CREATE PROFILES (The Missing Link)
   ========================================= */
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  
  -- Identity (role is in user_roles table, not here for security)
  full_name TEXT,
  
  -- Hierarchy Context
  assigned_branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  assigned_site_id UUID REFERENCES public.sites(id) ON DELETE SET NULL,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users view own profile" ON public.profiles 
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users update own profile" ON public.profiles 
  FOR UPDATE USING (auth.uid() = id);

-- Admins can view all profiles in their tenant
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

/* =========================================
   2. FIX THE SECURITY FUNCTION (The Golden Key)
   ========================================= */
-- Update to look at PROFILES instead of INVITATIONS
CREATE OR REPLACE FUNCTION public.get_auth_tenant_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT tenant_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;