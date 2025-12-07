-- Add auto_generate_session column to inspection_schedules
ALTER TABLE public.inspection_schedules 
ADD COLUMN IF NOT EXISTS auto_generate_session boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS last_generated_at timestamp with time zone DEFAULT NULL,
ADD COLUMN IF NOT EXISTS sessions_generated_count integer DEFAULT 0;

-- Create index for schedule processing
CREATE INDEX IF NOT EXISTS idx_inspection_schedules_next_due_active 
ON public.inspection_schedules(next_due, is_active) 
WHERE deleted_at IS NULL;

-- RPC: Get team performance metrics
CREATE OR REPLACE FUNCTION public.get_team_performance_metrics(
  p_tenant_id uuid,
  p_start_date date DEFAULT (CURRENT_DATE - INTERVAL '30 days')::date,
  p_end_date date DEFAULT CURRENT_DATE
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  -- Verify tenant access
  IF p_tenant_id != get_auth_tenant_id() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  WITH assignee_metrics AS (
    SELECT 
      ca.assigned_to,
      p.full_name as assignee_name,
      d.name as department_name,
      ca.responsible_department_id,
      COUNT(*) as total_actions,
      COUNT(*) FILTER (WHERE ca.status IN ('completed', 'verified', 'closed')) as completed_actions,
      COUNT(*) FILTER (WHERE ca.status = 'verified' OR ca.status = 'closed') as verified_actions,
      COUNT(*) FILTER (WHERE ca.due_date < CURRENT_DATE AND ca.status NOT IN ('completed', 'verified', 'closed')) as overdue_actions,
      COUNT(*) FILTER (WHERE ca.escalation_level > 0) as sla_breaches,
      AVG(
        CASE WHEN ca.completed_date IS NOT NULL 
        THEN EXTRACT(EPOCH FROM (ca.completed_date::timestamp - ca.created_at::timestamp)) / 86400
        ELSE NULL END
      ) as avg_resolution_days
    FROM corrective_actions ca
    LEFT JOIN profiles p ON p.id = ca.assigned_to
    LEFT JOIN departments d ON d.id = ca.responsible_department_id
    WHERE ca.tenant_id = p_tenant_id
      AND ca.deleted_at IS NULL
      AND ca.created_at::date BETWEEN p_start_date AND p_end_date
    GROUP BY ca.assigned_to, p.full_name, d.name, ca.responsible_department_id
  ),
  department_metrics AS (
    SELECT 
      d.id as department_id,
      d.name as department_name,
      COUNT(*) as total_actions,
      COUNT(*) FILTER (WHERE ca.status IN ('completed', 'verified', 'closed')) as completed_actions,
      COUNT(*) FILTER (WHERE ca.escalation_level > 0) as sla_breaches,
      AVG(
        CASE WHEN ca.completed_date IS NOT NULL 
        THEN EXTRACT(EPOCH FROM (ca.completed_date::timestamp - ca.created_at::timestamp)) / 86400
        ELSE NULL END
      ) as avg_resolution_days
    FROM corrective_actions ca
    JOIN departments d ON d.id = ca.responsible_department_id
    WHERE ca.tenant_id = p_tenant_id
      AND ca.deleted_at IS NULL
      AND ca.created_at::date BETWEEN p_start_date AND p_end_date
    GROUP BY d.id, d.name
  )
  SELECT jsonb_build_object(
    'assignees', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'assigned_to', assigned_to,
        'assignee_name', COALESCE(assignee_name, 'Unassigned'),
        'department_name', department_name,
        'total_actions', total_actions,
        'completed_actions', completed_actions,
        'verified_actions', verified_actions,
        'overdue_actions', overdue_actions,
        'sla_breaches', sla_breaches,
        'completion_rate', ROUND((completed_actions::numeric / NULLIF(total_actions, 0)) * 100, 1),
        'sla_compliance_rate', ROUND(100 - (sla_breaches::numeric / NULLIF(total_actions, 0)) * 100, 1),
        'avg_resolution_days', ROUND(COALESCE(avg_resolution_days, 0)::numeric, 1)
      ) ORDER BY total_actions DESC)
      FROM assignee_metrics
    ), '[]'::jsonb),
    'departments', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'department_id', department_id,
        'department_name', department_name,
        'total_actions', total_actions,
        'completed_actions', completed_actions,
        'sla_breaches', sla_breaches,
        'completion_rate', ROUND((completed_actions::numeric / NULLIF(total_actions, 0)) * 100, 1),
        'sla_compliance_rate', ROUND(100 - (sla_breaches::numeric / NULLIF(total_actions, 0)) * 100, 1),
        'avg_resolution_days', ROUND(COALESCE(avg_resolution_days, 0)::numeric, 1)
      ) ORDER BY total_actions DESC)
      FROM department_metrics
    ), '[]'::jsonb),
    'period', jsonb_build_object('start_date', p_start_date, 'end_date', p_end_date)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- RPC: Get monthly HSSE executive summary
