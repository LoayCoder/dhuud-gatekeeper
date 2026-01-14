-- =============================================
-- PHASE 1: MULTI-BRANCH DATA ISOLATION FOUNDATION
-- =============================================

-- 1.1 Create user_branch_assignments table for multi-branch user access
-- Reference auth.users instead of profiles.user_id
CREATE TABLE public.user_branch_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  access_level TEXT NOT NULL DEFAULT 'standard' CHECK (access_level IN ('standard', 'manager', 'admin')),
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  UNIQUE(user_id, branch_id)
);

-- Create index for efficient lookups
CREATE INDEX idx_user_branch_assignments_user_id ON public.user_branch_assignments(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_user_branch_assignments_branch_id ON public.user_branch_assignments(branch_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_user_branch_assignments_tenant_id ON public.user_branch_assignments(tenant_id) WHERE deleted_at IS NULL;

-- Enable RLS
ALTER TABLE public.user_branch_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_branch_assignments
CREATE POLICY "Users can view their own branch assignments"
ON public.user_branch_assignments FOR SELECT TO authenticated
USING (
  tenant_id = get_auth_tenant_id()
  AND (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.user_id = auth.uid() 
      AND (p.is_super_admin = true OR p.has_full_branch_access = true)
    )
  )
);

CREATE POLICY "Admins can manage branch assignments"
ON public.user_branch_assignments FOR ALL TO authenticated
USING (
  tenant_id = get_auth_tenant_id()
  AND EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.user_id = auth.uid() 
    AND (p.is_super_admin = true OR p.has_full_branch_access = true)
  )
)
WITH CHECK (
  tenant_id = get_auth_tenant_id()
  AND EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.user_id = auth.uid() 
    AND (p.is_super_admin = true OR p.has_full_branch_access = true)
  )
);

-- 1.2 Create helper function: get_user_branch_ids
CREATE OR REPLACE FUNCTION public.get_user_branch_ids(_user_id uuid)
RETURNS uuid[]
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  _tenant_id uuid;
  _is_super_admin boolean;
  _has_full_branch_access boolean;
  _branch_ids uuid[];
BEGIN
  SELECT tenant_id, COALESCE(is_super_admin, false), COALESCE(has_full_branch_access, false)
  INTO _tenant_id, _is_super_admin, _has_full_branch_access
  FROM profiles
  WHERE user_id = _user_id;
  
  IF _is_super_admin OR _has_full_branch_access THEN
    SELECT array_agg(id) INTO _branch_ids
    FROM branches
    WHERE tenant_id = _tenant_id AND deleted_at IS NULL;
    RETURN COALESCE(_branch_ids, ARRAY[]::uuid[]);
  END IF;
  
  SELECT array_agg(uba.branch_id) INTO _branch_ids
  FROM user_branch_assignments uba
  WHERE uba.user_id = _user_id AND uba.deleted_at IS NULL;
  
  IF _branch_ids IS NULL OR array_length(_branch_ids, 1) IS NULL THEN
    SELECT ARRAY[assigned_branch_id] INTO _branch_ids
    FROM profiles
    WHERE user_id = _user_id AND assigned_branch_id IS NOT NULL;
  END IF;
  
  RETURN COALESCE(_branch_ids, ARRAY[]::uuid[]);
END;
$$;

-- 1.3 Create helper function: can_access_branch
CREATE OR REPLACE FUNCTION public.can_access_branch(_user_id uuid, _branch_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  _is_super_admin boolean;
  _has_full_branch_access boolean;
  _assigned_branch_id uuid;
BEGIN
  IF _branch_id IS NULL THEN
    RETURN true;
  END IF;

  SELECT 
    COALESCE(is_super_admin, false), 
    COALESCE(has_full_branch_access, false),
    assigned_branch_id
  INTO _is_super_admin, _has_full_branch_access, _assigned_branch_id
  FROM profiles
  WHERE user_id = _user_id;
  
  IF _is_super_admin OR _has_full_branch_access THEN
    RETURN true;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM user_branch_assignments
    WHERE user_id = _user_id AND branch_id = _branch_id AND deleted_at IS NULL
  ) THEN
    RETURN true;
  END IF;
  
  RETURN _assigned_branch_id = _branch_id;
END;
$$;

-- 1.4 Create helper function: get_user_primary_branch
CREATE OR REPLACE FUNCTION public.get_user_primary_branch(_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  _branch_id uuid;
BEGIN
  SELECT branch_id INTO _branch_id
  FROM user_branch_assignments
  WHERE user_id = _user_id AND is_primary = true AND deleted_at IS NULL
  LIMIT 1;
  
  IF _branch_id IS NOT NULL THEN
    RETURN _branch_id;
  END IF;
  
  SELECT assigned_branch_id INTO _branch_id
  FROM profiles
  WHERE user_id = _user_id;
  
  RETURN _branch_id;
END;
$$;

-- 1.5 Migrate existing profile assignments to user_branch_assignments
INSERT INTO public.user_branch_assignments (user_id, branch_id, is_primary, tenant_id, access_level)
SELECT 
  p.user_id, 
  p.assigned_branch_id, 
  true,
  p.tenant_id,
  'standard'
FROM profiles p
WHERE p.assigned_branch_id IS NOT NULL
  AND p.deleted_at IS NULL
ON CONFLICT (user_id, branch_id) DO NOTHING;

-- 1.6 Add branch_id to divisions table (NULLABLE for hybrid approach)
ALTER TABLE public.divisions 
ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id);

CREATE INDEX IF NOT EXISTS idx_divisions_branch_id ON public.divisions(branch_id) WHERE deleted_at IS NULL;

-- 1.7 Add branch_id to departments table
ALTER TABLE public.departments 
ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id);

CREATE INDEX IF NOT EXISTS idx_departments_branch_id ON public.departments(branch_id) WHERE deleted_at IS NULL;

-- 1.8 Add branch_id to sections table
ALTER TABLE public.sections 
ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id);

CREATE INDEX IF NOT EXISTS idx_sections_branch_id ON public.sections(branch_id) WHERE deleted_at IS NULL;

-- 1.9 Add branch_id to buildings table
ALTER TABLE public.buildings 
ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id);

CREATE INDEX IF NOT EXISTS idx_buildings_branch_id ON public.buildings(branch_id) WHERE deleted_at IS NULL;

-- 1.10 Add branch_id to floors_zones table
ALTER TABLE public.floors_zones 
ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id);

CREATE INDEX IF NOT EXISTS idx_floors_zones_branch_id ON public.floors_zones(branch_id) WHERE deleted_at IS NULL;

-- 1.11 Backfill buildings.branch_id from sites
UPDATE public.buildings b
SET branch_id = s.branch_id
FROM public.sites s
WHERE b.site_id = s.id
  AND b.branch_id IS NULL
  AND s.branch_id IS NOT NULL;

-- 1.12 Backfill floors_zones.branch_id from buildings
UPDATE public.floors_zones fz
SET branch_id = b.branch_id
FROM public.buildings b
WHERE fz.building_id = b.id
  AND fz.branch_id IS NULL
  AND b.branch_id IS NOT NULL;

-- 1.13 Update trigger for updated_at on user_branch_assignments
CREATE TRIGGER update_user_branch_assignments_updated_at
BEFORE UPDATE ON public.user_branch_assignments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();