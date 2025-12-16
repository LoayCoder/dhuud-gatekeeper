-- Phase 1: Fix Asset Categories RLS Vulnerability
-- Drop the overly permissive policy that allows cross-tenant access
DROP POLICY IF EXISTS "Authenticated users can read asset categories" ON asset_categories;

-- Phase 3: SIMOPS Conflict Detection Function
CREATE OR REPLACE FUNCTION check_simops_conflicts(
  p_type_id UUID,
  p_site_id UUID,
  p_gps_lat DOUBLE PRECISION,
  p_gps_lng DOUBLE PRECISION,
  p_start_time TIMESTAMPTZ,
  p_end_time TIMESTAMPTZ,
  p_exclude_permit_id UUID DEFAULT NULL
) RETURNS TABLE (
  conflicting_permit_id UUID,
  conflicting_reference_id TEXT,
  conflicting_permit_type TEXT,
  conflict_type TEXT,
  distance_meters NUMERIC,
  time_overlap_minutes INT,
  rule_description TEXT,
  auto_reject BOOLEAN
) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_tenant_id UUID;
  v_earth_radius CONSTANT NUMERIC := 6371000; -- meters
BEGIN
  v_tenant_id := get_auth_tenant_id();
  
  RETURN QUERY
  WITH active_permits AS (
    SELECT 
      pp.id,
      pp.reference_id,
      pp.permit_type,
      pp.gps_lat,
      pp.gps_lng,
      pp.valid_from,
      pp.valid_until,
      pt.name as type_name
    FROM ptw_permits pp
    LEFT JOIN ptw_types pt ON pt.id = pp.permit_type_id
    WHERE pp.tenant_id = v_tenant_id
      AND pp.site_id = p_site_id
      AND pp.status IN ('issued', 'activated')
      AND pp.deleted_at IS NULL
      AND (p_exclude_permit_id IS NULL OR pp.id != p_exclude_permit_id)
      AND pp.valid_until > NOW()
  ),
  simops_rules AS (
    SELECT 
      sr.permit_type_a,
      sr.permit_type_b,
      sr.min_distance_meters,
      sr.min_time_gap_minutes,
      sr.conflict_level,
      sr.auto_reject,
      sr.description
    FROM ptw_simops_rules sr
    WHERE sr.is_active = true
      AND sr.deleted_at IS NULL
  ),
  conflict_analysis AS (
    SELECT 
      ap.id as permit_id,
      ap.reference_id,
      ap.type_name,
      sr.description as rule_desc,
      sr.auto_reject,
      -- Haversine distance calculation
      CASE WHEN p_gps_lat IS NOT NULL AND p_gps_lng IS NOT NULL 
           AND ap.gps_lat IS NOT NULL AND ap.gps_lng IS NOT NULL THEN
        v_earth_radius * 2 * ASIN(SQRT(
          POWER(SIN(RADIANS(ap.gps_lat - p_gps_lat) / 2), 2) +
          COS(RADIANS(p_gps_lat)) * COS(RADIANS(ap.gps_lat)) *
          POWER(SIN(RADIANS(ap.gps_lng - p_gps_lng) / 2), 2)
        ))
      ELSE NULL END as distance_m,
      -- Time overlap in minutes
      CASE WHEN ap.valid_from IS NOT NULL AND ap.valid_until IS NOT NULL THEN
        GREATEST(0, EXTRACT(EPOCH FROM (
          LEAST(ap.valid_until, p_end_time) - GREATEST(ap.valid_from, p_start_time)
        )) / 60)::INT
      ELSE 0 END as overlap_mins,
      sr.min_distance_meters,
      sr.min_time_gap_minutes,
      sr.conflict_level
    FROM active_permits ap
    CROSS JOIN simops_rules sr
    WHERE (
      -- Match permit types in either direction
      (ap.permit_type = sr.permit_type_a AND (SELECT permit_type FROM ptw_permits WHERE id = p_type_id) = sr.permit_type_b)
      OR (ap.permit_type = sr.permit_type_b AND (SELECT permit_type FROM ptw_permits WHERE id = p_type_id) = sr.permit_type_a)
      OR (ap.permit_type = sr.permit_type_a OR ap.permit_type = sr.permit_type_b)
    )
  )
  SELECT 
    ca.permit_id,
    ca.reference_id,
    ca.type_name,
    CASE 
      WHEN ca.distance_m IS NOT NULL AND ca.distance_m < ca.min_distance_meters THEN 'spatial'
      WHEN ca.overlap_mins > 0 THEN 'temporal'
      ELSE 'both'
    END as conflict_type,
    ROUND(ca.distance_m, 2),
    ca.overlap_mins,
    ca.rule_desc,
    ca.auto_reject
  FROM conflict_analysis ca
  WHERE (ca.distance_m IS NOT NULL AND ca.distance_m < ca.min_distance_meters)
     OR (ca.overlap_mins > 0 AND ca.min_time_gap_minutes > 0);
