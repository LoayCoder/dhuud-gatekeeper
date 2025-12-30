-- Add event_type column to incident_notification_matrix
-- Values: 'incident', 'observation', 'all'
ALTER TABLE public.incident_notification_matrix 
ADD COLUMN IF NOT EXISTS event_type VARCHAR(20) DEFAULT 'all';

-- Add check constraint for valid event types
ALTER TABLE public.incident_notification_matrix 
ADD CONSTRAINT check_event_type 
CHECK (event_type IN ('incident', 'observation', 'all'));

-- Create index for efficient filtering
CREATE INDEX IF NOT EXISTS idx_notification_matrix_event_type 
ON public.incident_notification_matrix(event_type) 
WHERE deleted_at IS NULL;

-- Update the get_incident_notification_recipients function to filter by event_type
CREATE OR REPLACE FUNCTION public.get_incident_notification_recipients(
  p_tenant_id UUID,
  p_severity_level INTEGER,
  p_has_injury BOOLEAN DEFAULT FALSE,
  p_erp_activated BOOLEAN DEFAULT FALSE,
  p_event_type VARCHAR DEFAULT 'incident'
)
RETURNS TABLE (
  user_id UUID,
  stakeholder_role VARCHAR,
  channels TEXT[],
  full_name TEXT,
  email TEXT,
  phone TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH matrix_rules AS (
    SELECT DISTINCT
      m.stakeholder_role,
      m.channels
    FROM incident_notification_matrix m
    WHERE m.tenant_id = p_tenant_id
      AND m.deleted_at IS NULL
      AND m.severity_level = p_severity_level
      AND (m.event_type = p_event_type OR m.event_type = 'all')
      AND (
        (m.condition_type = 'default')
        OR (m.condition_type = 'injury' AND p_has_injury = TRUE)
        OR (m.condition_type = 'erp' AND p_erp_activated = TRUE)
      )
  ),
  role_users AS (
    SELECT 
      p.id as user_id,
      mr.stakeholder_role,
      mr.channels,
      p.full_name,
      p.email,
      p.phone
    FROM matrix_rules mr
    JOIN profiles p ON p.tenant_id = p_tenant_id 
      AND p.deleted_at IS NULL
      AND p.is_active = TRUE
    WHERE 
      (mr.stakeholder_role = 'hsse_manager' AND p.role = 'hsse_manager')
      OR (mr.stakeholder_role = 'hsse_expert' AND p.role = 'hsse_expert')
      OR (mr.stakeholder_role = 'area_manager' AND p.role = 'area_manager')
      OR (mr.stakeholder_role = 'dept_rep' AND p.role = 'dept_rep')
      OR (mr.stakeholder_role = 'site_manager' AND p.role = 'site_manager')
      OR (mr.stakeholder_role = 'gm' AND p.role = 'gm')
      OR (mr.stakeholder_role = 'ceo' AND p.role = 'ceo')
      OR (mr.stakeholder_role = 'erp_team' AND p.role = 'erp_team')
  )
  SELECT 
    ru.user_id,
    ru.stakeholder_role,
    ru.channels,
    ru.full_name,
    ru.email,
    ru.phone
  FROM role_users ru;
END;
$$;