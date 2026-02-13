
CREATE OR REPLACE FUNCTION public.get_response_metrics(
  p_start_date DATE DEFAULT (CURRENT_DATE - INTERVAL '12 months')::date,
  p_end_date DATE DEFAULT CURRENT_DATE,
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

  -- AVG investigation days with updated_at as third fallback
  SELECT
    COALESCE(AVG(
      EXTRACT(EPOCH FROM (
        COALESCE(inv.completed_at, i.investigation_approved_at, i.updated_at) - i.occurred_at
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

  -- Within target (14 days) with same updated_at fallback
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE
      EXTRACT(EPOCH FROM (
        COALESCE(inv.completed_at, i.investigation_approved_at, i.updated_at) - i.occurred_at
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
