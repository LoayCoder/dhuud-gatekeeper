
-- Step 1: Drop both duplicate versions
DROP FUNCTION IF EXISTS public.get_leading_indicators(date, date, uuid);
DROP FUNCTION IF EXISTS public.get_leading_indicators(date, date, uuid, uuid);

-- Step 2: Recreate single correct version
CREATE OR REPLACE FUNCTION public.get_leading_indicators(
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL,
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
  v_total_incidents BIGINT;
  v_near_misses BIGINT;
  v_total_observations BIGINT;
  v_closed_observations BIGINT;
  v_total_actions BIGINT;
  v_closed_actions BIGINT;
  v_total_hazards BIGINT;
  v_near_miss_rate NUMERIC;
  v_observation_completion_pct NUMERIC;
  v_action_closure_pct NUMERIC;
  v_hazard_rate NUMERIC;
BEGIN
  SELECT get_auth_tenant_id() INTO v_tenant_id;

  -- Total incidents (all event_types)
  SELECT COUNT(*) INTO v_total_incidents
  FROM incidents
  WHERE tenant_id = v_tenant_id
    AND deleted_at IS NULL
    AND (p_start_date IS NULL OR occurred_at >= p_start_date)
    AND (p_end_date IS NULL OR occurred_at <= p_end_date)
    AND (p_branch_id IS NULL OR branch_id = p_branch_id)
    AND (p_site_id IS NULL OR site_id = p_site_id);

  -- Near misses
  SELECT COUNT(*) INTO v_near_misses
  FROM incidents
  WHERE tenant_id = v_tenant_id
    AND deleted_at IS NULL
    AND subtype = 'near_miss'
    AND (p_start_date IS NULL OR occurred_at >= p_start_date)
    AND (p_end_date IS NULL OR occurred_at <= p_end_date)
    AND (p_branch_id IS NULL OR branch_id = p_branch_id)
    AND (p_site_id IS NULL OR site_id = p_site_id);

  -- Total observations
  SELECT COUNT(*) INTO v_total_observations
  FROM incidents
  WHERE tenant_id = v_tenant_id
    AND deleted_at IS NULL
    AND event_type = 'observation'
    AND (p_start_date IS NULL OR occurred_at >= p_start_date)
    AND (p_end_date IS NULL OR occurred_at <= p_end_date)
    AND (p_branch_id IS NULL OR branch_id = p_branch_id)
    AND (p_site_id IS NULL OR site_id = p_site_id);

  -- Closed observations
  SELECT COUNT(*) INTO v_closed_observations
  FROM incidents
  WHERE tenant_id = v_tenant_id
    AND deleted_at IS NULL
    AND event_type = 'observation'
    AND status = 'closed'
    AND (p_start_date IS NULL OR occurred_at >= p_start_date)
    AND (p_end_date IS NULL OR occurred_at <= p_end_date)
    AND (p_branch_id IS NULL OR branch_id = p_branch_id)
    AND (p_site_id IS NULL OR site_id = p_site_id);

  -- Total corrective actions (NO site_id filter - column doesn't exist on this table)
  SELECT COUNT(*) INTO v_total_actions
  FROM corrective_actions
  WHERE tenant_id = v_tenant_id
    AND deleted_at IS NULL
    AND (p_start_date IS NULL OR created_at >= p_start_date)
    AND (p_end_date IS NULL OR created_at <= p_end_date)
    AND (p_branch_id IS NULL OR branch_id = p_branch_id);

  -- Closed corrective actions (NO site_id filter)
  SELECT COUNT(*) INTO v_closed_actions
  FROM corrective_actions
  WHERE tenant_id = v_tenant_id
    AND deleted_at IS NULL
    AND status = 'completed'
    AND (p_start_date IS NULL OR created_at >= p_start_date)
    AND (p_end_date IS NULL OR created_at <= p_end_date)
    AND (p_branch_id IS NULL OR branch_id = p_branch_id);

  -- Total hazards (unsafe_condition observations)
  SELECT COUNT(*) INTO v_total_hazards
  FROM incidents
  WHERE tenant_id = v_tenant_id
    AND deleted_at IS NULL
    AND event_type = 'observation'
    AND subtype = 'unsafe_condition'
    AND (p_start_date IS NULL OR occurred_at >= p_start_date)
    AND (p_end_date IS NULL OR occurred_at <= p_end_date)
    AND (p_branch_id IS NULL OR branch_id = p_branch_id)
    AND (p_site_id IS NULL OR site_id = p_site_id);

  -- Calculate rates
  v_near_miss_rate := CASE WHEN v_total_incidents > 0
    THEN ROUND((v_near_misses::NUMERIC / v_total_incidents) * 100, 1)
    ELSE 0 END;

  v_observation_completion_pct := CASE WHEN v_total_observations > 0
    THEN ROUND((v_closed_observations::NUMERIC / v_total_observations) * 100, 1)
    ELSE 0 END;

  v_action_closure_pct := CASE WHEN v_total_actions > 0
    THEN ROUND((v_closed_actions::NUMERIC / v_total_actions) * 100, 1)
    ELSE 0 END;

  v_hazard_rate := CASE WHEN v_total_observations > 0
    THEN ROUND((v_total_hazards::NUMERIC / v_total_observations) * 100, 1)
    ELSE 0 END;

  RETURN jsonb_build_object(
    'near_miss_rate', v_near_miss_rate,
    'observation_completion_pct', v_observation_completion_pct,
    'action_closure_pct', v_action_closure_pct,
    'hazard_identification_rate', v_hazard_rate,
    'total_near_misses', v_near_misses,
    'total_observations', v_total_observations,
    'closed_observations', v_closed_observations,
    'total_actions', v_total_actions,
    'closed_actions', v_closed_actions,
    'total_hazards', v_total_hazards
  );
END;
$$;
