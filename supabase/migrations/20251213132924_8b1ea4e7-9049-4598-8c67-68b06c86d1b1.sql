
-- get_response_metrics: Investigation times, target completion, repeat incident rate
CREATE OR REPLACE FUNCTION public.get_response_metrics(
  p_start_date DATE,
  p_end_date DATE,
  p_branch_id UUID DEFAULT NULL,
  p_site_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_tenant_id UUID;
  v_avg_investigation_days NUMERIC;
  v_within_target_pct NUMERIC;
  v_repeat_incident_rate NUMERIC;
  v_total_investigations INTEGER;
  v_within_target_count INTEGER;
  v_repeat_count INTEGER;
  v_total_incidents INTEGER;
BEGIN
  v_tenant_id := get_auth_tenant_id();
  
  -- Average investigation time (days from incident occurred_at to investigation completed_at)
  SELECT 
    COALESCE(AVG(EXTRACT(EPOCH FROM (inv.completed_at - i.occurred_at)) / 86400), 0)
  INTO v_avg_investigation_days
  FROM investigations inv
  JOIN incidents i ON inv.incident_id = i.id
  WHERE i.tenant_id = v_tenant_id
    AND i.deleted_at IS NULL
    AND inv.deleted_at IS NULL
    AND inv.completed_at IS NOT NULL
    AND i.occurred_at::date BETWEEN p_start_date AND p_end_date
    AND (p_branch_id IS NULL OR i.branch_id = p_branch_id)
    AND (p_site_id IS NULL OR i.site_id = p_site_id);
  
  -- Investigation within target (assuming 14-day target)
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE EXTRACT(EPOCH FROM (inv.completed_at - i.occurred_at)) / 86400 <= 14)
  INTO v_total_investigations, v_within_target_count
  FROM investigations inv
  JOIN incidents i ON inv.incident_id = i.id
  WHERE i.tenant_id = v_tenant_id
    AND i.deleted_at IS NULL
    AND inv.deleted_at IS NULL
    AND inv.completed_at IS NOT NULL
    AND i.occurred_at::date BETWEEN p_start_date AND p_end_date
    AND (p_branch_id IS NULL OR i.branch_id = p_branch_id)
    AND (p_site_id IS NULL OR i.site_id = p_site_id);
  
  v_within_target_pct := CASE 
    WHEN v_total_investigations > 0 THEN ROUND((v_within_target_count::numeric / v_total_investigations) * 100, 1)
    ELSE 0 
  END;
  
  -- Repeat incident rate (incidents with same location in last 12 months)
  SELECT COUNT(*) INTO v_total_incidents
  FROM incidents i
  WHERE i.tenant_id = v_tenant_id
    AND i.deleted_at IS NULL
    AND i.event_type = 'incident'
    AND i.occurred_at::date BETWEEN p_start_date AND p_end_date
    AND (p_branch_id IS NULL OR i.branch_id = p_branch_id)
    AND (p_site_id IS NULL OR i.site_id = p_site_id);
  
  SELECT COUNT(*) INTO v_repeat_count
  FROM incidents i
  WHERE i.tenant_id = v_tenant_id
    AND i.deleted_at IS NULL
    AND i.event_type = 'incident'
    AND i.occurred_at::date BETWEEN p_start_date AND p_end_date
    AND (p_branch_id IS NULL OR i.branch_id = p_branch_id)
    AND (p_site_id IS NULL OR i.site_id = p_site_id)
    AND EXISTS (
      SELECT 1 FROM incidents prev
      WHERE prev.tenant_id = i.tenant_id
        AND prev.deleted_at IS NULL
        AND prev.id != i.id
        AND prev.branch_id = i.branch_id
        AND prev.site_id = i.site_id
        AND prev.occurred_at < i.occurred_at
        AND prev.occurred_at > i.occurred_at - INTERVAL '12 months'
    );
  
  v_repeat_incident_rate := CASE 
    WHEN v_total_incidents > 0 THEN ROUND((v_repeat_count::numeric / v_total_incidents) * 100, 1)
    ELSE 0 
  END;
  
  RETURN jsonb_build_object(
    'avg_investigation_days', ROUND(v_avg_investigation_days, 1),
    'within_target_pct', v_within_target_pct,
    'repeat_incident_rate', v_repeat_incident_rate,
    'total_investigations', v_total_investigations,
    'total_incidents', v_total_incidents
  );
