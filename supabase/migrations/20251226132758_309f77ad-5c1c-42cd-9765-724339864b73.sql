-- Add residual risk tracking columns to corrective_actions
ALTER TABLE public.corrective_actions
ADD COLUMN IF NOT EXISTS initial_risk_level text,
ADD COLUMN IF NOT EXISTS residual_risk_level text,
ADD COLUMN IF NOT EXISTS risk_reduction_score integer GENERATED ALWAYS AS (
  CASE 
    WHEN initial_risk_level IS NOT NULL AND residual_risk_level IS NOT NULL THEN
      CASE initial_risk_level
        WHEN 'level_5' THEN 5
        WHEN 'level_4' THEN 4
        WHEN 'level_3' THEN 3
        WHEN 'level_2' THEN 2
        WHEN 'level_1' THEN 1
        ELSE 0
      END
      -
      CASE residual_risk_level
        WHEN 'level_5' THEN 5
        WHEN 'level_4' THEN 4
        WHEN 'level_3' THEN 3
        WHEN 'level_2' THEN 2
        WHEN 'level_1' THEN 1
        ELSE 0
      END
    ELSE NULL
  END
) STORED;

-- Create RPC function to get observation trend analytics
CREATE OR REPLACE FUNCTION get_observation_trend_analytics(
  p_start_date timestamptz DEFAULT NULL,
  p_end_date timestamptz DEFAULT NULL,
  p_branch_id uuid DEFAULT NULL,
  p_site_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id uuid;
  v_result jsonb;
  v_start_date timestamptz;
  v_end_date timestamptz;
BEGIN
  -- Get tenant ID from auth context
  v_tenant_id := get_auth_tenant_id();
  
  IF v_tenant_id IS NULL THEN
    RETURN jsonb_build_object('error', 'No tenant context');
  END IF;
  
  -- Default date range: last 12 months
  v_start_date := COALESCE(p_start_date, now() - interval '12 months');
  v_end_date := COALESCE(p_end_date, now());
  
  SELECT jsonb_build_object(
    'by_month', (
      SELECT jsonb_agg(row_to_json(m))
      FROM (
        SELECT 
          to_char(date_trunc('month', i.occurred_at), 'YYYY-MM') as month,
          COUNT(*) FILTER (WHERE i.subtype IN ('safe_act', 'safe_condition')) as positive,
          COUNT(*) FILTER (WHERE i.subtype IN ('unsafe_act', 'unsafe_condition')) as negative,
          COUNT(*) as total
        FROM incidents i
        WHERE i.tenant_id = v_tenant_id
          AND i.event_type = 'observation'
          AND i.deleted_at IS NULL
          AND i.occurred_at BETWEEN v_start_date AND v_end_date
          AND (p_branch_id IS NULL OR i.branch_id = p_branch_id)
          AND (p_site_id IS NULL OR i.site_id = p_site_id)
        GROUP BY date_trunc('month', i.occurred_at)
        ORDER BY date_trunc('month', i.occurred_at)
      ) m
    ),
    'by_department', (
      SELECT jsonb_agg(row_to_json(d))
      FROM (
        SELECT 
          dep.id as department_id,
          dep.name as department_name,
          COUNT(*) FILTER (WHERE i.subtype IN ('safe_act', 'safe_condition')) as positive,
          COUNT(*) FILTER (WHERE i.subtype IN ('unsafe_act', 'unsafe_condition')) as negative,
          COUNT(*) as total,
          CASE 
            WHEN COUNT(*) FILTER (WHERE i.subtype IN ('unsafe_act', 'unsafe_condition')) > 0 
            THEN ROUND(
              COUNT(*) FILTER (WHERE i.subtype IN ('safe_act', 'safe_condition'))::numeric / 
              NULLIF(COUNT(*) FILTER (WHERE i.subtype IN ('unsafe_act', 'unsafe_condition')), 0), 2
            )
            ELSE NULL
          END as positive_ratio
        FROM incidents i
        JOIN departments dep ON i.department_id = dep.id
        WHERE i.tenant_id = v_tenant_id
          AND i.event_type = 'observation'
          AND i.deleted_at IS NULL
          AND i.occurred_at BETWEEN v_start_date AND v_end_date
          AND (p_branch_id IS NULL OR i.branch_id = p_branch_id)
          AND (p_site_id IS NULL OR i.site_id = p_site_id)
        GROUP BY dep.id, dep.name
        ORDER BY total DESC
        LIMIT 15
      ) d
    ),
    'by_site', (
      SELECT jsonb_agg(row_to_json(s))
      FROM (
        SELECT 
          st.id as site_id,
          st.name as site_name,
          COUNT(*) FILTER (WHERE i.subtype IN ('safe_act', 'safe_condition')) as positive,
          COUNT(*) FILTER (WHERE i.subtype IN ('unsafe_act', 'unsafe_condition')) as negative,
          COUNT(*) as total,
          CASE 
            WHEN COUNT(*) FILTER (WHERE i.subtype IN ('unsafe_act', 'unsafe_condition')) > 0 
            THEN ROUND(
              COUNT(*) FILTER (WHERE i.subtype IN ('safe_act', 'safe_condition'))::numeric / 
              NULLIF(COUNT(*) FILTER (WHERE i.subtype IN ('unsafe_act', 'unsafe_condition')), 0), 2
            )
            ELSE NULL
          END as positive_ratio
        FROM incidents i
        JOIN sites st ON i.site_id = st.id
        WHERE i.tenant_id = v_tenant_id
          AND i.event_type = 'observation'
          AND i.deleted_at IS NULL
          AND i.occurred_at BETWEEN v_start_date AND v_end_date
          AND (p_branch_id IS NULL OR i.branch_id = p_branch_id)
        GROUP BY st.id, st.name
        ORDER BY total DESC
        LIMIT 15
      ) s
    ),
    'summary', (
      SELECT row_to_json(sum)
      FROM (
        SELECT 
          COUNT(*) FILTER (WHERE subtype IN ('safe_act', 'safe_condition')) as total_positive,
          COUNT(*) FILTER (WHERE subtype IN ('unsafe_act', 'unsafe_condition')) as total_negative,
          COUNT(*) as total_observations,
          CASE 
            WHEN COUNT(*) FILTER (WHERE subtype IN ('unsafe_act', 'unsafe_condition')) > 0 
            THEN ROUND(
              COUNT(*) FILTER (WHERE subtype IN ('safe_act', 'safe_condition'))::numeric / 
              NULLIF(COUNT(*) FILTER (WHERE subtype IN ('unsafe_act', 'unsafe_condition')), 0), 2
            )
            ELSE NULL
          END as overall_ratio
        FROM incidents
        WHERE tenant_id = v_tenant_id
          AND event_type = 'observation'
          AND deleted_at IS NULL
          AND occurred_at BETWEEN v_start_date AND v_end_date
          AND (p_branch_id IS NULL OR branch_id = p_branch_id)
          AND (p_site_id IS NULL OR site_id = p_site_id)
      ) sum
    )
  ) INTO v_result;
  
  RETURN v_result;
END;
$$;

-- Create RPC function to get residual risk metrics
CREATE OR REPLACE FUNCTION get_residual_risk_metrics(
  p_start_date timestamptz DEFAULT NULL,
  p_end_date timestamptz DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id uuid;
  v_result jsonb;
  v_start_date timestamptz;
  v_end_date timestamptz;
BEGIN
  v_tenant_id := get_auth_tenant_id();
  
  IF v_tenant_id IS NULL THEN
    RETURN jsonb_build_object('error', 'No tenant context');
  END IF;
  
  v_start_date := COALESCE(p_start_date, now() - interval '12 months');
  v_end_date := COALESCE(p_end_date, now());
  
  SELECT jsonb_build_object(
    'summary', (
      SELECT row_to_json(s)
      FROM (
        SELECT 
          COUNT(*) FILTER (WHERE risk_reduction_score IS NOT NULL) as total_assessed,
          ROUND(AVG(risk_reduction_score) FILTER (WHERE risk_reduction_score IS NOT NULL), 2) as avg_risk_reduction,
          COUNT(*) FILTER (WHERE risk_reduction_score > 0) as improved_count,
          COUNT(*) FILTER (WHERE risk_reduction_score = 0) as unchanged_count,
          COUNT(*) FILTER (WHERE risk_reduction_score < 0) as worsened_count,
          ROUND(
            100.0 * COUNT(*) FILTER (WHERE risk_reduction_score > 0) / 
            NULLIF(COUNT(*) FILTER (WHERE risk_reduction_score IS NOT NULL), 0), 1
          ) as effectiveness_rate
        FROM corrective_actions
        WHERE tenant_id = v_tenant_id
          AND deleted_at IS NULL
          AND status = 'closed'
          AND updated_at BETWEEN v_start_date AND v_end_date
      ) s
    ),
    'by_initial_level', (
      SELECT jsonb_agg(row_to_json(l))
      FROM (
        SELECT 
          initial_risk_level,
          COUNT(*) as count,
          ROUND(AVG(risk_reduction_score), 2) as avg_reduction
        FROM corrective_actions
        WHERE tenant_id = v_tenant_id
          AND deleted_at IS NULL
          AND initial_risk_level IS NOT NULL
          AND updated_at BETWEEN v_start_date AND v_end_date
        GROUP BY initial_risk_level
        ORDER BY 
          CASE initial_risk_level
            WHEN 'level_5' THEN 1
            WHEN 'level_4' THEN 2
            WHEN 'level_3' THEN 3
            WHEN 'level_2' THEN 4
            WHEN 'level_1' THEN 5
          END
      ) l
    ),
    'monthly_trend', (
      SELECT jsonb_agg(row_to_json(m))
      FROM (
        SELECT 
          to_char(date_trunc('month', updated_at), 'YYYY-MM') as month,
          COUNT(*) FILTER (WHERE risk_reduction_score IS NOT NULL) as assessed_count,
          ROUND(AVG(risk_reduction_score) FILTER (WHERE risk_reduction_score IS NOT NULL), 2) as avg_reduction
        FROM corrective_actions
        WHERE tenant_id = v_tenant_id
          AND deleted_at IS NULL
          AND updated_at BETWEEN v_start_date AND v_end_date
        GROUP BY date_trunc('month', updated_at)
        ORDER BY date_trunc('month', updated_at)
      ) m
    )
  ) INTO v_result;
  
  RETURN v_result;
END;
$$;

-- Create RPC function to get pending HSSE validations with stats
CREATE OR REPLACE FUNCTION get_hsse_validation_dashboard(
  p_severity_filter text DEFAULT NULL,
  p_site_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id uuid;
  v_result jsonb;
BEGIN
  v_tenant_id := get_auth_tenant_id();
  
  IF v_tenant_id IS NULL THEN
    RETURN jsonb_build_object('error', 'No tenant context');
  END IF;
  
  SELECT jsonb_build_object(
    'stats', (
      SELECT row_to_json(s)
      FROM (
        SELECT 
          COUNT(*) FILTER (WHERE status = 'pending_hsse_validation') as pending_validation,
          COUNT(*) FILTER (WHERE status = 'pending_final_closure') as pending_closure,
          COUNT(*) FILTER (WHERE status = 'pending_hsse_validation' AND severity_v2 = 'level_3') as level_3_count,
          COUNT(*) FILTER (WHERE status = 'pending_hsse_validation' AND severity_v2 = 'level_4') as level_4_count,
          COUNT(*) FILTER (WHERE status IN ('pending_hsse_validation', 'pending_final_closure') AND severity_v2 = 'level_5') as level_5_count,
          ROUND(
            EXTRACT(EPOCH FROM AVG(now() - created_at) FILTER (WHERE status = 'pending_hsse_validation')) / 86400, 1
          ) as avg_pending_days
        FROM incidents
        WHERE tenant_id = v_tenant_id
          AND event_type = 'observation'
          AND deleted_at IS NULL
          AND status IN ('pending_hsse_validation', 'pending_final_closure')
      ) s
    ),
    'pending_validations', (
      SELECT jsonb_agg(row_to_json(p))
      FROM (
        SELECT 
          i.id,
          i.reference_id,
          i.title,
          i.severity_v2,
          i.status,
          i.created_at,
          i.occurred_at,
          EXTRACT(DAY FROM now() - i.created_at) as days_pending,
          s.name as site_name,
          b.name as branch_name,
          r.full_name as reporter_name
        FROM incidents i
        LEFT JOIN sites s ON i.site_id = s.id
        LEFT JOIN branches b ON i.branch_id = b.id
        LEFT JOIN profiles r ON i.reporter_id = r.id
        WHERE i.tenant_id = v_tenant_id
          AND i.event_type = 'observation'
          AND i.deleted_at IS NULL
          AND i.status IN ('pending_hsse_validation', 'pending_final_closure')
          AND (p_severity_filter IS NULL OR i.severity_v2 = p_severity_filter)
          AND (p_site_id IS NULL OR i.site_id = p_site_id)
        ORDER BY 
          CASE i.severity_v2
            WHEN 'level_5' THEN 1
            WHEN 'level_4' THEN 2
            WHEN 'level_3' THEN 3
            ELSE 4
          END,
          i.created_at ASC
      ) p
    )
  ) INTO v_result;
  
  RETURN v_result;
END;
$$;