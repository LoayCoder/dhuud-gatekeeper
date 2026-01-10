-- =====================================================
-- SECURITY DEFINER Soft-Delete Functions for Major Tables
-- Prevents RLS issues by performing manual security checks
-- =====================================================

-- =====================================================
-- 1. INSPECTION SESSIONS
-- =====================================================
CREATE OR REPLACE FUNCTION public.soft_delete_inspection_session(p_session_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_record RECORD;
  v_user_id uuid := auth.uid();
  v_user_tenant_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Access denied: not authenticated';
  END IF;

  SELECT tenant_id INTO v_user_tenant_id FROM profiles WHERE user_id = v_user_id;
  IF v_user_tenant_id IS NULL THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;
  
  SELECT id, tenant_id, deleted_at INTO v_record FROM inspection_sessions WHERE id = p_session_id;
  IF v_record.id IS NULL THEN
    RAISE EXCEPTION 'Inspection session not found';
  END IF;
  
  IF v_record.tenant_id != v_user_tenant_id THEN
    RAISE EXCEPTION 'Access denied: cross-tenant operation';
  END IF;
  
  IF v_record.deleted_at IS NOT NULL THEN
    RAISE EXCEPTION 'Inspection session already deleted';
  END IF;

  -- Soft-delete child records
  UPDATE area_inspection_photos SET deleted_at = now() 
  WHERE response_id IN (SELECT id FROM area_inspection_responses WHERE session_id = p_session_id) AND deleted_at IS NULL;
  
  UPDATE area_inspection_findings SET deleted_at = now() WHERE session_id = p_session_id AND deleted_at IS NULL;
  UPDATE area_inspection_responses SET deleted_at = now() WHERE session_id = p_session_id AND deleted_at IS NULL;
  UPDATE inspection_sessions SET deleted_at = now() WHERE id = p_session_id;
  
  RETURN p_session_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.soft_delete_inspection_session(uuid) TO authenticated;
COMMENT ON FUNCTION public.soft_delete_inspection_session(uuid) IS 'Securely soft-deletes an inspection session and all related records';

-- =====================================================
-- 2. RISK ASSESSMENTS
-- =====================================================
CREATE OR REPLACE FUNCTION public.soft_delete_risk_assessment(p_assessment_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_record RECORD;
  v_user_id uuid := auth.uid();
  v_user_tenant_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Access denied: not authenticated';
  END IF;

  SELECT tenant_id INTO v_user_tenant_id FROM profiles WHERE user_id = v_user_id;
  IF v_user_tenant_id IS NULL THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;
  
  SELECT id, tenant_id, deleted_at INTO v_record FROM risk_assessments WHERE id = p_assessment_id;
  IF v_record.id IS NULL THEN
    RAISE EXCEPTION 'Risk assessment not found';
  END IF;
  
  IF v_record.tenant_id != v_user_tenant_id THEN
    RAISE EXCEPTION 'Access denied: cross-tenant operation';
  END IF;
  
  IF v_record.deleted_at IS NOT NULL THEN
    RAISE EXCEPTION 'Risk assessment already deleted';
  END IF;

  -- Soft-delete child records
  UPDATE risk_assessment_team SET deleted_at = now() WHERE assessment_id = p_assessment_id AND deleted_at IS NULL;
  UPDATE risk_assessment_details SET deleted_at = now() WHERE assessment_id = p_assessment_id AND deleted_at IS NULL;
  UPDATE risk_assessments SET deleted_at = now() WHERE id = p_assessment_id;
  
  RETURN p_assessment_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.soft_delete_risk_assessment(uuid) TO authenticated;
COMMENT ON FUNCTION public.soft_delete_risk_assessment(uuid) IS 'Securely soft-deletes a risk assessment and all related records';

-- =====================================================
-- 3. PTW PERMITS
-- =====================================================
CREATE OR REPLACE FUNCTION public.soft_delete_ptw_permit(p_permit_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_record RECORD;
  v_user_id uuid := auth.uid();
  v_user_tenant_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Access denied: not authenticated';
  END IF;

  SELECT tenant_id INTO v_user_tenant_id FROM profiles WHERE user_id = v_user_id;
  IF v_user_tenant_id IS NULL THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;
  
  SELECT id, tenant_id, deleted_at INTO v_record FROM ptw_permits WHERE id = p_permit_id;
  IF v_record.id IS NULL THEN
    RAISE EXCEPTION 'PTW permit not found';
  END IF;
  
  IF v_record.tenant_id != v_user_tenant_id THEN
    RAISE EXCEPTION 'Access denied: cross-tenant operation';
  END IF;
  
  IF v_record.deleted_at IS NOT NULL THEN
    RAISE EXCEPTION 'PTW permit already deleted';
  END IF;

  -- Soft-delete child records
  UPDATE ptw_clearance_checks SET deleted_at = now() WHERE permit_id = p_permit_id AND deleted_at IS NULL;
  UPDATE ptw_safety_requirements SET deleted_at = now() WHERE permit_id = p_permit_id AND deleted_at IS NULL;
  UPDATE ptw_permits SET deleted_at = now() WHERE id = p_permit_id;
  
  RETURN p_permit_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.soft_delete_ptw_permit(uuid) TO authenticated;
COMMENT ON FUNCTION public.soft_delete_ptw_permit(uuid) IS 'Securely soft-deletes a PTW permit and all related records';

-- =====================================================
-- 4. HSSE ASSETS
-- =====================================================
CREATE OR REPLACE FUNCTION public.soft_delete_hsse_asset(p_asset_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_record RECORD;
  v_user_id uuid := auth.uid();
  v_user_tenant_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Access denied: not authenticated';
  END IF;

  SELECT tenant_id INTO v_user_tenant_id FROM profiles WHERE user_id = v_user_id;
  IF v_user_tenant_id IS NULL THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;
  
  SELECT id, tenant_id, deleted_at INTO v_record FROM hsse_assets WHERE id = p_asset_id;
  IF v_record.id IS NULL THEN
    RAISE EXCEPTION 'Asset not found';
  END IF;
  
  IF v_record.tenant_id != v_user_tenant_id THEN
    RAISE EXCEPTION 'Access denied: cross-tenant operation';
  END IF;
  
  IF v_record.deleted_at IS NOT NULL THEN
    RAISE EXCEPTION 'Asset already deleted';
  END IF;

  -- Soft-delete child records
  UPDATE asset_maintenance_schedules SET deleted_at = now() WHERE asset_id = p_asset_id AND deleted_at IS NULL;
  UPDATE asset_cost_transactions SET deleted_at = now() WHERE asset_id = p_asset_id AND deleted_at IS NULL;
  UPDATE asset_inspections SET deleted_at = now() WHERE asset_id = p_asset_id AND deleted_at IS NULL;
  UPDATE asset_documents SET deleted_at = now() WHERE asset_id = p_asset_id AND deleted_at IS NULL;
  UPDATE asset_photos SET deleted_at = now() WHERE asset_id = p_asset_id AND deleted_at IS NULL;
  UPDATE asset_maintenance_history SET deleted_at = now() WHERE asset_id = p_asset_id AND deleted_at IS NULL;
  UPDATE asset_depreciation_schedules SET deleted_at = now() WHERE asset_id = p_asset_id AND deleted_at IS NULL;
  UPDATE asset_health_scores SET deleted_at = now() WHERE asset_id = p_asset_id AND deleted_at IS NULL;
  UPDATE asset_failure_predictions SET deleted_at = now() WHERE asset_id = p_asset_id AND deleted_at IS NULL;
  UPDATE incident_assets SET deleted_at = now() WHERE asset_id = p_asset_id AND deleted_at IS NULL;
  UPDATE hsse_assets SET deleted_at = now() WHERE id = p_asset_id;
  
  RETURN p_asset_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.soft_delete_hsse_asset(uuid) TO authenticated;
COMMENT ON FUNCTION public.soft_delete_hsse_asset(uuid) IS 'Securely soft-deletes an HSSE asset and all related records';

-- =====================================================
-- 5. VISIT REQUESTS
-- =====================================================
CREATE OR REPLACE FUNCTION public.soft_delete_visit_request(p_request_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_record RECORD;
  v_user_id uuid := auth.uid();
  v_user_tenant_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Access denied: not authenticated';
  END IF;

  SELECT tenant_id INTO v_user_tenant_id FROM profiles WHERE user_id = v_user_id;
  IF v_user_tenant_id IS NULL THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;
  
  SELECT id, tenant_id, deleted_at INTO v_record FROM visit_requests WHERE id = p_request_id;
  IF v_record.id IS NULL THEN
    RAISE EXCEPTION 'Visit request not found';
  END IF;
  
  IF v_record.tenant_id != v_user_tenant_id THEN
    RAISE EXCEPTION 'Access denied: cross-tenant operation';
  END IF;
  
  IF v_record.deleted_at IS NOT NULL THEN
    RAISE EXCEPTION 'Visit request already deleted';
  END IF;

  UPDATE visit_requests SET deleted_at = now() WHERE id = p_request_id;
  
  RETURN p_request_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.soft_delete_visit_request(uuid) TO authenticated;
COMMENT ON FUNCTION public.soft_delete_visit_request(uuid) IS 'Securely soft-deletes a visit request';

-- =====================================================
-- 6. SECURITY ZONES
-- =====================================================
CREATE OR REPLACE FUNCTION public.soft_delete_security_zone(p_zone_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_record RECORD;
  v_user_id uuid := auth.uid();
  v_user_tenant_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Access denied: not authenticated';
  END IF;

  SELECT tenant_id INTO v_user_tenant_id FROM profiles WHERE user_id = v_user_id;
  IF v_user_tenant_id IS NULL THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;
  
  SELECT id, tenant_id, deleted_at INTO v_record FROM security_zones WHERE id = p_zone_id;
  IF v_record.id IS NULL THEN
    RAISE EXCEPTION 'Security zone not found';
  END IF;
  
  IF v_record.tenant_id != v_user_tenant_id THEN
    RAISE EXCEPTION 'Access denied: cross-tenant operation';
  END IF;
  
  IF v_record.deleted_at IS NOT NULL THEN
    RAISE EXCEPTION 'Security zone already deleted';
  END IF;

  UPDATE security_zones SET deleted_at = now() WHERE id = p_zone_id;
  
  RETURN p_zone_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.soft_delete_security_zone(uuid) TO authenticated;
COMMENT ON FUNCTION public.soft_delete_security_zone(uuid) IS 'Securely soft-deletes a security zone';

-- =====================================================
-- 7. SECURITY SHIFTS
-- =====================================================
CREATE OR REPLACE FUNCTION public.soft_delete_security_shift(p_shift_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_record RECORD;
  v_user_id uuid := auth.uid();
  v_user_tenant_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Access denied: not authenticated';
  END IF;

  SELECT tenant_id INTO v_user_tenant_id FROM profiles WHERE user_id = v_user_id;
  IF v_user_tenant_id IS NULL THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;
  
  SELECT id, tenant_id, deleted_at INTO v_record FROM security_shifts WHERE id = p_shift_id;
  IF v_record.id IS NULL THEN
    RAISE EXCEPTION 'Security shift not found';
  END IF;
  
  IF v_record.tenant_id != v_user_tenant_id THEN
    RAISE EXCEPTION 'Access denied: cross-tenant operation';
  END IF;
  
  IF v_record.deleted_at IS NOT NULL THEN
    RAISE EXCEPTION 'Security shift already deleted';
  END IF;

  UPDATE security_shifts SET deleted_at = now() WHERE id = p_shift_id;
  
  RETURN p_shift_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.soft_delete_security_shift(uuid) TO authenticated;
COMMENT ON FUNCTION public.soft_delete_security_shift(uuid) IS 'Securely soft-deletes a security shift';

-- =====================================================
-- 8. CONTRACTOR COMPANIES
-- =====================================================
CREATE OR REPLACE FUNCTION public.soft_delete_contractor_company(p_company_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_record RECORD;
  v_user_id uuid := auth.uid();
  v_user_tenant_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Access denied: not authenticated';
  END IF;

  SELECT tenant_id INTO v_user_tenant_id FROM profiles WHERE user_id = v_user_id;
  IF v_user_tenant_id IS NULL THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;
  
  SELECT id, tenant_id, deleted_at INTO v_record FROM contractor_companies WHERE id = p_company_id;
  IF v_record.id IS NULL THEN
    RAISE EXCEPTION 'Contractor company not found';
  END IF;
  
  IF v_record.tenant_id != v_user_tenant_id THEN
    RAISE EXCEPTION 'Access denied: cross-tenant operation';
  END IF;
  
  IF v_record.deleted_at IS NOT NULL THEN
    RAISE EXCEPTION 'Contractor company already deleted';
  END IF;

  -- Soft-delete child records
  UPDATE contractor_documents SET deleted_at = now() WHERE company_id = p_company_id AND deleted_at IS NULL;
  UPDATE contractor_representatives SET deleted_at = now() WHERE company_id = p_company_id AND deleted_at IS NULL;
  UPDATE contractor_workers SET deleted_at = now() WHERE company_id = p_company_id AND deleted_at IS NULL;
  UPDATE contractor_companies SET deleted_at = now() WHERE id = p_company_id;
  
  RETURN p_company_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.soft_delete_contractor_company(uuid) TO authenticated;
COMMENT ON FUNCTION public.soft_delete_contractor_company(uuid) IS 'Securely soft-deletes a contractor company and all related records';

-- =====================================================
-- 9. EMERGENCY ALERTS
-- =====================================================
CREATE OR REPLACE FUNCTION public.soft_delete_emergency_alert(p_alert_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_record RECORD;
  v_user_id uuid := auth.uid();
  v_user_tenant_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Access denied: not authenticated';
  END IF;

  SELECT tenant_id INTO v_user_tenant_id FROM profiles WHERE user_id = v_user_id;
  IF v_user_tenant_id IS NULL THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;
  
  SELECT id, tenant_id, deleted_at INTO v_record FROM emergency_alerts WHERE id = p_alert_id;
  IF v_record.id IS NULL THEN
    RAISE EXCEPTION 'Emergency alert not found';
  END IF;
  
  IF v_record.tenant_id != v_user_tenant_id THEN
    RAISE EXCEPTION 'Access denied: cross-tenant operation';
  END IF;
  
  IF v_record.deleted_at IS NOT NULL THEN
    RAISE EXCEPTION 'Emergency alert already deleted';
  END IF;

  -- Soft-delete child records
  UPDATE emergency_protocol_executions SET deleted_at = now() WHERE alert_id = p_alert_id AND deleted_at IS NULL;
  UPDATE emergency_alerts SET deleted_at = now() WHERE id = p_alert_id;
  
  RETURN p_alert_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.soft_delete_emergency_alert(uuid) TO authenticated;
COMMENT ON FUNCTION public.soft_delete_emergency_alert(uuid) IS 'Securely soft-deletes an emergency alert and related executions';

-- =====================================================
-- 10. BRANCHES
-- =====================================================
CREATE OR REPLACE FUNCTION public.soft_delete_branch(p_branch_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_record RECORD;
  v_user_id uuid := auth.uid();
  v_user_tenant_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Access denied: not authenticated';
  END IF;

  SELECT tenant_id INTO v_user_tenant_id FROM profiles WHERE user_id = v_user_id;
  IF v_user_tenant_id IS NULL THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;
  
  SELECT id, tenant_id, deleted_at INTO v_record FROM branches WHERE id = p_branch_id;
  IF v_record.id IS NULL THEN
    RAISE EXCEPTION 'Branch not found';
  END IF;
  
  IF v_record.tenant_id != v_user_tenant_id THEN
    RAISE EXCEPTION 'Access denied: cross-tenant operation';
  END IF;
  
  IF v_record.deleted_at IS NOT NULL THEN
    RAISE EXCEPTION 'Branch already deleted';
  END IF;

  UPDATE branches SET deleted_at = now() WHERE id = p_branch_id;
  
  RETURN p_branch_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.soft_delete_branch(uuid) TO authenticated;
COMMENT ON FUNCTION public.soft_delete_branch(uuid) IS 'Securely soft-deletes a branch';

-- =====================================================
-- 11. BUILDINGS
-- =====================================================
CREATE OR REPLACE FUNCTION public.soft_delete_building(p_building_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_record RECORD;
  v_user_id uuid := auth.uid();
  v_user_tenant_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Access denied: not authenticated';
  END IF;

  SELECT tenant_id INTO v_user_tenant_id FROM profiles WHERE user_id = v_user_id;
  IF v_user_tenant_id IS NULL THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;
  
  SELECT id, tenant_id, deleted_at INTO v_record FROM buildings WHERE id = p_building_id;
  IF v_record.id IS NULL THEN
    RAISE EXCEPTION 'Building not found';
  END IF;
  
  IF v_record.tenant_id != v_user_tenant_id THEN
    RAISE EXCEPTION 'Access denied: cross-tenant operation';
  END IF;
  
  IF v_record.deleted_at IS NOT NULL THEN
    RAISE EXCEPTION 'Building already deleted';
  END IF;

  UPDATE buildings SET deleted_at = now() WHERE id = p_building_id;
  
  RETURN p_building_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.soft_delete_building(uuid) TO authenticated;
COMMENT ON FUNCTION public.soft_delete_building(uuid) IS 'Securely soft-deletes a building';

-- =====================================================
-- 12. FLOOR ZONES
-- =====================================================
CREATE OR REPLACE FUNCTION public.soft_delete_floor_zone(p_zone_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_record RECORD;
  v_user_id uuid := auth.uid();
  v_user_tenant_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Access denied: not authenticated';
  END IF;

  SELECT tenant_id INTO v_user_tenant_id FROM profiles WHERE user_id = v_user_id;
  IF v_user_tenant_id IS NULL THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;
  
  SELECT id, tenant_id, deleted_at INTO v_record FROM floor_zones WHERE id = p_zone_id;
  IF v_record.id IS NULL THEN
    RAISE EXCEPTION 'Floor zone not found';
  END IF;
  
  IF v_record.tenant_id != v_user_tenant_id THEN
    RAISE EXCEPTION 'Access denied: cross-tenant operation';
  END IF;
  
  IF v_record.deleted_at IS NOT NULL THEN
    RAISE EXCEPTION 'Floor zone already deleted';
  END IF;

  UPDATE floor_zones SET deleted_at = now() WHERE id = p_zone_id;
  
  RETURN p_zone_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.soft_delete_floor_zone(uuid) TO authenticated;
COMMENT ON FUNCTION public.soft_delete_floor_zone(uuid) IS 'Securely soft-deletes a floor zone';