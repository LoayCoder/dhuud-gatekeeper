-- Phase 7B: Dashboard Stats RPC Functions
-- Phase 7C: Audit Template Columns

-- Add audit-specific columns to inspection_templates
ALTER TABLE public.inspection_templates 
ADD COLUMN IF NOT EXISTS standard_reference TEXT,
ADD COLUMN IF NOT EXISTS passing_score_percentage INTEGER DEFAULT 80;

-- Add audit-specific columns to inspection_template_items
ALTER TABLE public.inspection_template_items 
ADD COLUMN IF NOT EXISTS clause_reference TEXT,
ADD COLUMN IF NOT EXISTS scoring_weight INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS nc_category TEXT;

-- Phase 7B: RPC function to get inspection session stats
CREATE OR REPLACE FUNCTION public.get_inspection_session_stats()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_tenant_id UUID;
  v_result jsonb;
BEGIN
  v_tenant_id := get_auth_tenant_id();
  
  SELECT jsonb_build_object(
    'total_sessions', COUNT(*),
    'draft', COUNT(*) FILTER (WHERE status = 'draft'),
    'in_progress', COUNT(*) FILTER (WHERE status = 'in_progress'),
    'completed_with_open_actions', COUNT(*) FILTER (WHERE status = 'completed_with_open_actions'),
    'closed', COUNT(*) FILTER (WHERE status = 'closed'),
    'avg_compliance', ROUND(AVG(compliance_percentage)::numeric, 1)
  ) INTO v_result
  FROM inspection_sessions
  WHERE tenant_id = v_tenant_id AND deleted_at IS NULL;
  
  RETURN v_result;
END;
$$;

-- RPC function to get compliance trend (last 6 months)
CREATE OR REPLACE FUNCTION public.get_inspection_compliance_trend()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_tenant_id UUID;
BEGIN
  v_tenant_id := get_auth_tenant_id();
  
  RETURN (
    SELECT COALESCE(jsonb_agg(row_data ORDER BY month), '[]'::jsonb)
    FROM (
      SELECT 
        TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM') as month,
        ROUND(AVG(compliance_percentage)::numeric, 1) as avg_compliance,
        COUNT(*) as session_count
      FROM inspection_sessions
      WHERE tenant_id = v_tenant_id 
        AND deleted_at IS NULL
        AND created_at >= NOW() - INTERVAL '6 months'
        AND compliance_percentage IS NOT NULL
      GROUP BY DATE_TRUNC('month', created_at)
    ) row_data
  );
END;
$$;

-- RPC function to get findings distribution
CREATE OR REPLACE FUNCTION public.get_findings_distribution()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_tenant_id UUID;
BEGIN
  v_tenant_id := get_auth_tenant_id();
  
  RETURN jsonb_build_object(
    'by_classification', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'classification', classification,
        'count', cnt
      )), '[]'::jsonb)
      FROM (
        SELECT classification, COUNT(*) as cnt
        FROM area_inspection_findings
        WHERE tenant_id = v_tenant_id AND deleted_at IS NULL
        GROUP BY classification
      ) cls
    ),
    'by_risk_level', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'risk_level', risk_level,
        'count', cnt
      )), '[]'::jsonb)
      FROM (
        SELECT COALESCE(risk_level, 'unknown') as risk_level, COUNT(*) as cnt
        FROM area_inspection_findings
        WHERE tenant_id = v_tenant_id AND deleted_at IS NULL
        GROUP BY risk_level
      ) rsk
    ),
    'by_status', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'status', status,
        'count', cnt
      )), '[]'::jsonb)
      FROM (
        SELECT COALESCE(status, 'open') as status, COUNT(*) as cnt
        FROM area_inspection_findings
        WHERE tenant_id = v_tenant_id AND deleted_at IS NULL
        GROUP BY status
      ) sts
    ),
    'total_open', (
      SELECT COUNT(*)
      FROM area_inspection_findings
      WHERE tenant_id = v_tenant_id 
        AND deleted_at IS NULL 
        AND (status IS NULL OR status NOT IN ('closed'))
    )
  );
END;
$$;

-- RPC function to get overdue inspections count
CREATE OR REPLACE FUNCTION public.get_overdue_inspections_count()
RETURNS INTEGER
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_tenant_id UUID;
BEGIN
  v_tenant_id := get_auth_tenant_id();
  
  RETURN (
    SELECT COUNT(*)
    FROM hsse_assets
    WHERE tenant_id = v_tenant_id 
      AND deleted_at IS NULL
      AND next_inspection_due IS NOT NULL
      AND next_inspection_due < CURRENT_DATE
      AND status = 'active'
  );
END;
$$;