-- 1. Create divisions table
CREATE TABLE public.divisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create departments table (child of divisions)
CREATE TABLE public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  division_id UUID NOT NULL REFERENCES public.divisions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Create sections table (child of departments)
CREATE TABLE public.sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Add new assignment columns to profiles
ALTER TABLE public.profiles 
  ADD COLUMN assigned_division_id UUID REFERENCES public.divisions(id) ON DELETE SET NULL,
  ADD COLUMN assigned_department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  ADD COLUMN assigned_section_id UUID REFERENCES public.sections(id) ON DELETE SET NULL;

-- 5. Enable RLS on all new tables
ALTER TABLE public.divisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sections ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies for divisions
CREATE POLICY "Admins can manage divisions"
ON public.divisions FOR ALL
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view divisions in their tenant"
ON public.divisions FOR SELECT
USING (tenant_id = get_auth_tenant_id());

-- 7. RLS Policies for departments
CREATE POLICY "Admins can manage departments"
ON public.departments FOR ALL
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view departments in their tenant"
ON public.departments FOR SELECT
USING (tenant_id = get_auth_tenant_id());

-- 8. RLS Policies for sections
CREATE POLICY "Admins can manage sections"
ON public.sections FOR ALL
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view sections in their tenant"
ON public.sections FOR SELECT
USING (tenant_id = get_auth_tenant_id());