-- =====================================================
-- PII ACCESS CONTROL SECURITY HARDENING
-- =====================================================

-- 1. Create helper function to check if user can view PII
CREATE OR REPLACE FUNCTION public.can_view_pii(target_tenant_id uuid, target_profile_id uuid DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid := auth.uid();
  is_admin_user boolean;
  has_privileged_role boolean;
  is_department_manager boolean;
BEGIN
  IF current_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- User can always view their own PII
  IF target_profile_id IS NOT NULL AND current_user_id = target_profile_id THEN
    RETURN TRUE;
  END IF;

  -- Check if user is admin (using correct function signature)
  SELECT public.is_admin(current_user_id) INTO is_admin_user;
  IF is_admin_user THEN
    RETURN TRUE;
  END IF;

  -- Check privileged roles
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON ur.role_id = r.id
    WHERE ur.user_id = current_user_id
      AND r.name IN ('safety_officer', 'security_officer', 'hsse_manager', 'site_manager', 'reception')
  ) INTO has_privileged_role;

  IF has_privileged_role THEN
    RETURN TRUE;
  END IF;

  -- Department managers in same tenant
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = current_user_id
      AND p.tenant_id = target_tenant_id
      AND p.assigned_department_id IS NOT NULL
      AND p.deleted_at IS NULL
  ) INTO is_department_manager;

  RETURN is_department_manager;
END;
$$;

GRANT EXECUTE ON FUNCTION public.can_view_pii(uuid, uuid) TO authenticated;

-- 2. Secure profiles view
CREATE OR REPLACE VIEW public.profiles_secure AS
SELECT 
  id, full_name, avatar_url, tenant_id, assigned_site_id, assigned_department_id,
  assigned_branch_id, assigned_division_id, assigned_section_id, employee_id, job_title,
  user_type, has_login, is_active, is_deleted, created_at, updated_at, deleted_at,
  preferred_language, contractor_type, contractor_company_name, contract_start,
  contract_end, membership_id, membership_start, membership_end, digest_opt_in,
  CASE WHEN public.can_view_pii(tenant_id, id) THEN phone_number ELSE NULL END AS phone_number,
  CASE WHEN public.can_view_pii(tenant_id, id) THEN emergency_contact_name ELSE NULL END AS emergency_contact_name,
  CASE WHEN public.can_view_pii(tenant_id, id) THEN emergency_contact_phone ELSE NULL END AS emergency_contact_phone
FROM public.profiles;

-- 3. Secure visitors view
CREATE OR REPLACE VIEW public.visitors_secure AS
SELECT 
  id, tenant_id, full_name, company_name, qr_code_token, is_active, last_visit_at,
  created_at, car_plate, passenger_count, nationality, preferred_language, destination_id,
  whatsapp_sent_at, gate_entry_method, qr_used_at, user_type, host_name, host_phone,
  host_email, host_id, qr_generated_at, deleted_at, visit_end_time, expiry_warning_sent_at,
  last_scanned_at, photo_path,
  CASE WHEN public.can_view_pii(tenant_id) THEN national_id ELSE '••••••••••' END AS national_id,
  CASE WHEN public.can_view_pii(tenant_id) THEN phone ELSE NULL END AS phone,
  CASE WHEN public.can_view_pii(tenant_id) THEN email ELSE NULL END AS email
FROM public.visitors;

-- 4. Secure contractors view
CREATE OR REPLACE VIEW public.contractors_secure AS
SELECT 
  id, tenant_id, contractor_code, full_name, company_name, nationality, preferred_language,
  photo_path, qr_code_data, permit_number, permit_expiry_date, safety_induction_date,
  safety_induction_expiry, medical_exam_date, medical_exam_expiry, is_banned, ban_reason,
  banned_at, banned_by, ban_expires_at, allowed_sites, allowed_zones, created_by,
  created_at, updated_at, deleted_at,
  CASE WHEN public.can_view_pii(tenant_id) THEN national_id ELSE '••••••••••' END AS national_id,
  CASE WHEN public.can_view_pii(tenant_id) THEN mobile_number ELSE NULL END AS mobile_number,
  CASE WHEN public.can_view_pii(tenant_id) THEN email ELSE NULL END AS email
FROM public.contractors;

-- 5. Secure contractor_workers view
CREATE OR REPLACE VIEW public.contractor_workers_secure AS
SELECT 
  id, tenant_id, company_id, full_name, full_name_ar, nationality, preferred_language,
  photo_path, approval_status, approved_by, approved_at, rejection_reason, created_by,
  created_at, updated_at, deleted_at, worker_type, safety_officer_id,
  CASE WHEN public.can_view_pii(tenant_id) THEN national_id ELSE '••••••••••' END AS national_id,
  CASE WHEN public.can_view_pii(tenant_id) THEN mobile_number ELSE NULL END AS mobile_number
FROM public.contractor_workers;

-- 6. PII access audit log
CREATE TABLE IF NOT EXISTS public.pii_access_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  table_name text NOT NULL,
  record_id uuid,
  access_granted boolean NOT NULL,
  accessed_at timestamptz DEFAULT now(),
  ip_address text,
  user_agent text,
  tenant_id uuid
);

ALTER TABLE public.pii_access_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pii_access_logs_admin_only" ON public.pii_access_logs
  FOR SELECT USING (public.is_admin(auth.uid()));

CREATE POLICY "pii_access_logs_insert" ON public.pii_access_logs
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- 7. Login history RLS
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'login_history' AND schemaname = 'public') THEN
    ALTER TABLE public.login_history ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "login_history_user_access" ON public.login_history;
    CREATE POLICY "login_history_user_access" ON public.login_history
      FOR SELECT USING (user_id = auth.uid() OR public.is_admin(auth.uid()));
  END IF;
END $$;

-- 8. MFA backup codes protection
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'mfa_backup_codes' AND schemaname = 'public') THEN
    ALTER TABLE public.mfa_backup_codes ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "mfa_codes_owner_only" ON public.mfa_backup_codes;
    CREATE POLICY "mfa_codes_owner_only" ON public.mfa_backup_codes
      FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- Comments
COMMENT ON FUNCTION public.can_view_pii IS 'Security function to check if current user can view PII';
COMMENT ON VIEW public.profiles_secure IS 'Secure view masking PII for unauthorized users';
COMMENT ON VIEW public.visitors_secure IS 'Secure view masking visitor PII';
COMMENT ON VIEW public.contractors_secure IS 'Secure view masking contractor PII';
COMMENT ON VIEW public.contractor_workers_secure IS 'Secure view masking worker PII';
COMMENT ON TABLE public.pii_access_logs IS 'Audit log for PII access attempts';