
-- Fix Action Closure: expand status filter to include all closure-equivalent statuses
-- Fix Avg Investigation: use incidents.investigation_approved_at instead of investigations.completed_at

-- Drop existing functions to avoid ambiguity
DROP FUNCTION IF EXISTS public.get_leading_indicators(DATE, DATE, UUID, UUID);
DROP FUNCTION IF EXISTS public.get_response_metrics(DATE, DATE, UUID, UUID);

-- Recreate get_leading_indicators with expanded action closure statuses
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

  SELECT COUNT(*) INTO v_total_incidents
  FROM incidents
  WHERE tenant_id = v_tenant_id
    AND deleted_at IS NULL
    AND (p_start_date IS NULL OR occurred_at >= p_start_date)
    AND (p_end_date IS NULL OR occurred_at <= p_end_date)
    AND (p_branch_id IS NULL OR branch_id = p_branch_id)
    AND (p_site_id IS NULL OR site_id = p_site_id);

  SELECT COUNT(*) INTO v_near_misses
  FROM incidents
  WHERE tenant_id = v_tenant_id
    AND deleted_at IS NULL
    AND subtype = 'near_miss'
    AND (p_start_date IS NULL OR occurred_at >= p_start_date)
    AND (p_end_date IS NULL OR occurred_at <= p_end_date)
    AND (p_branch_id IS NULL OR branch_id = p_branch_id)
    AND (p_site_id IS NULL OR site_id = p_site_id);

  SELECT COUNT(*) INTO v_total_observations
  FROM incidents
  WHERE tenant_id = v_tenant_id
    AND deleted_at IS NULL
    AND event_type = 'observation'
    AND (p_start_date IS NULL OR occurred_at >= p_start_date)
    AND (p_end_date IS NULL OR occurred_at <= p_end_date)
    AND (p_branch_id IS NULL OR branch_id = p_branch_id)
    AND (p_site_id IS NULL OR site_id = p_site_id);

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

  -- Total corrective actions (NO site_id filter)
  SELECT COUNT(*) INTO v_total_actions
  FROM corrective_actions
  WHERE tenant_id = v_tenant_id
    AND deleted_at IS NULL
    AND (p_start_date IS NULL OR created_at >= p_start_date)
    AND (p_end_date IS NULL OR created_at <= p_end_date)
    AND (p_branch_id IS NULL OR branch_id = p_branch_id);

  -- FIX: Count all closure-equivalent statuses instead of only 'completed'
  SELECT COUNT(*) INTO v_closed_actions
  FROM corrective_actions
  WHERE tenant_id = v_tenant_id
    AND deleted_at IS NULL
    AND status IN ('completed', 'closed', 'verified')
    AND (p_start_date IS NULL OR created_at >= p_start_date)
    AND (p_end_date IS NULL OR created_at <= p_end_date)
    AND (p_branch_id IS NULL OR branch_id = p_branch_id);

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

-- Recreate get_response_metrics using investigation_approved_at
CREATE OR REPLACE FUNCTION public.get_response_metrics(
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
  v_avg_investigation_days NUMERIC;
  v_within_target_pct NUMERIC;
  v_repeat_incident_rate NUMERIC;
  v_total_investigations INTEGER;
  v_within_target_count INTEGER;
  v_repeat_count INTEGER;
  v_total_incidents INTEGER;
BEGIN
  v_tenant_id := get_auth_tenant_id();

  -- FIX: Use investigation_approved_at or investigation_closed status as completion marker
  -- Falls back to investigations.completed_at if present
  SELECT
    COALESCE(AVG(
      EXTRACT(EPOCH FROM (
        COALESCE(inv.completed_at, i.investigation_approved_at) - i.occurred_at
      )) / 86400
    ), 0)
  INTO v_avg_investigation_days
  FROM investigations inv
  JOIN incidents i ON inv.incident_id = i.id
  WHERE i.tenant_id = v_tenant_id
    AND i.deleted_at IS NULL
    AND inv.deleted_at IS NULL
    AND (
      inv.completed_at IS NOT NULL
      OR i.investigation_approved_at IS NOT NULL
      OR i.status = 'investigation_closed'
    )
    AND i.occurred_at::date BETWEEN p_start_date AND p_end_date
    AND (p_branch_id IS NULL OR i.branch_id = p_branch_id)
    AND (p_site_id IS NULL OR i.site_id = p_site_id);

  -- Within target (14 days) using same completion logic
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE
      EXTRACT(EPOCH FROM (
        COALESCE(inv.completed_at, i.investigation_approved_at) - i.occurred_at
      )) / 86400 <= 14
    )
  INTO v_total_investigations, v_within_target_count
  FROM investigations inv
  JOIN incidents i ON inv.incident_id = i.id
  WHERE i.tenant_id = v_tenant_id
    AND i.deleted_at IS NULL
    AND inv.deleted_at IS NULL
    AND (
      inv.completed_at IS NOT NULL
      OR i.investigation_approved_at IS NOT NULL
      OR i.status = 'investigation_closed'
    )
    AND i.occurred_at::date BETWEEN p_start_date AND p_end_date
    AND (p_branch_id IS NULL OR i.branch_id = p_branch_id)
    AND (p_site_id IS NULL OR i.site_id = p_site_id);

  v_within_target_pct := CASE
    WHEN v_total_investigations > 0 THEN ROUND((v_within_target_count::numeric / v_total_investigations) * 100, 1)
    ELSE 0
  END;

  -- Repeat incident rate (unchanged)
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
$$;