END;
$$;

-- Function to get dashboard stats for a user
CREATE OR REPLACE FUNCTION get_dashboard_module_stats()
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_tenant_id UUID;
  v_result JSONB;
BEGIN
  v_tenant_id := get_auth_tenant_id();
  
  SELECT jsonb_build_object(
    'ptw', (
      SELECT jsonb_build_object(
        'active_permits', COUNT(*) FILTER (WHERE status IN ('issued', 'activated')),
        'pending_approvals', COUNT(*) FILTER (WHERE status = 'pending'),
        'expiring_today', COUNT(*) FILTER (WHERE status IN ('issued', 'activated') AND valid_until::date = CURRENT_DATE)
      )
      FROM ptw_permits
      WHERE tenant_id = v_tenant_id AND deleted_at IS NULL
    ),
    'security', (
      SELECT jsonb_build_object(
        'open_alerts', COUNT(*) FILTER (WHERE alert_status = 'pending'),
        'critical_alerts', COUNT(*) FILTER (WHERE alert_status = 'pending' AND alert_type IN ('zone_breach', 'blacklist_match')),
        'visitors_on_site', (
          SELECT COUNT(*) FROM visit_requests 
          WHERE tenant_id = v_tenant_id AND status = 'checked_in' AND deleted_at IS NULL
        )
      )
      FROM geofence_alerts
      WHERE tenant_id = v_tenant_id
    ),
    'inspections', (
      SELECT jsonb_build_object(
        'due_today', COUNT(*) FILTER (WHERE status IN ('draft', 'in_progress') AND scheduled_date::date = CURRENT_DATE),
        'overdue', COUNT(*) FILTER (WHERE status IN ('draft', 'in_progress') AND scheduled_date < CURRENT_DATE),
        'completed_this_week', COUNT(*) FILTER (WHERE status = 'closed' AND completed_at >= CURRENT_DATE - INTERVAL '7 days')
      )
      FROM inspection_sessions
      WHERE tenant_id = v_tenant_id AND deleted_at IS NULL
    ),
    'contractors', (
      SELECT jsonb_build_object(
        'active_workers', COUNT(*) FILTER (WHERE approval_status = 'approved'),
        'pending_approvals', COUNT(*) FILTER (WHERE approval_status = 'pending'),
        'expiring_inductions', (
          SELECT COUNT(*) FROM worker_inductions wi
          JOIN contractor_workers cw ON cw.id = wi.worker_id
          WHERE cw.tenant_id = v_tenant_id AND wi.expires_at < CURRENT_DATE + INTERVAL '7 days' AND wi.deleted_at IS NULL
        )
      )
      FROM contractor_workers
      WHERE tenant_id = v_tenant_id AND deleted_at IS NULL
    ),
    'actions', (
      SELECT jsonb_build_object(
        'my_pending', COUNT(*) FILTER (WHERE assigned_to = auth.uid() AND status NOT IN ('verified', 'closed', 'rejected')),
        'overdue', COUNT(*) FILTER (WHERE status NOT IN ('verified', 'closed', 'rejected') AND due_date < CURRENT_DATE),
        'due_this_week', COUNT(*) FILTER (WHERE status NOT IN ('verified', 'closed', 'rejected') AND due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days')
      )
      FROM corrective_actions
      WHERE tenant_id = v_tenant_id AND deleted_at IS NULL
    )
  ) INTO v_result;
  
  RETURN v_result;
END;
$$;