
CREATE OR REPLACE FUNCTION public.get_lagging_indicators(
    p_start_date DATE,
    p_end_date DATE,
    p_branch_id UUID DEFAULT NULL,
    p_site_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_tenant_id UUID;
    v_total_hours NUMERIC := 0;
    v_recordable_injuries INTEGER := 0;
    v_lost_time_injuries INTEGER := 0;
    v_dart_cases INTEGER := 0;
    v_fatalities INTEGER := 0;
    v_total_lost_workdays INTEGER := 0;
    v_trir NUMERIC := 0;
    v_ltifr NUMERIC := 0;
    v_dart_rate NUMERIC := 0;
    v_fatality_rate NUMERIC := 0;
    v_severity_rate NUMERIC := 0;
BEGIN
    -- Get tenant_id from the current user's profile
    SELECT tenant_id INTO v_tenant_id
    FROM profiles
    WHERE id = auth.uid();

    IF v_tenant_id IS NULL THEN
        RETURN jsonb_build_object(
            'total_manhours', 0,
            'total_recordable_injuries', 0,
            'lost_time_injuries', 0,
            'restricted_duty_cases', 0,
            'fatalities', 0,
            'total_lost_days', 0,
            'trir', 0,
            'ltifr', 0,
            'dart_rate', 0,
            'fatality_rate', 0,
            'severity_rate', 0
        );
    END IF;

    -- Get total manhours from manhours_records
    SELECT COALESCE(SUM(total_hours), 0) INTO v_total_hours
    FROM manhours_records
    WHERE tenant_id = v_tenant_id
      AND deleted_at IS NULL
      AND record_date BETWEEN p_start_date AND p_end_date
      AND (p_branch_id IS NULL OR branch_id = p_branch_id)
      AND (p_site_id IS NULL OR site_id = p_site_id);

    -- Count incidents by severity/type
    SELECT 
        COUNT(*) FILTER (WHERE severity IN ('minor', 'moderate', 'major', 'critical', 'catastrophic') 
                         OR incident_type IN ('injury', 'occupational_illness', 'property_damage')),
        COUNT(*) FILTER (WHERE incident_type = 'injury' AND severity IN ('major', 'critical', 'catastrophic')),
        COUNT(*) FILTER (WHERE incident_type = 'injury' AND severity IN ('moderate', 'major')),
        COUNT(*) FILTER (WHERE severity = 'catastrophic' OR incident_type = 'fatality'),
        COALESCE(SUM(
            CASE 
                WHEN severity IN ('major', 'critical', 'catastrophic') THEN
                    CASE severity
                        WHEN 'major' THEN 7
                        WHEN 'critical' THEN 30
                        WHEN 'catastrophic' THEN 180
                        ELSE 0
                    END
                ELSE 0
            END
        ), 0)
    INTO v_recordable_injuries, v_lost_time_injuries, v_dart_cases, v_fatalities, v_total_lost_workdays
    FROM incidents
    WHERE tenant_id = v_tenant_id
      AND deleted_at IS NULL
      AND incident_date BETWEEN p_start_date AND p_end_date
      AND (p_branch_id IS NULL OR branch_id = p_branch_id)
      AND (p_site_id IS NULL OR site_id = p_site_id);

    -- Calculate rates (avoid division by zero)
    IF v_total_hours > 0 THEN
        -- TRIR: Total Recordable Incident Rate per 200,000 hours
        v_trir := ROUND((v_recordable_injuries * 200000.0 / v_total_hours)::NUMERIC, 2);
        
        -- LTIFR: Lost Time Injury Frequency Rate per 1,000,000 hours
        v_ltifr := ROUND((v_lost_time_injuries * 1000000.0 / v_total_hours)::NUMERIC, 2);
        
        -- DART Rate: Days Away, Restricted, or Transferred Rate per 200,000 hours
        v_dart_rate := ROUND((v_dart_cases * 200000.0 / v_total_hours)::NUMERIC, 2);
        
        -- Severity Rate: Lost days per 200,000 hours worked
        v_severity_rate := ROUND((v_total_lost_workdays * 200000.0 / v_total_hours)::NUMERIC, 2);
    END IF;

    -- Fatality Rate: per 100,000 workers (estimated from manhours / 2000 hours per worker per year)
    IF v_total_hours > 0 THEN
        v_fatality_rate := ROUND((v_fatalities * 100000.0 / (v_total_hours / 2000.0))::NUMERIC, 2);
    END IF;

    RETURN jsonb_build_object(
        'total_manhours', v_total_hours,
        'total_recordable_injuries', v_recordable_injuries,
        'lost_time_injuries', v_lost_time_injuries,
        'restricted_duty_cases', v_dart_cases,
        'fatalities', v_fatalities,
        'total_lost_days', v_total_lost_workdays,
        'trir', v_trir,
        'ltifr', v_ltifr,
        'dart_rate', v_dart_rate,
        'fatality_rate', v_fatality_rate,
        'severity_rate', v_severity_rate
    );
END;
$$;
