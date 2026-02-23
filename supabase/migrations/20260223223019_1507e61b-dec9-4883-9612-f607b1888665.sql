
-- ========================================
-- C11: Add investigation_started_at and sla_breached columns
-- ========================================
ALTER TABLE public.incidents ADD COLUMN IF NOT EXISTS investigation_started_at TIMESTAMPTZ;
ALTER TABLE public.incidents ADD COLUMN IF NOT EXISTS sla_breached BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_incidents_sla_breached 
  ON public.incidents (sla_breached) 
  WHERE sla_breached = TRUE;

CREATE INDEX IF NOT EXISTS idx_incidents_investigation_started 
  ON public.incidents (investigation_started_at) 
  WHERE investigation_started_at IS NOT NULL;

-- ========================================
-- C16: Enable pg_trgm extension for fuzzy matching
-- ========================================
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Trigram index on incident titles for duplicate detection
CREATE INDEX IF NOT EXISTS idx_incidents_title_trgm 
  ON public.incidents USING gin (title gin_trgm_ops);

-- ========================================
-- C16: Duplicate Detection RPC
-- ========================================
DROP FUNCTION IF EXISTS public.check_duplicate_incident(UUID, UUID, TEXT, TIMESTAMPTZ);

CREATE OR REPLACE FUNCTION public.check_duplicate_incident(
  p_tenant_id UUID,
  p_department_id UUID,
  p_title TEXT,
  p_occurred_at TIMESTAMPTZ
) RETURNS TABLE (
  duplicate_id UUID,
  duplicate_reference_id TEXT,
  duplicate_title TEXT,
  similarity_score REAL
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    i.id AS duplicate_id,
    i.reference_id AS duplicate_reference_id,
    i.title AS duplicate_title,
    similarity(i.title, p_title) AS similarity_score
  FROM incidents i
  WHERE i.tenant_id = p_tenant_id
    AND i.department_id = p_department_id
    AND i.deleted_at IS NULL
    AND i.status != 'closed'
    AND similarity(i.title, p_title) >= 0.6
    AND i.occurred_at BETWEEN p_occurred_at - INTERVAL '24 hours'
                        AND p_occurred_at + INTERVAL '24 hours'
  ORDER BY similarity_score DESC
  LIMIT 5;
$$;

-- ========================================
-- C18: HSSE Manager Role Verification RPC
-- ========================================
DROP FUNCTION IF EXISTS public.verify_hsse_manager_access(UUID, UUID);

CREATE OR REPLACE FUNCTION public.verify_hsse_manager_access(
  p_user_id UUID,
  p_incident_id UUID DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role_code TEXT;
  v_branch_id UUID;
  v_incident_branch UUID;
BEGIN
  SELECT r.code, ura.branch_id
  INTO v_role_code, v_branch_id
  FROM user_role_assignments ura
  JOIN roles r ON r.id = ura.role_id
  WHERE ura.user_id = p_user_id
    AND r.code = 'hsse_manager'
  LIMIT 1;

  IF v_role_code IS NULL THEN
    RETURN jsonb_build_object(
      'authorized', false,
      'reason', 'User does not have hsse_manager role'
    );
  END IF;

  IF p_incident_id IS NOT NULL THEN
    SELECT branch_id INTO v_incident_branch
    FROM incidents
    WHERE id = p_incident_id AND deleted_at IS NULL;

    IF v_incident_branch IS NULL THEN
      RETURN jsonb_build_object('authorized', false, 'reason', 'Incident not found');
    END IF;

    IF v_branch_id IS NOT NULL AND v_branch_id != v_incident_branch THEN
      RETURN jsonb_build_object(
        'authorized', false,
        'reason', 'Branch mismatch',
        'user_branch', v_branch_id,
        'incident_branch', v_incident_branch
      );
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'authorized', true,
    'role', 'hsse_manager',
    'branch_id', v_branch_id
  );
END;
$$;
