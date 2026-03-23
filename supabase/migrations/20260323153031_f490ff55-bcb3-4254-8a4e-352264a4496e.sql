
-- =============================================
-- RLS & Tenant Isolation System-Wide Fix
-- Part 1: Drop 8 stale duplicate policies
-- Part 2: Fix 6 tables with broken policies  
-- Part 3: Fix get_hsse_dashboard_summary function
-- =============================================

-- ============ PART 1: Drop stale duplicates ============

-- asset_inspection_part_results: drop old app_metadata policies
DROP POLICY IF EXISTS "Users can view part results for their tenant" ON public.asset_inspection_part_results;
DROP POLICY IF EXISTS "Users can insert part results for their tenant" ON public.asset_inspection_part_results;
DROP POLICY IF EXISTS "Users can update part results for their tenant" ON public.asset_inspection_part_results;
DROP POLICY IF EXISTS "Users can delete part results for their tenant" ON public.asset_inspection_part_results;

-- asset_type_parts: drop old get_auth_tenant_id() policies (duplicates of new ones)
DROP POLICY IF EXISTS "Users can view parts for their tenant" ON public.asset_type_parts;
DROP POLICY IF EXISTS "Users can insert parts for their tenant" ON public.asset_type_parts;
DROP POLICY IF EXISTS "Users can update parts for their tenant" ON public.asset_type_parts;
DROP POLICY IF EXISTS "Users can delete parts for their tenant" ON public.asset_type_parts;

-- ============ PART 2: Fix 6 tables with broken policies ============

-- 1. contractor_violation_summary
DROP POLICY IF EXISTS "Tenant isolation for contractor_violation_summary" ON public.contractor_violation_summary;

CREATE POLICY "Tenant users can select contractor_violation_summary"
ON public.contractor_violation_summary FOR SELECT TO authenticated
USING (tenant_id IN (
  SELECT tenant_id FROM public.profiles WHERE id = auth.uid() AND deleted_at IS NULL
));

CREATE POLICY "Tenant users can insert contractor_violation_summary"
ON public.contractor_violation_summary FOR INSERT TO authenticated
WITH CHECK (tenant_id IN (
  SELECT tenant_id FROM public.profiles WHERE id = auth.uid() AND deleted_at IS NULL
));

CREATE POLICY "Tenant users can update contractor_violation_summary"
ON public.contractor_violation_summary FOR UPDATE TO authenticated
USING (tenant_id IN (
  SELECT tenant_id FROM public.profiles WHERE id = auth.uid() AND deleted_at IS NULL
))
WITH CHECK (tenant_id IN (
  SELECT tenant_id FROM public.profiles WHERE id = auth.uid() AND deleted_at IS NULL
));

CREATE POLICY "Tenant users can delete contractor_violation_summary"
ON public.contractor_violation_summary FOR DELETE TO authenticated
USING (tenant_id IN (
  SELECT tenant_id FROM public.profiles WHERE id = auth.uid() AND deleted_at IS NULL
));

-- 2. system_alerts
DROP POLICY IF EXISTS "Tenant isolation for system_alerts" ON public.system_alerts;

CREATE POLICY "Tenant users can select system_alerts"
ON public.system_alerts FOR SELECT TO authenticated
USING (tenant_id IN (
  SELECT tenant_id FROM public.profiles WHERE id = auth.uid() AND deleted_at IS NULL
));

CREATE POLICY "Tenant users can insert system_alerts"
ON public.system_alerts FOR INSERT TO authenticated
WITH CHECK (tenant_id IN (
  SELECT tenant_id FROM public.profiles WHERE id = auth.uid() AND deleted_at IS NULL
));

CREATE POLICY "Tenant users can update system_alerts"
ON public.system_alerts FOR UPDATE TO authenticated
USING (tenant_id IN (
  SELECT tenant_id FROM public.profiles WHERE id = auth.uid() AND deleted_at IS NULL
))
WITH CHECK (tenant_id IN (
  SELECT tenant_id FROM public.profiles WHERE id = auth.uid() AND deleted_at IS NULL
));

CREATE POLICY "Tenant users can delete system_alerts"
ON public.system_alerts FOR DELETE TO authenticated
USING (tenant_id IN (
  SELECT tenant_id FROM public.profiles WHERE id = auth.uid() AND deleted_at IS NULL
));

