-- =============================================
-- SITE-BASED DEPARTMENT REP ASSIGNMENT
-- =============================================

-- Phase 1: Schema Enhancement
-- Add department_rep_id to site_departments for explicit assignment
ALTER TABLE public.site_departments 
ADD COLUMN IF NOT EXISTS department_rep_id UUID REFERENCES profiles(id);

COMMENT ON COLUMN site_departments.department_rep_id IS 
'The Department Representative assigned to handle observations/incidents at this site for this department.';

-- Add site_id to user_role_assignments for site-specific role assignments
ALTER TABLE public.user_role_assignments 
ADD COLUMN IF NOT EXISTS site_id UUID REFERENCES sites(id);

CREATE INDEX IF NOT EXISTS idx_ura_site_id ON user_role_assignments(site_id);

-- =============================================
-- Phase 2: Helper Functions
-- =============================================

-- Function to get the primary department for a site
CREATE OR REPLACE FUNCTION public.get_site_primary_department(
  p_site_id UUID
)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT department_id
  FROM site_departments
  WHERE site_id = p_site_id
    AND is_primary = true
    AND deleted_at IS NULL
  LIMIT 1;
$$;

-- Function to find Department Rep for a specific site
CREATE OR REPLACE FUNCTION public.find_dept_rep_for_site(
  p_tenant_id UUID,
  p_site_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_primary_dept_id UUID;
  v_explicit_dept_rep_id UUID;
  v_dept_rep_id UUID;
  v_branch_id UUID;
BEGIN
  -- Step 1: Get the site's primary department and explicit dept rep if set
  SELECT 
    sd.department_id,
    sd.department_rep_id,
    s.branch_id
  INTO v_primary_dept_id, v_explicit_dept_rep_id, v_branch_id
  FROM site_departments sd
  JOIN sites s ON s.id = sd.site_id
  WHERE sd.site_id = p_site_id
    AND sd.is_primary = true
    AND sd.deleted_at IS NULL
  LIMIT 1;
  
  -- If explicit dept rep assigned to site-department, return it
  IF v_explicit_dept_rep_id IS NOT NULL THEN
    RETURN v_explicit_dept_rep_id;
  END IF;
  
  -- Step 2: Find a dept rep with role assignment matching site/branch/department
  -- Priority: site-specific > branch-level > tenant-wide
  SELECT ura.user_id INTO v_dept_rep_id
  FROM user_role_assignments ura
  JOIN roles r ON r.id = ura.role_id
  JOIN profiles p ON p.id = ura.user_id
  WHERE ura.tenant_id = p_tenant_id
    AND r.code = 'department_representative'
    AND r.is_active = true
    AND p.assigned_department_id = v_primary_dept_id
    AND (
      ura.site_id = p_site_id  -- Site-specific assignment
      OR ura.branch_id = v_branch_id  -- Branch-level assignment
      OR (ura.site_id IS NULL AND ura.branch_id IS NULL)  -- Tenant-wide
    )
  ORDER BY 
    CASE WHEN ura.site_id = p_site_id THEN 0
         WHEN ura.branch_id = v_branch_id THEN 1
         ELSE 2 
    END
  LIMIT 1;
  
  -- Step 3: Fallback - find any dept rep for the primary department
  IF v_dept_rep_id IS NULL AND v_primary_dept_id IS NOT NULL THEN
    SELECT ura.user_id INTO v_dept_rep_id
    FROM user_role_assignments ura
    JOIN roles r ON r.id = ura.role_id
    JOIN profiles p ON p.id = ura.user_id
    WHERE ura.tenant_id = p_tenant_id
      AND r.code = 'department_representative'
      AND r.is_active = true
      AND p.assigned_department_id = v_primary_dept_id
    LIMIT 1;
  END IF;
  
  RETURN v_dept_rep_id;
END;
$$;

-- Function to check if user can review as site-based dept rep
CREATE OR REPLACE FUNCTION public.can_review_as_site_dept_rep(
  p_user_id UUID,
  p_site_id UUID,
  p_department_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_explicit_dept_rep_id UUID;
  v_user_dept_id UUID;
  v_has_role BOOLEAN;
BEGIN
  -- Check if user is explicitly assigned as dept rep for this site-department
  SELECT sd.department_rep_id INTO v_explicit_dept_rep_id
  FROM site_departments sd
  WHERE sd.site_id = p_site_id
    AND sd.department_id = p_department_id
    AND sd.deleted_at IS NULL
  LIMIT 1;
  
  IF v_explicit_dept_rep_id = p_user_id THEN
    RETURN true;
  END IF;
  
  -- Check if user has dept_rep role and matches the department
  SELECT p.assigned_department_id INTO v_user_dept_id
  FROM profiles p
  WHERE p.id = p_user_id;
  
  IF v_user_dept_id != p_department_id THEN
    RETURN false;
  END IF;
  
  -- Check if user has the department_representative role
  SELECT EXISTS (
    SELECT 1 
    FROM user_role_assignments ura
    JOIN roles r ON r.id = ura.role_id
    WHERE ura.user_id = p_user_id
      AND r.code = 'department_representative'
      AND r.is_active = true
  ) INTO v_has_role;
  
  RETURN v_has_role;
END;
$$;

-- =============================================
-- Phase 3: Update Auto-Routing Trigger
-- =============================================

CREATE OR REPLACE FUNCTION public.auto_route_observation_on_submit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_contractor BOOLEAN;
  v_new_status TEXT;
  v_assigned_to UUID;
  v_role_selected TEXT;
  v_selection_reason TEXT;
  v_site_primary_dept UUID;
  v_effective_department_id UUID;
  v_original_department_id UUID;
BEGIN
  -- Only process observations that just became 'submitted'
  IF NEW.event_type = 'observation' 
     AND NEW.status = 'submitted' 
     AND (OLD IS NULL OR OLD.status != 'submitted') THEN
    
    v_is_contractor := NEW.related_contractor_company_id IS NOT NULL;
    v_original_department_id := NEW.department_id;
    
    -- SITE-BASED DEPARTMENT RESOLUTION
    -- Get the site's primary department (NOT the reporter's department)
    IF NEW.site_id IS NOT NULL THEN
      v_site_primary_dept := public.get_site_primary_department(NEW.site_id);
      v_effective_department_id := COALESCE(v_site_primary_dept, NEW.department_id);
    ELSE
      v_effective_department_id := NEW.department_id;
    END IF;
    
    IF v_is_contractor THEN
      -- PRIMARY RULE: Check for Contractor Consultant in branch
      v_assigned_to := public.find_contractor_consultant_for_branch(
        NEW.tenant_id, 
        NEW.branch_id
      );
      
      IF v_assigned_to IS NOT NULL THEN
        v_new_status := 'pending_consultant_screening';
        v_role_selected := 'contractor_consultant';
        v_selection_reason := 'primary_rule_contractor_consultant_found';
      ELSE
        -- FALLBACK: Route to Site's Department Rep
        IF NEW.site_id IS NOT NULL THEN
          v_assigned_to := public.find_dept_rep_for_site(NEW.tenant_id, NEW.site_id);
          v_selection_reason := 'fallback_site_based_dept_rep';
        ELSE
          v_assigned_to := public.find_dept_rep_for_branch_department(
            NEW.tenant_id, NEW.branch_id, v_effective_department_id
          );
          v_selection_reason := 'fallback_branch_based_dept_rep';
        END IF;
        v_new_status := 'pending_dept_rep_review';
        v_role_selected := 'department_representative';
      END IF;
    ELSE
      -- NON-CONTRACTOR: Route to Site's Department Rep
      IF NEW.site_id IS NOT NULL THEN
        v_assigned_to := public.find_dept_rep_for_site(NEW.tenant_id, NEW.site_id);
        v_selection_reason := 'site_based_dept_rep';
      ELSE
        v_assigned_to := public.find_dept_rep_for_branch_department(
          NEW.tenant_id, NEW.branch_id, v_effective_department_id
        );
        v_selection_reason := 'branch_based_dept_rep_no_site';
      END IF;
      v_new_status := 'pending_dept_rep_review';
      v_role_selected := 'department_representative';
    END IF;
    
    -- Update the incident's department_id to match the site's primary department
    -- This ensures consistency between site and department
    IF v_site_primary_dept IS NOT NULL THEN
      NEW.department_id := v_site_primary_dept;
    END IF;
    
    NEW.status := v_new_status;
    NEW.approval_manager_id := v_assigned_to;
    
    -- AUDIT LOG with complete site-based routing details
    INSERT INTO incident_audit_logs (incident_id, tenant_id, actor_id, action, details)
    VALUES (
      NEW.id, 
      NEW.tenant_id, 
      COALESCE(auth.uid(), NEW.reporter_id), 
      'auto_routed_observation',
      jsonb_build_object(
        'is_contractor', v_is_contractor,
        'role_selected', v_role_selected,
        'selection_reason', v_selection_reason,
        'assigned_to', v_assigned_to,
        'site_id', NEW.site_id,
        'site_primary_department', v_site_primary_dept,
        'original_department_id', v_original_department_id,
        'effective_department_id', v_effective_department_id,
        'branch_id', NEW.branch_id,
        'new_status', v_new_status,
        'contractor_company_id', NEW.related_contractor_company_id
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;