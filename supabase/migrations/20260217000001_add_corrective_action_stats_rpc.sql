-- Migration: Add get_corrective_action_stats RPC for efficient server-side aggregation
-- Replaces client-side row fetching + loop in use-action-center-stats.ts

CREATE OR REPLACE FUNCTION get_corrective_action_stats(p_tenant_id uuid, p_now timestamptz)
RETURNS json
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT json_build_object(
    'incidentOverdue',     count(*) FILTER (WHERE (source_type IS NULL OR source_type = 'incident') AND due_date < p_now AND status NOT IN ('completed', 'verified', 'closed')),
    'incidentPending',     count(*) FILTER (WHERE (source_type IS NULL OR source_type = 'incident') AND status = 'assigned' AND (due_date >= p_now OR due_date IS NULL)),
    'incidentInProgress',  count(*) FILTER (WHERE (source_type IS NULL OR source_type = 'incident') AND status = 'in_progress' AND (due_date >= p_now OR due_date IS NULL)),
    'incidentCompleted',   count(*) FILTER (WHERE (source_type IS NULL OR source_type = 'incident') AND status IN ('completed', 'verified', 'closed')),

    'observationOverdue',    count(*) FILTER (WHERE source_type = 'observation' AND due_date < p_now AND status NOT IN ('completed', 'verified', 'closed')),
    'observationPending',    count(*) FILTER (WHERE source_type = 'observation' AND status = 'assigned' AND (due_date >= p_now OR due_date IS NULL)),
    'observationInProgress', count(*) FILTER (WHERE source_type = 'observation' AND status = 'in_progress' AND (due_date >= p_now OR due_date IS NULL)),
    'observationCompleted',  count(*) FILTER (WHERE source_type = 'observation' AND status IN ('completed', 'verified', 'closed')),

    'inspectionOverdue',    count(*) FILTER (WHERE source_type = 'inspection' AND due_date < p_now AND status NOT IN ('completed', 'verified', 'closed')),
    'inspectionPending',    count(*) FILTER (WHERE source_type = 'inspection' AND status = 'assigned' AND (due_date >= p_now OR due_date IS NULL)),
    'inspectionInProgress', count(*) FILTER (WHERE source_type = 'inspection' AND status = 'in_progress' AND (due_date >= p_now OR due_date IS NULL)),
    'inspectionCompleted',  count(*) FILTER (WHERE source_type = 'inspection' AND status IN ('completed', 'verified', 'closed'))
  )
  FROM corrective_actions
  WHERE tenant_id = p_tenant_id;
$$;
