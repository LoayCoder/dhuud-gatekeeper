-- Add confidentiality columns to incidents table
ALTER TABLE public.incidents 
ADD COLUMN IF NOT EXISTS confidentiality_level TEXT DEFAULT 'public',
ADD COLUMN IF NOT EXISTS confidentiality_set_by UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS confidentiality_set_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS confidentiality_expiry TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS auto_declassify_to TEXT,
ADD COLUMN IF NOT EXISTS confidentiality_expiry_reason TEXT;

-- Add check constraint for confidentiality_level
ALTER TABLE public.incidents 
ADD CONSTRAINT incidents_confidentiality_level_check 
CHECK (confidentiality_level IN ('public', 'restricted', 'confidential'));

-- Add check constraint for auto_declassify_to
ALTER TABLE public.incidents 
ADD CONSTRAINT incidents_auto_declassify_to_check 
CHECK (auto_declassify_to IS NULL OR auto_declassify_to IN ('public', 'restricted'));

-- Create incident_access_list table (for Confidential level explicit access)
CREATE TABLE IF NOT EXISTS public.incident_access_list (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  incident_id UUID NOT NULL REFERENCES public.incidents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  granted_by UUID NOT NULL REFERENCES public.profiles(id),
  granted_at TIMESTAMPTZ DEFAULT now(),
  revoked_at TIMESTAMPTZ,
  revoked_by UUID REFERENCES public.profiles(id),
  reason TEXT,
  deleted_at TIMESTAMPTZ,
  UNIQUE(incident_id, user_id)
);

-- Create incident_confidentiality_audit table
CREATE TABLE IF NOT EXISTS public.incident_confidentiality_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  incident_id UUID NOT NULL REFERENCES public.incidents(id) ON DELETE CASCADE,
  actor_id UUID NOT NULL REFERENCES public.profiles(id),
  action TEXT NOT NULL,
  old_level TEXT,
  new_level TEXT,
  affected_user_id UUID REFERENCES public.profiles(id),
  reason TEXT,
  expiry_settings JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.incident_access_list ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incident_confidentiality_audit ENABLE ROW LEVEL SECURITY;

-- RLS for incident_access_list
CREATE POLICY "tenant_isolation_incident_access_list" ON public.incident_access_list
FOR ALL USING (tenant_id = get_auth_tenant_id());

-- RLS for incident_confidentiality_audit  
CREATE POLICY "tenant_isolation_incident_confidentiality_audit" ON public.incident_confidentiality_audit
FOR ALL USING (tenant_id = get_auth_tenant_id());

