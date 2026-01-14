-- Cross-Branch Analytics RPC Function
-- Provides aggregated data for observations by location branch vs reporter branch

CREATE OR REPLACE FUNCTION public.get_cross_branch_analytics(
  p_tenant_id UUID,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL,
  p_location_branch_id UUID DEFAULT NULL,
  p_reporter_branch_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
  v_summary JSONB;
  v_by_location JSONB;
  v_by_reporter JSONB;
  v_matrix JSONB;
BEGIN
  -- Overall summary
  SELECT jsonb_build_object(
    'total_observations', COUNT(*),
    'cross_branch_count', COUNT(*) FILTER (WHERE i.branch_id IS DISTINCT FROM i.reporter_branch_id AND i.reporter_branch_id IS NOT NULL),
    'same_branch_count', COUNT(*) FILTER (WHERE i.branch_id = i.reporter_branch_id OR i.reporter_branch_id IS NULL),
    'cross_branch_percentage', 
      CASE 
        WHEN COUNT(*) > 0 THEN 
          ROUND((COUNT(*) FILTER (WHERE i.branch_id IS DISTINCT FROM i.reporter_branch_id AND i.reporter_branch_id IS NOT NULL)::NUMERIC / COUNT(*)::NUMERIC) * 100, 1)
        ELSE 0 
      END
  )
  INTO v_summary
  FROM incidents i
  WHERE i.tenant_id = p_tenant_id
    AND i.deleted_at IS NULL
    AND i.event_type = 'observation'
    AND (p_start_date IS NULL OR i.incident_date >= p_start_date)
    AND (p_end_date IS NULL OR i.incident_date <= p_end_date)
    AND (p_location_branch_id IS NULL OR i.branch_id = p_location_branch_id)
    AND (p_reporter_branch_id IS NULL OR i.reporter_branch_id = p_reporter_branch_id);

  -- By location branch (where observation occurred)
  SELECT COALESCE(jsonb_agg(row_data ORDER BY total DESC), '[]'::jsonb)
  INTO v_by_location
  FROM (
    SELECT 
      jsonb_build_object(
        'branch_id', b.id,
        'branch_name', b.name,
        'branch_name_ar', b.name_ar,
        'total', COUNT(*),
        'from_same_branch', COUNT(*) FILTER (WHERE i.branch_id = i.reporter_branch_id OR i.reporter_branch_id IS NULL),
        'from_other_branches', COUNT(*) FILTER (WHERE i.branch_id IS DISTINCT FROM i.reporter_branch_id AND i.reporter_branch_id IS NOT NULL)
      ) as row_data,
      COUNT(*) as total
    FROM incidents i
    JOIN branches b ON b.id = i.branch_id
    WHERE i.tenant_id = p_tenant_id
      AND i.deleted_at IS NULL
      AND i.event_type = 'observation'
      AND (p_start_date IS NULL OR i.incident_date >= p_start_date)
      AND (p_end_date IS NULL OR i.incident_date <= p_end_date)
      AND (p_location_branch_id IS NULL OR i.branch_id = p_location_branch_id)
      AND (p_reporter_branch_id IS NULL OR i.reporter_branch_id = p_reporter_branch_id)
    GROUP BY b.id, b.name, b.name_ar
  ) sub;

  -- By reporter branch (reporter's home branch)
  SELECT COALESCE(jsonb_agg(row_data ORDER BY total_reported DESC), '[]'::jsonb)
  INTO v_by_reporter
  FROM (
    SELECT 
      jsonb_build_object(
        'branch_id', COALESCE(rb.id, i.branch_id),
        'branch_name', COALESCE(rb.name, lb.name, 'Unknown'),
        'branch_name_ar', COALESCE(rb.name_ar, lb.name_ar),
        'total_reported', COUNT(*),
        'reported_at_home', COUNT(*) FILTER (WHERE i.branch_id = i.reporter_branch_id OR i.reporter_branch_id IS NULL),
        'reported_elsewhere', COUNT(*) FILTER (WHERE i.branch_id IS DISTINCT FROM i.reporter_branch_id AND i.reporter_branch_id IS NOT NULL)
      ) as row_data,
      COUNT(*) as total_reported
    FROM incidents i
    LEFT JOIN branches rb ON rb.id = i.reporter_branch_id
    LEFT JOIN branches lb ON lb.id = i.branch_id
    WHERE i.tenant_id = p_tenant_id
      AND i.deleted_at IS NULL
      AND i.event_type = 'observation'
      AND (p_start_date IS NULL OR i.incident_date >= p_start_date)
      AND (p_end_date IS NULL OR i.incident_date <= p_end_date)
      AND (p_location_branch_id IS NULL OR i.branch_id = p_location_branch_id)
      AND (p_reporter_branch_id IS NULL OR i.reporter_branch_id = p_reporter_branch_id)
    GROUP BY COALESCE(rb.id, i.branch_id), COALESCE(rb.name, lb.name, 'Unknown'), COALESCE(rb.name_ar, lb.name_ar)
  ) sub;

  -- Cross-branch matrix (location vs reporter)
  SELECT COALESCE(jsonb_agg(row_data ORDER BY count DESC), '[]'::jsonb)
  INTO v_matrix
  FROM (
    SELECT 
      jsonb_build_object(
        'location_branch_id', lb.id,
        'location_branch_name', lb.name,
        'location_branch_name_ar', lb.name_ar,
        'reporter_branch_id', COALESCE(rb.id, lb.id),
        'reporter_branch_name', COALESCE(rb.name, lb.name),
        'reporter_branch_name_ar', COALESCE(rb.name_ar, lb.name_ar),
        'count', COUNT(*),
        'is_cross_branch', lb.id IS DISTINCT FROM COALESCE(rb.id, lb.id)
      ) as row_data,
      COUNT(*) as count
    FROM incidents i
    JOIN branches lb ON lb.id = i.branch_id
    LEFT JOIN branches rb ON rb.id = i.reporter_branch_id
    WHERE i.tenant_id = p_tenant_id
      AND i.deleted_at IS NULL
      AND i.event_type = 'observation'
      AND (p_start_date IS NULL OR i.incident_date >= p_start_date)
      AND (p_end_date IS NULL OR i.incident_date <= p_end_date)
      AND (p_location_branch_id IS NULL OR i.branch_id = p_location_branch_id)
      AND (p_reporter_branch_id IS NULL OR i.reporter_branch_id = p_reporter_branch_id)
    GROUP BY lb.id, lb.name, lb.name_ar, COALESCE(rb.id, lb.id), COALESCE(rb.name, lb.name), COALESCE(rb.name_ar, lb.name_ar)
  ) sub;

  -- Build final result
  v_result := jsonb_build_object(
    'summary', v_summary,
    'by_location_branch', v_by_location,
    'by_reporter_branch', v_by_reporter,
    'cross_branch_matrix', v_matrix
  );

  RETURN v_result;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_cross_branch_analytics(UUID, DATE, DATE, UUID, UUID) TO authenticated;