-- 3. visitor_access_rules
DROP POLICY IF EXISTS "tenant_isolation_visitor_access_rules" ON public.visitor_access_rules;

CREATE POLICY "Tenant users can select visitor_access_rules"
ON public.visitor_access_rules FOR SELECT TO authenticated
USING (tenant_id IN (
  SELECT tenant_id FROM public.profiles WHERE id = auth.uid() AND deleted_at IS NULL
));

CREATE POLICY "Tenant users can insert visitor_access_rules"
ON public.visitor_access_rules FOR INSERT TO authenticated
WITH CHECK (tenant_id IN (
  SELECT tenant_id FROM public.profiles WHERE id = auth.uid() AND deleted_at IS NULL
));

CREATE POLICY "Tenant users can update visitor_access_rules"
ON public.visitor_access_rules FOR UPDATE TO authenticated
USING (tenant_id IN (
  SELECT tenant_id FROM public.profiles WHERE id = auth.uid() AND deleted_at IS NULL
))
WITH CHECK (tenant_id IN (
  SELECT tenant_id FROM public.profiles WHERE id = auth.uid() AND deleted_at IS NULL
));

CREATE POLICY "Tenant users can delete visitor_access_rules"
ON public.visitor_access_rules FOR DELETE TO authenticated
USING (tenant_id IN (
  SELECT tenant_id FROM public.profiles WHERE id = auth.uid() AND deleted_at IS NULL
));

-- 4. visitor_approvals
DROP POLICY IF EXISTS "tenant_isolation_visitor_approvals" ON public.visitor_approvals;

CREATE POLICY "Tenant users can select visitor_approvals"
ON public.visitor_approvals FOR SELECT TO authenticated
USING (tenant_id IN (
  SELECT tenant_id FROM public.profiles WHERE id = auth.uid() AND deleted_at IS NULL
));

CREATE POLICY "Tenant users can insert visitor_approvals"
ON public.visitor_approvals FOR INSERT TO authenticated
WITH CHECK (tenant_id IN (
  SELECT tenant_id FROM public.profiles WHERE id = auth.uid() AND deleted_at IS NULL
));

CREATE POLICY "Tenant users can update visitor_approvals"
ON public.visitor_approvals FOR UPDATE TO authenticated
USING (tenant_id IN (
  SELECT tenant_id FROM public.profiles WHERE id = auth.uid() AND deleted_at IS NULL
))
WITH CHECK (tenant_id IN (
  SELECT tenant_id FROM public.profiles WHERE id = auth.uid() AND deleted_at IS NULL
));

CREATE POLICY "Tenant users can delete visitor_approvals"
ON public.visitor_approvals FOR DELETE TO authenticated
USING (tenant_id IN (
  SELECT tenant_id FROM public.profiles WHERE id = auth.uid() AND deleted_at IS NULL
));

-- 5. visitor_audit_log (SELECT + INSERT for logging)
DROP POLICY IF EXISTS "tenant_isolation_visitor_audit" ON public.visitor_audit_log;

CREATE POLICY "Tenant users can select visitor_audit_log"
ON public.visitor_audit_log FOR SELECT TO authenticated
USING (tenant_id IN (
  SELECT tenant_id FROM public.profiles WHERE id = auth.uid() AND deleted_at IS NULL
));

CREATE POLICY "Tenant users can insert visitor_audit_log"
ON public.visitor_audit_log FOR INSERT TO authenticated
WITH CHECK (tenant_id IN (
  SELECT tenant_id FROM public.profiles WHERE id = auth.uid() AND deleted_at IS NULL
));

-- 6. visitor_inductions
DROP POLICY IF EXISTS "tenant_isolation_visitor_inductions" ON public.visitor_inductions;

CREATE POLICY "Tenant users can select visitor_inductions"
ON public.visitor_inductions FOR SELECT TO authenticated
USING (tenant_id IN (
  SELECT tenant_id FROM public.profiles WHERE id = auth.uid() AND deleted_at IS NULL
));

CREATE POLICY "Tenant users can insert visitor_inductions"
ON public.visitor_inductions FOR INSERT TO authenticated
WITH CHECK (tenant_id IN (
  SELECT tenant_id FROM public.profiles WHERE id = auth.uid() AND deleted_at IS NULL
));