END;
$function$;

-- get_people_metrics: Manhours breakdown, contractor/employee ratio
CREATE OR REPLACE FUNCTION public.get_people_metrics(
  p_start_date DATE,
  p_end_date DATE,
  p_branch_id UUID DEFAULT NULL,
  p_site_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_tenant_id UUID;
  v_total_manhours NUMERIC;
  v_employee_hours NUMERIC;
  v_contractor_hours NUMERIC;
  v_employee_incidents INTEGER;
  v_contractor_incidents INTEGER;
  v_contractor_ratio NUMERIC;
BEGIN
  v_tenant_id := get_auth_tenant_id();
  
  -- Get manhours breakdown
  SELECT 
    COALESCE(SUM(employee_hours + contractor_hours), 0),
    COALESCE(SUM(employee_hours), 0),
    COALESCE(SUM(contractor_hours), 0)
  INTO v_total_manhours, v_employee_hours, v_contractor_hours
  FROM manhours
  WHERE tenant_id = v_tenant_id
    AND deleted_at IS NULL
    AND record_date BETWEEN p_start_date AND p_end_date
    AND (p_branch_id IS NULL OR branch_id = p_branch_id)
    AND (p_site_id IS NULL OR site_id = p_site_id);
  
  -- Get incidents by worker type
  SELECT 
    COUNT(*) FILTER (WHERE worker_type = 'employee' OR worker_type IS NULL),
    COUNT(*) FILTER (WHERE worker_type = 'contractor')
  INTO v_employee_incidents, v_contractor_incidents
  FROM incidents
  WHERE tenant_id = v_tenant_id
    AND deleted_at IS NULL
    AND event_type = 'incident'
    AND occurred_at::date BETWEEN p_start_date AND p_end_date
    AND (p_branch_id IS NULL OR branch_id = p_branch_id)
    AND (p_site_id IS NULL OR site_id = p_site_id);
  
  -- Calculate contractor incident ratio (contractor incidents per 100 contractor hours vs employee incidents per 100 employee hours)
  v_contractor_ratio := CASE 
    WHEN v_employee_hours > 0 AND v_contractor_hours > 0 AND v_employee_incidents > 0 THEN
      ROUND(
        (v_contractor_incidents::numeric / v_contractor_hours * 100) / 
        NULLIF(v_employee_incidents::numeric / v_employee_hours * 100, 0),
        2
      )
    ELSE 0
  END;
  
  RETURN jsonb_build_object(
    'total_manhours', v_total_manhours,
    'employee_hours', v_employee_hours,
    'contractor_hours', v_contractor_hours,
    'employee_incidents', v_employee_incidents,
    'contractor_incidents', v_contractor_incidents,
    'contractor_ratio', COALESCE(v_contractor_ratio, 0),
    'employee_pct', CASE WHEN v_total_manhours > 0 THEN ROUND((v_employee_hours / v_total_manhours) * 100, 1) ELSE 0 END,
    'contractor_pct', CASE WHEN v_total_manhours > 0 THEN ROUND((v_contractor_hours / v_total_manhours) * 100, 1) ELSE 0 END
  );
END;
$function$;

-- get_days_since_last_recordable: Days since last recordable injury
CREATE OR REPLACE FUNCTION public.get_days_since_last_recordable(
  p_branch_id UUID DEFAULT NULL,
  p_site_id UUID DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_tenant_id UUID;
  v_last_recordable_date DATE;
BEGIN
  v_tenant_id := get_auth_tenant_id();
  
  SELECT MAX(occurred_at::date)
  INTO v_last_recordable_date
  FROM incidents
  WHERE tenant_id = v_tenant_id
    AND deleted_at IS NULL
    AND is_recordable = true
    AND (p_branch_id IS NULL OR branch_id = p_branch_id)
    AND (p_site_id IS NULL OR site_id = p_site_id);
  
  IF v_last_recordable_date IS NULL THEN
    RETURN 999; -- No recordable injuries found
  END IF;
  
  RETURN CURRENT_DATE - v_last_recordable_date;
END;
$function$;