CREATE OR REPLACE FUNCTION public.get_monthly_hsse_summary(
  p_tenant_id uuid,
  p_month date DEFAULT date_trunc('month', CURRENT_DATE)::date
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start_date date;
  v_end_date date;
  v_result jsonb;
BEGIN
  -- Verify tenant access
  IF p_tenant_id != get_auth_tenant_id() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  v_start_date := date_trunc('month', p_month)::date;
  v_end_date := (date_trunc('month', p_month) + INTERVAL '1 month' - INTERVAL '1 day')::date;

  WITH incident_stats AS (
    SELECT 
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE event_type = 'observation') as observations,
      COUNT(*) FILTER (WHERE severity = 'critical') as critical_count,
      COUNT(*) FILTER (WHERE severity = 'high') as high_count,
      COUNT(*) FILTER (WHERE severity = 'medium') as medium_count,
      COUNT(*) FILTER (WHERE severity = 'low') as low_count,
      COUNT(*) FILTER (WHERE status = 'submitted') as submitted_count,
      COUNT(*) FILTER (WHERE status = 'investigation_in_progress') as investigating_count,
      COUNT(*) FILTER (WHERE status = 'closed') as closed_count,
      AVG(
        CASE WHEN closure_approved_at IS NOT NULL 
        THEN EXTRACT(EPOCH FROM (closure_approved_at - created_at)) / 86400
        ELSE NULL END
      ) as avg_closure_days
    FROM incidents
    WHERE tenant_id = p_tenant_id
      AND deleted_at IS NULL
      AND created_at::date BETWEEN v_start_date AND v_end_date
  ),
  inspection_stats AS (
    SELECT 
      COUNT(*) as sessions_completed,
      COUNT(*) FILTER (WHERE template_type = 'asset') as asset_sessions,
      COUNT(*) FILTER (WHERE template_type = 'area') as area_sessions,
      COUNT(*) FILTER (WHERE template_type = 'audit') as audit_sessions,
      AVG(COALESCE(compliance_percentage, 0)) as avg_compliance
    FROM inspection_sessions
    WHERE tenant_id = p_tenant_id
      AND deleted_at IS NULL
      AND status IN ('completed_with_open_actions', 'closed')
      AND created_at::date BETWEEN v_start_date AND v_end_date
  ),
  finding_stats AS (
    SELECT 
      COUNT(*) as total_findings,
      COUNT(*) FILTER (WHERE status = 'closed') as closed_findings
    FROM inspection_findings
    WHERE tenant_id = p_tenant_id
      AND deleted_at IS NULL
      AND created_at::date BETWEEN v_start_date AND v_end_date
  ),
  action_stats AS (
    SELECT 
      COUNT(*) as total_created,
      COUNT(*) FILTER (WHERE status IN ('completed', 'verified', 'closed')) as completed,
      COUNT(*) FILTER (WHERE status IN ('verified', 'closed')) as verified,
      COUNT(*) FILTER (WHERE due_date < CURRENT_DATE AND status NOT IN ('completed', 'verified', 'closed')) as overdue,
      COUNT(*) FILTER (WHERE escalation_level > 0) as sla_breaches,
      AVG(
        CASE WHEN completed_date IS NOT NULL 
        THEN EXTRACT(EPOCH FROM (completed_date::timestamp - created_at::timestamp)) / 86400
        ELSE NULL END
      ) as avg_resolution_days
    FROM corrective_actions
    WHERE tenant_id = p_tenant_id
      AND deleted_at IS NULL
      AND created_at::date BETWEEN v_start_date AND v_end_date
  )
  SELECT jsonb_build_object(
    'incidents', (SELECT jsonb_build_object(
      'total', COALESCE(total, 0),
      'observations_count', COALESCE(observations, 0),
      'by_severity', jsonb_build_object(
        'critical', COALESCE(critical_count, 0),
        'high', COALESCE(high_count, 0),
        'medium', COALESCE(medium_count, 0),
        'low', COALESCE(low_count, 0)
      ),
      'by_status', jsonb_build_object(
        'submitted', COALESCE(submitted_count, 0),
        'investigation_in_progress', COALESCE(investigating_count, 0),
        'closed', COALESCE(closed_count, 0)
      ),
      'avg_closure_days', ROUND(COALESCE(avg_closure_days, 0)::numeric, 1)
    ) FROM incident_stats),
    'inspections', (SELECT jsonb_build_object(
      'sessions_completed', COALESCE(sessions_completed, 0),
      'avg_compliance_percentage', ROUND(COALESCE(avg_compliance, 0)::numeric, 1),
      'by_type', jsonb_build_object(
        'asset', COALESCE(asset_sessions, 0),
        'area', COALESCE(area_sessions, 0),
        'audit', COALESCE(audit_sessions, 0)
      ),
      'findings_raised', (SELECT COALESCE(total_findings, 0) FROM finding_stats),
      'findings_closed', (SELECT COALESCE(closed_findings, 0) FROM finding_stats)
    ) FROM inspection_stats),
    'actions', (SELECT jsonb_build_object(
      'total_created', COALESCE(total_created, 0),
      'completed', COALESCE(completed, 0),
      'verified', COALESCE(verified, 0),
      'overdue', COALESCE(overdue, 0),
      'sla_breach_count', COALESCE(sla_breaches, 0),
      'sla_breach_rate', ROUND((COALESCE(sla_breaches, 0)::numeric / NULLIF(total_created, 0)) * 100, 1),
      'avg_resolution_days', ROUND(COALESCE(avg_resolution_days, 0)::numeric, 1)
    ) FROM action_stats),
    'period', jsonb_build_object('start_date', v_start_date, 'end_date', v_end_date)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- RPC: Process due inspection schedules and create sessions
CREATE OR REPLACE FUNCTION public.process_due_inspection_schedules(p_tenant_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_schedule RECORD;
  v_session_id uuid;
  v_sessions_created integer := 0;
  v_created_sessions jsonb := '[]'::jsonb;
  v_next_due date;
BEGIN
  FOR v_schedule IN
    SELECT s.*, t.name as template_name, t.template_type
    FROM inspection_schedules s
    JOIN inspection_templates t ON t.id = s.template_id
    WHERE s.deleted_at IS NULL
      AND s.is_active = true
      AND s.auto_generate_session = true
      AND s.next_due <= CURRENT_DATE
      AND (p_tenant_id IS NULL OR s.tenant_id = p_tenant_id)
  LOOP
    -- Generate reference ID
    v_session_id := gen_random_uuid();
    
    -- Create the inspection session
    INSERT INTO inspection_sessions (
      id, tenant_id, template_id, template_type, status,
      scheduled_date, inspector_id, site_id, building_id,
      reference_id, notes, created_at
    ) VALUES (
      v_session_id,
      v_schedule.tenant_id,
      v_schedule.template_id,
      v_schedule.template_type,
      'draft',
      v_schedule.next_due,
      v_schedule.assigned_inspector_id,
      v_schedule.site_id,
      v_schedule.building_id,
      'INSP-' || to_char(CURRENT_DATE, 'YYYY') || '-' || LPAD((nextval('inspection_sessions_reference_seq')::text), 4, '0'),
      'Auto-generated from schedule: ' || v_schedule.name,
      now()
    );

    -- Calculate next due date based on frequency
    v_next_due := CASE v_schedule.frequency_type
      WHEN 'daily' THEN v_schedule.next_due + (v_schedule.frequency_value || ' days')::interval
      WHEN 'weekly' THEN v_schedule.next_due + (v_schedule.frequency_value * 7 || ' days')::interval
      WHEN 'monthly' THEN v_schedule.next_due + (v_schedule.frequency_value || ' months')::interval
      WHEN 'quarterly' THEN v_schedule.next_due + (v_schedule.frequency_value * 3 || ' months')::interval
      WHEN 'semi_annually' THEN v_schedule.next_due + (v_schedule.frequency_value * 6 || ' months')::interval
      WHEN 'annually' THEN v_schedule.next_due + (v_schedule.frequency_value || ' years')::interval
      ELSE v_schedule.next_due + INTERVAL '30 days'
    END;

    -- Update the schedule
    UPDATE inspection_schedules
    SET next_due = v_next_due,
        last_generated_at = now(),
        sessions_generated_count = COALESCE(sessions_generated_count, 0) + 1,
        updated_at = now()
    WHERE id = v_schedule.id;

    v_sessions_created := v_sessions_created + 1;
    v_created_sessions := v_created_sessions || jsonb_build_object(
      'session_id', v_session_id,
      'schedule_id', v_schedule.id,
      'schedule_name', v_schedule.name,
      'inspector_id', v_schedule.assigned_inspector_id,
      'tenant_id', v_schedule.tenant_id
    );
  END LOOP;

  RETURN jsonb_build_object(
    'sessions_created', v_sessions_created,
    'sessions', v_created_sessions,
    'processed_at', now()
  );
END;
$$;

-- Create sequence for reference IDs if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'inspection_sessions_reference_seq') THEN
    CREATE SEQUENCE public.inspection_sessions_reference_seq START 1;
  END IF;
END $$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_team_performance_metrics(uuid, date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_monthly_hsse_summary(uuid, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_due_inspection_schedules(uuid) TO authenticated;