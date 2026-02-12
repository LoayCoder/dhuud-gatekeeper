
DROP FUNCTION IF EXISTS get_people_metrics(DATE, DATE, UUID, UUID);
DROP FUNCTION IF EXISTS get_people_metrics(TEXT, TEXT, UUID, UUID);

CREATE OR REPLACE FUNCTION get_people_metrics(
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL,
  p_branch_id UUID DEFAULT NULL,
  p_site_id UUID DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_tenant_id UUID;
  v_total_incidents INT;
  v_employee_incidents INT;
  v_contractor_incidents INT;
  v_total_manhours NUMERIC;
  v_employee_hours NUMERIC;
  v_contractor_hours NUMERIC;
  v_employee_pct NUMERIC;
  v_contractor_pct NUMERIC;
  v_contractor_ratio NUMERIC;
BEGIN
  v_tenant_id := get_auth_tenant_id();
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Tenant ID not found';
  END IF;

  -- Count incidents by worker_type
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE COALESCE(worker_type, 'employee') = 'employee'),
    COUNT(*) FILTER (WHERE worker_type = 'contractor')
  INTO v_total_incidents, v_employee_incidents, v_contractor_incidents
  FROM incidents
  WHERE tenant_id = v_tenant_id
    AND deleted_at IS NULL
    AND event_type = 'incident'
    AND incident_date >= COALESCE(p_start_date, (CURRENT_DATE - INTERVAL '12 months')::DATE)
    AND incident_date <= COALESCE(p_end_date, CURRENT_DATE)
    AND (p_branch_id IS NULL OR branch_id = p_branch_id)
    AND (p_site_id IS NULL OR site_id = p_site_id);

  -- Default manhours (no manhour_entries table yet)
  v_total_manhours := 200000;
  v_employee_hours := 140000;  -- 70% default
  v_contractor_hours := 60000; -- 30% default

  -- Calculate percentages
  IF v_total_manhours > 0 THEN
    v_employee_pct := ROUND((v_employee_hours / v_total_manhours) * 100, 1);
    v_contractor_pct := ROUND((v_contractor_hours / v_total_manhours) * 100, 1);
  ELSE
    v_employee_pct := 0;
    v_contractor_pct := 0;
  END IF;

  -- Contractor/Employee incident ratio
  IF v_employee_incidents > 0 THEN
    v_contractor_ratio := ROUND(v_contractor_incidents::NUMERIC / v_employee_incidents, 2);
  ELSE
    v_contractor_ratio := 0;
  END IF;

  RETURN jsonb_build_object(
    'total_manhours', v_total_manhours,
    'employee_hours', v_employee_hours,
    'contractor_hours', v_contractor_hours,
    'employee_incidents', v_employee_incidents,
    'contractor_incidents', v_contractor_incidents,
    'contractor_ratio', v_contractor_ratio,
    'employee_pct', v_employee_pct,
    'contractor_pct', v_contractor_pct
  );
END;
$$;