-- Function to check if user has access to incident based on confidentiality
CREATE OR REPLACE FUNCTION public.has_confidentiality_access(_incident_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_level TEXT;
  v_dept_id UUID;
  v_reporter_id UUID;
  v_tenant_id UUID;
  v_is_hsse BOOLEAN;
  v_is_hsse_manager BOOLEAN;
  v_is_on_access_list BOOLEAN;
  v_is_dept_owner_or_rep BOOLEAN;
BEGIN
  -- Get incident confidentiality info
  SELECT confidentiality_level, department_id, reporter_id, tenant_id
  INTO v_level, v_dept_id, v_reporter_id, v_tenant_id
  FROM incidents 
  WHERE id = _incident_id AND deleted_at IS NULL;
  
  -- If no incident or public, allow access
  IF v_level IS NULL OR v_level = 'public' THEN
    RETURN TRUE;
  END IF;
  
  -- Check HSSE Manager role first (always has access)
  SELECT EXISTS (
    SELECT 1 FROM user_role_assignments ura
    JOIN roles r ON r.id = ura.role_id
    WHERE ura.user_id = _user_id
      AND ura.tenant_id = v_tenant_id
      AND ura.deleted_at IS NULL
      AND r.code = 'hsse_manager'
  ) INTO v_is_hsse_manager;
  
  IF v_is_hsse_manager THEN
    RETURN TRUE;
  END IF;
  
  -- For confidential, only HSSE Manager or explicit access list
  IF v_level = 'confidential' THEN
    SELECT EXISTS(
      SELECT 1 FROM incident_access_list 
      WHERE incident_id = _incident_id 
        AND user_id = _user_id 
        AND revoked_at IS NULL 
        AND deleted_at IS NULL
    ) INTO v_is_on_access_list;
    
    RETURN v_is_on_access_list;
  END IF;
  
  -- For restricted: HSSE roles, dept owner, dept rep, reporter
  IF v_level = 'restricted' THEN
    -- Check HSSE access
    SELECT has_hsse_incident_access(_user_id) INTO v_is_hsse;
    IF v_is_hsse THEN RETURN TRUE; END IF;
    
    -- Reporter always has access
    IF _user_id = v_reporter_id THEN RETURN TRUE; END IF;
    
    -- Check if user is department owner or representative
    IF v_dept_id IS NOT NULL THEN
      SELECT EXISTS(
        SELECT 1 FROM departments 
        WHERE id = v_dept_id 
          AND deleted_at IS NULL
          AND (owner_id = _user_id OR representative_id = _user_id)
      ) INTO v_is_dept_owner_or_rep;
      
      IF v_is_dept_owner_or_rep THEN RETURN TRUE; END IF;
    END IF;
    
    RETURN FALSE;
  END IF;
  
  RETURN FALSE;
END;
$$;

-- Function to check if user can only see limited action view (for action assignees)
CREATE OR REPLACE FUNCTION public.is_action_assignee_only(_incident_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_has_full_access BOOLEAN;
  v_is_action_assignee BOOLEAN;
BEGIN
  -- Check if user has full confidentiality access
  SELECT has_confidentiality_access(_incident_id, _user_id) INTO v_has_full_access;
  
  IF v_has_full_access THEN
    RETURN FALSE; -- They have full access, not limited
  END IF;
  
  -- Check if user is assigned to any action for this incident
  SELECT EXISTS(
    SELECT 1 FROM corrective_actions
    WHERE incident_id = _incident_id
      AND assigned_to = _user_id
      AND deleted_at IS NULL
  ) INTO v_is_action_assignee;
  
  RETURN v_is_action_assignee;
END;
$$;

-- Function to log confidentiality changes
CREATE OR REPLACE FUNCTION public.log_confidentiality_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only log if confidentiality_level changed
  IF OLD.confidentiality_level IS DISTINCT FROM NEW.confidentiality_level THEN
    INSERT INTO incident_confidentiality_audit (
      tenant_id, incident_id, actor_id, action,
      old_level, new_level, reason, expiry_settings
    ) VALUES (
      NEW.tenant_id,
      NEW.id,
      COALESCE(auth.uid(), NEW.confidentiality_set_by),
      CASE 
        WHEN OLD.confidentiality_level IS NULL THEN 'level_set'
        ELSE 'level_changed'
      END,
      OLD.confidentiality_level,
      NEW.confidentiality_level,
      NEW.confidentiality_expiry_reason,
      jsonb_build_object(
        'expiry', NEW.confidentiality_expiry,
        'auto_declassify_to', NEW.auto_declassify_to
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for confidentiality audit
DROP TRIGGER IF EXISTS log_incident_confidentiality_change ON incidents;
CREATE TRIGGER log_incident_confidentiality_change
AFTER UPDATE ON incidents
FOR EACH ROW
EXECUTE FUNCTION log_confidentiality_change();

-- Function to auto-declassify expired incidents (called by cron/edge function)
CREATE OR REPLACE FUNCTION public.process_confidentiality_expiry()
RETURNS TABLE(incident_id UUID, old_level TEXT, new_level TEXT, action_taken TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_incident RECORD;
BEGIN
  FOR v_incident IN 
    SELECT i.id, i.tenant_id, i.confidentiality_level, i.auto_declassify_to
    FROM incidents i
    WHERE i.confidentiality_expiry IS NOT NULL
      AND i.confidentiality_expiry <= NOW()
      AND i.confidentiality_level != 'public'
      AND i.deleted_at IS NULL
  LOOP
    IF v_incident.auto_declassify_to IS NOT NULL THEN
      -- Auto-declassify
      UPDATE incidents SET
        confidentiality_level = v_incident.auto_declassify_to,
        confidentiality_expiry = NULL,
        auto_declassify_to = NULL
      WHERE id = v_incident.id;
      
      -- Log the auto-declassification
      INSERT INTO incident_confidentiality_audit (
        tenant_id, incident_id, actor_id, action,
        old_level, new_level, reason
      ) VALUES (
        v_incident.tenant_id,
        v_incident.id,
        '00000000-0000-0000-0000-000000000000'::UUID, -- System actor
        'auto_declassified',
        v_incident.confidentiality_level,
        v_incident.auto_declassify_to,
        'Automatic declassification due to expiry'
      );
      
      RETURN QUERY SELECT v_incident.id, v_incident.confidentiality_level, v_incident.auto_declassify_to, 'auto_declassified'::TEXT;
    ELSE
      -- Just mark for notification (expiry_reminder_needed)
      RETURN QUERY SELECT v_incident.id, v_incident.confidentiality_level, NULL::TEXT, 'reminder_needed'::TEXT;
    END IF;
  END LOOP;
END;
$$;

-- Function to check if user can set confidentiality (HSSE Expert during triage)
CREATE OR REPLACE FUNCTION public.can_set_confidentiality(_user_id UUID, _incident_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_current_level TEXT;
  v_is_hsse_expert BOOLEAN;
  v_is_hsse_manager BOOLEAN;
  v_is_admin BOOLEAN;
BEGIN
  -- Get current level
  SELECT confidentiality_level INTO v_current_level
  FROM incidents WHERE id = _incident_id;
  
  -- Check roles
  SELECT has_role_by_code(_user_id, 'hsse_expert') INTO v_is_hsse_expert;
  SELECT has_role_by_code(_user_id, 'hsse_manager') INTO v_is_hsse_manager;
  SELECT is_admin(_user_id) INTO v_is_admin;
  
  -- HSSE Manager/Admin can always change
  IF v_is_hsse_manager OR v_is_admin THEN
    RETURN TRUE;
  END IF;
  
  -- HSSE Expert can only set initially (when level is null or still public from default)
  IF v_is_hsse_expert AND (v_current_level IS NULL OR v_current_level = 'public') THEN
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$;

-- Function to check if user can manage access list (HSSE Manager only)
CREATE OR REPLACE FUNCTION public.can_manage_access_list(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT has_role_by_code(_user_id, 'hsse_manager') OR is_admin(_user_id);
$$;