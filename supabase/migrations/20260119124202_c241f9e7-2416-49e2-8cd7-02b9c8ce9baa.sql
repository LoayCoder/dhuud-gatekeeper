-- Drop all functions that have signature changes
DROP FUNCTION IF EXISTS public.get_user_role(uuid);
DROP FUNCTION IF EXISTS public.can_approve_violation(uuid, uuid);
DROP FUNCTION IF EXISTS public.can_review_as_dept_manager(uuid, uuid);
DROP FUNCTION IF EXISTS public.can_perform_clinic_review(uuid, uuid);
DROP FUNCTION IF EXISTS public.can_review_hsse_rejection(uuid, uuid);

-- =====================================================
-- COMPREHENSIVE SCHEMA ALIGNMENT FIX
-- =====================================================

-- Role helper functions
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role text)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$ BEGIN RETURN EXISTS (SELECT 1 FROM user_role_assignments ura JOIN roles r ON r.id = ura.role_id WHERE ura.user_id = _user_id AND r.code = _role AND r.is_active = true); END; $$;

CREATE FUNCTION public.get_user_role(_user_id uuid)
RETURNS text LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$ DECLARE v_role text; BEGIN SELECT r.code INTO v_role FROM user_role_assignments ura JOIN roles r ON r.id = ura.role_id WHERE ura.user_id = _user_id AND r.is_active = true ORDER BY r.priority DESC NULLS LAST LIMIT 1; RETURN v_role; END; $$;

CREATE OR REPLACE FUNCTION public.is_contractor_consultant(p_user_id uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$ BEGIN RETURN EXISTS (SELECT 1 FROM user_role_assignments ura JOIN roles r ON r.id = ura.role_id WHERE ura.user_id = p_user_id AND r.code = 'contractor_consultant' AND r.is_active = true); END; $$;

CREATE OR REPLACE FUNCTION public.is_contractor_site_rep(p_user_id uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$ BEGIN RETURN EXISTS (SELECT 1 FROM user_role_assignments ura JOIN roles r ON r.id = ura.role_id WHERE ura.user_id = p_user_id AND r.code = 'contractor_site_representative' AND r.is_active = true); END; $$;

CREATE OR REPLACE FUNCTION public.is_contract_controller(p_user_id uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$ BEGIN RETURN EXISTS (SELECT 1 FROM user_role_assignments ura JOIN roles r ON r.id = ura.role_id WHERE ura.user_id = p_user_id AND r.code = 'contract_controller' AND r.is_active = true); END; $$;

CREATE OR REPLACE FUNCTION public.is_client_site_rep(p_user_id uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$ BEGIN RETURN EXISTS (SELECT 1 FROM user_role_assignments ura JOIN roles r ON r.id = ura.role_id WHERE ura.user_id = p_user_id AND r.code = 'client_site_representative' AND r.is_active = true); END; $$;

CREATE OR REPLACE FUNCTION public.is_hsse_expert(p_user_id uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$ BEGIN RETURN EXISTS (SELECT 1 FROM user_role_assignments ura JOIN roles r ON r.id = ura.role_id WHERE ura.user_id = p_user_id AND r.code = 'hsse_expert' AND r.is_active = true); END; $$;

-- Workflow functions
CREATE FUNCTION public.can_approve_violation(p_user_id uuid, p_violation_id uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$ DECLARE v_tenant_id uuid; BEGIN SELECT tenant_id INTO v_tenant_id FROM violations WHERE id = p_violation_id; IF v_tenant_id IS NULL THEN RETURN false; END IF; RETURN EXISTS (SELECT 1 FROM user_role_assignments ura JOIN roles r ON r.id = ura.role_id JOIN profiles p ON p.id = ura.user_id WHERE ura.user_id = p_user_id AND ura.tenant_id = v_tenant_id AND r.code IN ('hsse_manager', 'hsse_expert', 'super_admin', 'admin') AND r.is_active = true AND p.deleted_at IS NULL); END; $$;

CREATE FUNCTION public.can_review_hsse_rejection(p_user_id uuid, p_incident_id uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$ DECLARE v_tenant_id uuid; BEGIN SELECT tenant_id INTO v_tenant_id FROM incidents WHERE id = p_incident_id; IF v_tenant_id IS NULL THEN RETURN false; END IF; RETURN EXISTS (SELECT 1 FROM user_role_assignments ura JOIN roles r ON r.id = ura.role_id JOIN profiles p ON p.id = ura.user_id WHERE ura.user_id = p_user_id AND ura.tenant_id = v_tenant_id AND r.code IN ('hsse_manager', 'super_admin') AND r.is_active = true AND p.deleted_at IS NULL); END; $$;

CREATE FUNCTION public.can_review_as_dept_manager(p_user_id uuid, p_incident_id uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$ DECLARE v_tenant_id uuid; BEGIN SELECT tenant_id INTO v_tenant_id FROM incidents WHERE id = p_incident_id; IF v_tenant_id IS NULL THEN RETURN false; END IF; RETURN EXISTS (SELECT 1 FROM user_role_assignments ura JOIN roles r ON r.id = ura.role_id JOIN profiles p ON p.id = ura.user_id WHERE ura.user_id = p_user_id AND ura.tenant_id = v_tenant_id AND r.code IN ('department_manager', 'security_manager', 'admin', 'super_admin') AND r.is_active = true AND p.deleted_at IS NULL); END; $$;

CREATE FUNCTION public.can_perform_clinic_review(p_user_id uuid, p_incident_id uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$ DECLARE v_tenant_id uuid; BEGIN SELECT tenant_id INTO v_tenant_id FROM incidents WHERE id = p_incident_id; IF v_tenant_id IS NULL THEN RETURN false; END IF; RETURN EXISTS (SELECT 1 FROM user_role_assignments ura JOIN roles r ON r.id = ura.role_id JOIN profiles p ON p.id = ura.user_id WHERE ura.user_id = p_user_id AND ura.tenant_id = v_tenant_id AND r.code IN ('clinic_staff', 'medical_officer', 'admin', 'super_admin') AND r.is_active = true AND p.deleted_at IS NULL); END; $$;

CREATE OR REPLACE FUNCTION public.can_view_pii(p_user_id uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$ BEGIN RETURN EXISTS (SELECT 1 FROM user_role_assignments ura JOIN roles r ON r.id = ura.role_id JOIN profiles p ON p.id = ura.user_id WHERE ura.user_id = p_user_id AND r.code IN ('admin', 'super_admin', 'hsse_manager', 'hr_manager', 'medical_officer') AND r.is_active = true AND p.deleted_at IS NULL); END; $$;