CREATE POLICY "Tenant users can update visitor_inductions"
ON public.visitor_inductions FOR UPDATE TO authenticated
USING (tenant_id IN (
  SELECT tenant_id FROM public.profiles WHERE id = auth.uid() AND deleted_at IS NULL
))
WITH CHECK (tenant_id IN (
  SELECT tenant_id FROM public.profiles WHERE id = auth.uid() AND deleted_at IS NULL
));

CREATE POLICY "Tenant users can delete visitor_inductions"
ON public.visitor_inductions FOR DELETE TO authenticated
USING (tenant_id IN (
  SELECT tenant_id FROM public.profiles WHERE id = auth.uid() AND deleted_at IS NULL
));

-- ============ PART 3: Fix get_hsse_dashboard_summary function ============

DROP FUNCTION IF EXISTS public.get_hsse_dashboard_summary(date, date, uuid, uuid);

CREATE OR REPLACE FUNCTION public.get_hsse_dashboard_summary(
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL,
  p_branch_id uuid DEFAULT NULL,
  p_site_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_tenant_id uuid;
  v_result jsonb;
  v_summary jsonb;
  v_by_status jsonb;
  v_by_severity jsonb;
  v_by_event_type jsonb;
  v_by_subtype jsonb;
  v_monthly_trend jsonb;
  v_actions jsonb;
  v_now timestamptz := now();
  v_closed_statuses text[] := ARRAY[
    'closed', 'closed_rejected_approved_by_hsse',
    'contractor_violation_cancelled', 'contractor_violation_terminated',
    'contractor_violation_warning', 'dept_rep_rejected', 'expert_rejected',
    'manager_rejected', 'upgraded_to_incident'
  ];
BEGIN
  -- Try JWT first, fallback to profiles table
  v_tenant_id := (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid;
  IF v_tenant_id IS NULL THEN
    SELECT tenant_id INTO v_tenant_id FROM public.profiles WHERE id = auth.uid() AND deleted_at IS NULL LIMIT 1;
  END IF;
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Could not determine tenant_id for current user';
  END IF;

  -- Summary counts
  SELECT jsonb_build_object(
    'total_events', COUNT(*),
    'total_incidents', COUNT(*) FILTER (WHERE event_type = 'incident'),
    'total_observations', COUNT(*) FILTER (WHERE event_type = 'observation'),
    'incidents_open', COUNT(*) FILTER (WHERE event_type = 'incident' AND status::text != ALL(v_closed_statuses)),
    'incidents_closed', COUNT(*) FILTER (WHERE event_type = 'incident' AND status::text = ANY(v_closed_statuses)),
    'observations_open', COUNT(*) FILTER (WHERE event_type = 'observation' AND status::text != ALL(v_closed_statuses)),
    'observations_closed', COUNT(*) FILTER (WHERE event_type = 'observation' AND status::text = ANY(v_closed_statuses)),
    'pending_closure', COUNT(*) FILTER (WHERE status = 'pending_final_closure'),
    'closed_in_period', COUNT(*) FILTER (WHERE status = 'closed'),
    'near_miss_count', COUNT(*) FILTER (WHERE event_type = 'incident' AND incident_type = 'near_miss'),
    'incidents_overdue', COUNT(*) FILTER (
      WHERE event_type = 'incident' 
        AND status::text != ALL(v_closed_statuses)
        AND EXTRACT(EPOCH FROM (v_now - created_at)) / 3600 > 
          CASE severity_v2
            WHEN 'level_5' THEN 24
            WHEN 'level_4' THEN 72
            WHEN 'level_3' THEN 168
            WHEN 'level_2' THEN 336
            ELSE 720
          END
    )
  )
  INTO v_summary
  FROM incidents
  WHERE tenant_id = v_tenant_id
    AND deleted_at IS NULL
    AND (p_start_date IS NULL OR created_at >= p_start_date::timestamptz)
    AND (p_end_date IS NULL OR created_at <= (p_end_date + interval '1 day')::timestamptz)
    AND (p_branch_id IS NULL OR branch_id = p_branch_id)
    AND (p_site_id IS NULL OR site_id = p_site_id);

  -- Investigation counts
  v_summary := v_summary || (
    SELECT jsonb_build_object(
      'total_investigations', COUNT(*),
      'investigations_open', COUNT(*) FILTER (WHERE inv.completed_at IS NULL),
      'investigations_closed', COUNT(*) FILTER (WHERE inv.completed_at IS NOT NULL),
      'open_investigations', COUNT(*) FILTER (WHERE inv.completed_at IS NULL)
    )
    FROM investigations inv
    JOIN incidents i ON i.id = inv.incident_id
    WHERE i.tenant_id = v_tenant_id
      AND i.deleted_at IS NULL
      AND inv.deleted_at IS NULL
      AND (p_start_date IS NULL OR i.created_at >= p_start_date::timestamptz)
      AND (p_end_date IS NULL OR i.created_at <= (p_end_date + interval '1 day')::timestamptz)
      AND (p_branch_id IS NULL OR i.branch_id = p_branch_id)
      AND (p_site_id IS NULL OR i.site_id = p_site_id)
  );

  -- Average closure days
  v_summary := v_summary || (
    SELECT jsonb_build_object(
      'avg_closure_days', COALESCE(
        ROUND(AVG(EXTRACT(EPOCH FROM (updated_at - created_at)) / 86400)::numeric, 1),
        0
      )
    )
    FROM incidents
    WHERE tenant_id = v_tenant_id
      AND deleted_at IS NULL
      AND status = 'closed'
      AND (p_start_date IS NULL OR created_at >= p_start_date::timestamptz)
      AND (p_end_date IS NULL OR created_at <= (p_end_date + interval '1 day')::timestamptz)
      AND (p_branch_id IS NULL OR branch_id = p_branch_id)
      AND (p_site_id IS NULL OR site_id = p_site_id)
  );

  -- Status distribution
  SELECT COALESCE(jsonb_object_agg(status::text, cnt), '{}'::jsonb)
  INTO v_by_status
  FROM (
    SELECT status, COUNT(*) as cnt
    FROM incidents
    WHERE tenant_id = v_tenant_id
      AND deleted_at IS NULL
      AND (p_start_date IS NULL OR created_at >= p_start_date::timestamptz)
      AND (p_end_date IS NULL OR created_at <= (p_end_date + interval '1 day')::timestamptz)
      AND (p_branch_id IS NULL OR branch_id = p_branch_id)
      AND (p_site_id IS NULL OR site_id = p_site_id)
    GROUP BY status
  ) s;

  -- Severity distribution
  SELECT jsonb_build_object(
    'level_1', COUNT(*) FILTER (WHERE severity_v2 = 'level_1'),
    'level_2', COUNT(*) FILTER (WHERE severity_v2 = 'level_2'),
    'level_3', COUNT(*) FILTER (WHERE severity_v2 = 'level_3'),
    'level_4', COUNT(*) FILTER (WHERE severity_v2 = 'level_4'),
    'level_5', COUNT(*) FILTER (WHERE severity_v2 = 'level_5'),
    'unassigned', COUNT(*) FILTER (WHERE severity_v2 IS NULL OR severity_v2 NOT IN ('level_1','level_2','level_3','level_4','level_5'))
  )
  INTO v_by_severity
  FROM incidents
  WHERE tenant_id = v_tenant_id
    AND deleted_at IS NULL
    AND (p_start_date IS NULL OR created_at >= p_start_date::timestamptz)
    AND (p_end_date IS NULL OR created_at <= (p_end_date + interval '1 day')::timestamptz)
    AND (p_branch_id IS NULL OR branch_id = p_branch_id)
    AND (p_site_id IS NULL OR site_id = p_site_id);

  -- Event type distribution
  SELECT jsonb_build_object(
    'observation', COUNT(*) FILTER (WHERE event_type = 'observation'),
    'incident', COUNT(*) FILTER (WHERE event_type = 'incident' AND (incident_type IS NULL OR incident_type NOT IN ('near_miss', 'security', 'environmental'))),
    'near_miss', COUNT(*) FILTER (WHERE event_type = 'incident' AND incident_type = 'near_miss'),
    'security_event', COUNT(*) FILTER (WHERE event_type = 'incident' AND incident_type = 'security'),
    'environmental_event', COUNT(*) FILTER (WHERE event_type = 'incident' AND incident_type = 'environmental')
  )
  INTO v_by_event_type
  FROM incidents
  WHERE tenant_id = v_tenant_id
    AND deleted_at IS NULL
    AND (p_start_date IS NULL OR created_at >= p_start_date::timestamptz)
    AND (p_end_date IS NULL OR created_at <= (p_end_date + interval '1 day')::timestamptz)
    AND (p_branch_id IS NULL OR branch_id = p_branch_id)
    AND (p_site_id IS NULL OR site_id = p_site_id);

  -- Subtype distribution
  SELECT COALESCE(jsonb_object_agg(subtype, cnt), '{}'::jsonb)
  INTO v_by_subtype
  FROM (
    SELECT subtype, COUNT(*) as cnt
    FROM incidents
    WHERE tenant_id = v_tenant_id
      AND deleted_at IS NULL
      AND subtype IS NOT NULL
      AND (p_start_date IS NULL OR created_at >= p_start_date::timestamptz)
      AND (p_end_date IS NULL OR created_at <= (p_end_date + interval '1 day')::timestamptz)
      AND (p_branch_id IS NULL OR branch_id = p_branch_id)
      AND (p_site_id IS NULL OR site_id = p_site_id)
    GROUP BY subtype
  ) s;

  -- Monthly trend
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'month', m.month_key,
      'total', COALESCE(d.total, 0),
      'incidents', COALESCE(d.incidents, 0),
      'observations', COALESCE(d.observations, 0)
    ) ORDER BY m.month_key
  ), '[]'::jsonb)
  INTO v_monthly_trend
  FROM (
    SELECT to_char(gs, 'YYYY-MM') as month_key
    FROM generate_series(
      COALESCE(p_start_date, (CURRENT_DATE - interval '5 months'))::date,
      COALESCE(p_end_date, CURRENT_DATE)::date,
      interval '1 month'
    ) gs
    GROUP BY to_char(gs, 'YYYY-MM')
  ) m
  LEFT JOIN (
    SELECT 
      to_char(created_at, 'YYYY-MM') as month_key,
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE event_type = 'incident') as incidents,
      COUNT(*) FILTER (WHERE event_type = 'observation') as observations
    FROM incidents
    WHERE tenant_id = v_tenant_id
      AND deleted_at IS NULL
      AND (p_start_date IS NULL OR created_at >= p_start_date::timestamptz)
      AND (p_end_date IS NULL OR created_at <= (p_end_date + interval '1 day')::timestamptz)
      AND (p_branch_id IS NULL OR branch_id = p_branch_id)
      AND (p_site_id IS NULL OR site_id = p_site_id)
    GROUP BY to_char(created_at, 'YYYY-MM')
  ) d ON m.month_key = d.month_key;

  -- Action stats
  SELECT jsonb_build_object(
    'total_actions', COUNT(*),
    'open_actions', COUNT(*) FILTER (WHERE status NOT IN ('completed', 'closed', 'verified')),
    'actions_closed', COUNT(*) FILTER (WHERE status IN ('completed', 'closed', 'verified')),
    'actions_in_progress', COUNT(*) FILTER (WHERE status = 'in_progress'),
    'actions_pending_verification', COUNT(*) FILTER (WHERE status = 'pending_verification'),
    'overdue_actions', COUNT(*) FILTER (WHERE status NOT IN ('completed', 'closed', 'verified') AND due_date < CURRENT_DATE),
    'critical_actions', COUNT(*) FILTER (WHERE priority = 'critical'),
    'high_priority_actions', COUNT(*) FILTER (WHERE priority = 'high')
  )
  INTO v_actions
  FROM corrective_actions
  WHERE tenant_id = v_tenant_id
    AND deleted_at IS NULL
    AND (source_type != 'incident' OR released_at IS NOT NULL)
    AND (p_start_date IS NULL OR created_at >= p_start_date::timestamptz)
    AND (p_end_date IS NULL OR created_at <= (p_end_date + interval '1 day')::timestamptz)
    AND (
      (p_branch_id IS NULL AND p_site_id IS NULL) 
      OR branch_id = p_branch_id
      OR incident_id IN (
        SELECT id FROM incidents 
        WHERE tenant_id = v_tenant_id 
          AND deleted_at IS NULL
          AND (p_branch_id IS NULL OR branch_id = p_branch_id)
          AND (p_site_id IS NULL OR site_id = p_site_id)
      )
    );

  v_result := jsonb_build_object(
    'summary', v_summary,
    'by_status', v_by_status,
    'by_severity', v_by_severity,
    'by_event_type', v_by_event_type,
    'by_subtype', v_by_subtype,
    'monthly_trend', v_monthly_trend,
    'actions', v_actions
  );

  RETURN v_result;
END;
$function$;
