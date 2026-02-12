
-- Phase 1: Add 3 new columns to incident_injuries
ALTER TABLE public.incident_injuries
  ADD COLUMN IF NOT EXISTS person_type TEXT NOT NULL DEFAULT 'employee',
  ADD COLUMN IF NOT EXISTS involvement_type TEXT NOT NULL DEFAULT 'injured_person',
  ADD COLUMN IF NOT EXISTS injury_classification TEXT;

-- Add check constraints for valid values
ALTER TABLE public.incident_injuries
  ADD CONSTRAINT chk_person_type CHECK (person_type IN ('employee', 'contractor', 'visitor', 'public')),
  ADD CONSTRAINT chk_involvement_type CHECK (involvement_type IN ('injured_person', 'witness', 'driver', 'suspect')),
  ADD CONSTRAINT chk_injury_classification CHECK (injury_classification IS NULL OR injury_classification IN ('LTI', 'MTC', 'RWC', 'FAC', 'FAT', 'NM'));

-- Phase 2: Create the new RPC for people metrics
-- First drop any old version
DROP FUNCTION IF EXISTS public.get_incident_people_metrics(DATE, DATE, UUID, UUID);

CREATE OR REPLACE FUNCTION public.get_incident_people_metrics(
  p_start_date DATE,
  p_end_date DATE,
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
  v_result JSONB;
BEGIN
  -- Get tenant from current user
  SELECT (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::UUID INTO v_tenant_id;
  IF v_tenant_id IS NULL THEN
    SELECT tenant_id INTO v_tenant_id FROM profiles WHERE id = auth.uid();
  END IF;

  WITH injury_data AS (
    SELECT
      ii.person_type,
      ii.injury_classification,
      ii.body_parts_affected
    FROM incident_injuries ii
    JOIN incidents i ON i.id = ii.incident_id
    WHERE ii.tenant_id = v_tenant_id
      AND ii.deleted_at IS NULL
      AND i.deleted_at IS NULL
      AND ii.involvement_type = 'injured_person'
      -- Exclude security/theft incidents
      AND COALESCE(i.incident_type, '') NOT IN ('security', 'theft')
      AND i.created_at::date BETWEEN p_start_date AND p_end_date
      AND (p_branch_id IS NULL OR i.branch_id = p_branch_id)
      AND (p_site_id IS NULL OR i.site_id = p_site_id)
  ),
  -- Count by person_type
  person_type_counts AS (
    SELECT
      COALESCE(person_type, 'employee') AS pt,
      COUNT(*) AS cnt
    FROM injury_data
    GROUP BY COALESCE(person_type, 'employee')
  ),
  -- Count by injury_classification
  classification_counts AS (
    SELECT
      injury_classification AS cls,
      COUNT(*) AS cnt
    FROM injury_data
    WHERE injury_classification IS NOT NULL
    GROUP BY injury_classification
  ),
  -- Flatten body_parts_affected and count top 5
  body_part_counts AS (
    SELECT
      bp AS body_part,
      COUNT(*) AS cnt
    FROM injury_data, unnest(body_parts_affected) AS bp
    GROUP BY bp
    ORDER BY COUNT(*) DESC
    LIMIT 5
  ),
  -- Totals
  totals AS (
    SELECT COUNT(*) AS total_injured FROM injury_data
  )
  SELECT jsonb_build_object(
    'total_injured', (SELECT total_injured FROM totals),
    'employee_count', COALESCE((SELECT cnt FROM person_type_counts WHERE pt = 'employee'), 0),
    'contractor_count', COALESCE((SELECT cnt FROM person_type_counts WHERE pt = 'contractor'), 0),
    'visitor_count', COALESCE((SELECT cnt FROM person_type_counts WHERE pt = 'visitor'), 0),
    'public_count', COALESCE((SELECT cnt FROM person_type_counts WHERE pt = 'public'), 0),
    'employee_pct', CASE WHEN (SELECT total_injured FROM totals) > 0
      THEN ROUND(COALESCE((SELECT cnt FROM person_type_counts WHERE pt = 'employee'), 0)::NUMERIC / (SELECT total_injured FROM totals) * 100, 1)
      ELSE 0 END,
    'contractor_pct', CASE WHEN (SELECT total_injured FROM totals) > 0
      THEN ROUND(COALESCE((SELECT cnt FROM person_type_counts WHERE pt = 'contractor'), 0)::NUMERIC / (SELECT total_injured FROM totals) * 100, 1)
      ELSE 0 END,
    'by_classification', COALESCE((SELECT jsonb_object_agg(cls, cnt) FROM classification_counts), '{}'::jsonb),
    'top_body_parts', COALESCE((SELECT jsonb_agg(jsonb_build_object('body_part', body_part, 'count', cnt)) FROM body_part_counts), '[]'::jsonb)
  ) INTO v_result;

  RETURN v_result;
END;
$$;
