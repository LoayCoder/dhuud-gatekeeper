-- =====================================================
-- SECURITY WORKFORCE COMMAND - MAIN SCHEMA CHANGES
-- =====================================================

-- 1. Add supervisor_id to shift_roster
ALTER TABLE public.shift_roster 
ADD COLUMN IF NOT EXISTS supervisor_id UUID REFERENCES public.profiles(id);

-- 2. Add handover approval fields to shift_handovers
ALTER TABLE public.shift_handovers 
ADD COLUMN IF NOT EXISTS handover_type TEXT DEFAULT 'standard',
ADD COLUMN IF NOT EXISTS requires_approval BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
ADD COLUMN IF NOT EXISTS assigned_followup_guard_id UUID REFERENCES public.profiles(id);

-- Add constraint for handover_type if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'shift_handovers_handover_type_check'
  ) THEN
    ALTER TABLE public.shift_handovers 
    ADD CONSTRAINT shift_handovers_handover_type_check 
    CHECK (handover_type IN ('standard', 'vacation', 'resignation'));
  END IF;
END $$;

-- 3. Create zone code generation function
CREATE OR REPLACE FUNCTION public.generate_zone_code(zone_name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN 'ZONE-' || UPPER(REGEXP_REPLACE(TRIM(COALESCE(zone_name, '')), '[^A-Za-z0-9]+', '-', 'g'));
END;
$$;

-- 4. Create trigger to auto-generate zone_code
CREATE OR REPLACE FUNCTION public.set_zone_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.zone_code IS NULL OR NEW.zone_code = '' THEN
    NEW.zone_code := generate_zone_code(NEW.zone_name);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_zone_code_trigger ON public.security_zones;
CREATE TRIGGER set_zone_code_trigger
BEFORE INSERT OR UPDATE ON public.security_zones
FOR EACH ROW
EXECUTE FUNCTION public.set_zone_code();

-- 5. Update existing zones with zone_code
UPDATE public.security_zones 
SET zone_code = generate_zone_code(zone_name) 
WHERE zone_code IS NULL OR zone_code = '';

-- 6. Create security access check function for RLS
CREATE OR REPLACE FUNCTION public.has_security_access(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role::text IN ('admin', 'security_manager', 'security_supervisor')
  );
$$;

-- 7. Fix security_zones RLS policies
DROP POLICY IF EXISTS "Users can view security zones" ON public.security_zones;
DROP POLICY IF EXISTS "Admins can manage security zones" ON public.security_zones;
DROP POLICY IF EXISTS "Security zones are viewable by authenticated users" ON public.security_zones;
DROP POLICY IF EXISTS "Admins can insert security zones" ON public.security_zones;
DROP POLICY IF EXISTS "Admins can update security zones" ON public.security_zones;
DROP POLICY IF EXISTS "Admins can delete security zones" ON public.security_zones;

-- Allow all authenticated users to view active zones in their tenant
CREATE POLICY "security_zones_select_policy" 
ON public.security_zones 
FOR SELECT 
TO authenticated
USING (
  tenant_id = get_auth_tenant_id() 
  AND deleted_at IS NULL
);

-- Allow admins and security managers to insert zones
CREATE POLICY "security_zones_insert_policy" 
ON public.security_zones 
FOR INSERT 
TO authenticated
WITH CHECK (
  tenant_id = get_auth_tenant_id()
  AND (is_admin(auth.uid()) OR has_security_access(auth.uid()))
);

-- Allow admins and security managers to update zones (including soft delete)
CREATE POLICY "security_zones_update_policy" 
ON public.security_zones 
FOR UPDATE 
TO authenticated
USING (
  tenant_id = get_auth_tenant_id()
  AND (is_admin(auth.uid()) OR has_security_access(auth.uid()))
)
WITH CHECK (
  tenant_id = get_auth_tenant_id()
  AND (is_admin(auth.uid()) OR has_security_access(auth.uid()))
);

-- 8. Create function to check zone dependencies
CREATE OR REPLACE FUNCTION public.check_zone_dependencies(p_zone_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
  incident_count INT;
  asset_count INT;
  patrol_count INT;
  roster_count INT;
BEGIN
  SELECT COUNT(*) INTO incident_count FROM incidents WHERE zone_id = p_zone_id AND deleted_at IS NULL;
  SELECT COUNT(*) INTO asset_count FROM hsse_assets WHERE zone_id = p_zone_id AND deleted_at IS NULL;
  SELECT COUNT(*) INTO patrol_count FROM patrols WHERE zone_id = p_zone_id AND deleted_at IS NULL;
  SELECT COUNT(*) INTO roster_count FROM shift_roster WHERE zone_id = p_zone_id AND deleted_at IS NULL;
  
  result := jsonb_build_object(
    'has_dependencies', (incident_count + asset_count + patrol_count + roster_count) > 0,
    'incidents', incident_count,
    'assets', asset_count,
    'patrols', patrol_count,
    'roster', roster_count,
    'total', incident_count + asset_count + patrol_count + roster_count
  );
  
  RETURN result;
END;
$$;

-- 9. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_shift_roster_supervisor_id ON public.shift_roster(supervisor_id);
CREATE INDEX IF NOT EXISTS idx_security_zones_zone_code ON public.security_zones(zone_code);