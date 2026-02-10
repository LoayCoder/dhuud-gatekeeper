
-- Fix get_leading_indicators to correctly calculate hazard rate and support site filtering
CREATE OR REPLACE FUNCTION public.get_leading_indicators(
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL,
  p_branch_id UUID DEFAULT NULL,
  p_site_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_tenant_id UUID;
  v_near_misses INT := 0;
  v_total_incidents INT := 0;
  v_near_miss_rate NUMERIC := 0;
  v_total_observations INT := 0;
  v_closed_observations INT := 0;
  v_observation_completion_pct NUMERIC := 0;
  v_actions_closed INT := 0;
  v_actions_total INT := 0;
  v_action_closure_pct NUMERIC := 0;
  v_total_hazards INT := 0;
  v_hazard_rate NUMERIC := 0;
BEGIN
  v_tenant_id := get_auth_tenant_id();
  
  IF v_tenant_id IS NULL THEN
    RETURN jsonb_build_object(
      'near_miss_rate', 0,
      'observation_completion_pct', 0,
      'action_closure_pct', 0,
      'hazard_identification_rate', 0,
      'total_near_misses', 0,
      'total_observations', 0,
      'closed_observations', 0,
      'total_actions', 0,
      'closed_actions', 0,
      'total_hazards', 0
    );
  END IF;

  -- Near Miss Rate
  SELECT 
    COUNT(*) FILTER (WHERE subtype = 'near_miss'),
    COUNT(*)
  INTO v_near_misses, v_total_incidents
  FROM incidents
  WHERE tenant_id = v_tenant_id
    AND deleted_at IS NULL
    AND (p_branch_id IS NULL OR branch_id = p_branch_id)
    AND (p_site_id IS NULL OR site_id = p_site_id)
    AND (p_start_date IS NULL OR occurred_at >= p_start_date::timestamp)
    AND (p_end_date IS NULL OR occurred_at < (p_end_date + 1)::timestamp);

  IF v_total_incidents > 0 THEN
    v_near_miss_rate := ROUND((v_near_misses::NUMERIC / v_total_incidents) * 100, 1);
  END IF;

  -- Observation Completion
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'closed')
  INTO v_total_observations, v_closed_observations
  FROM incidents
  WHERE tenant_id = v_tenant_id
    AND deleted_at IS NULL
    AND event_type = 'observation'
    AND (p_branch_id IS NULL OR branch_id = p_branch_id)
    AND (p_site_id IS NULL OR site_id = p_site_id)
    AND (p_start_date IS NULL OR occurred_at >= p_start_date::timestamp)
    AND (p_end_date IS NULL OR occurred_at < (p_end_date + 1)::timestamp);

  IF v_total_observations > 0 THEN
    v_observation_completion_pct := ROUND((v_closed_observations::NUMERIC / v_total_observations) * 100, 1);
  END IF;

  -- Action Closure Rate
  SELECT 
    COUNT(*) FILTER (WHERE status IN ('verified', 'closed')),
    COUNT(*)
  INTO v_actions_closed, v_actions_total
  FROM corrective_actions
  WHERE tenant_id = v_tenant_id
    AND deleted_at IS NULL
    AND (p_branch_id IS NULL OR branch_id = p_branch_id)
    AND (p_site_id IS NULL OR site_id = p_site_id)
    AND (p_start_date IS NULL OR created_at >= p_start_date::timestamp)
    AND (p_end_date IS NULL OR created_at < (p_end_date + 1)::timestamp);

  IF v_actions_total > 0 THEN
    v_action_closure_pct := ROUND((v_actions_closed::NUMERIC / v_actions_total) * 100, 1);
  END IF;

  -- Hazard Identification Rate
  SELECT COUNT(*)
  INTO v_total_hazards
  FROM incidents
  WHERE tenant_id = v_tenant_id
    AND deleted_at IS NULL
    AND event_type = 'observation'
    AND subtype = 'unsafe_condition'
    AND (p_branch_id IS NULL OR branch_id = p_branch_id)
    AND (p_site_id IS NULL OR site_id = p_site_id)
    AND (p_start_date IS NULL OR occurred_at >= p_start_date::timestamp)
    AND (p_end_date IS NULL OR occurred_at < (p_end_date + 1)::timestamp);

  IF v_total_observations > 0 THEN
    v_hazard_rate := ROUND((v_total_hazards::NUMERIC / v_total_observations) * 100, 1);
  ELSE
    v_hazard_rate := 0;
  END IF;

  RETURN jsonb_build_object(
    'near_miss_rate', v_near_miss_rate,
    'observation_completion_pct', v_observation_completion_pct,
    'action_closure_pct', v_action_closure_pct,
    'hazard_identification_rate', v_hazard_rate,
    'total_near_misses', v_near_misses,
    'total_observations', v_total_observations,
    'closed_observations', v_closed_observations,
    'total_actions', v_actions_total,
    'closed_actions', v_actions_closed,
    'total_hazards', v_total_hazards
  );
END;
$$;
