-- Create a database function to get asset dashboard statistics
-- This replaces client-side aggregation with server-side calculation for O(1) performance
CREATE OR REPLACE FUNCTION public.get_asset_dashboard_stats(p_tenant_id UUID)
RETURNS TABLE(
  total_assets BIGINT,
  active_count BIGINT,
  inactive_count BIGINT,
  under_maintenance_count BIGINT,
  missing_count BIGINT,
  excellent_condition BIGINT,
  good_condition BIGINT,
  fair_condition BIGINT,
  poor_condition BIGINT,
  critical_condition BIGINT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total_assets,
    COUNT(*) FILTER (WHERE status = 'active')::BIGINT as active_count,
    COUNT(*) FILTER (WHERE status IN ('retired', 'out_of_service'))::BIGINT as inactive_count,
    COUNT(*) FILTER (WHERE status = 'under_maintenance')::BIGINT as under_maintenance_count,
    COUNT(*) FILTER (WHERE status = 'missing')::BIGINT as missing_count,
    COUNT(*) FILTER (WHERE condition_rating = 'excellent')::BIGINT as excellent_condition,
    COUNT(*) FILTER (WHERE condition_rating = 'good')::BIGINT as good_condition,
    COUNT(*) FILTER (WHERE condition_rating = 'fair')::BIGINT as fair_condition,
    COUNT(*) FILTER (WHERE condition_rating = 'poor')::BIGINT as poor_condition,
    COUNT(*) FILTER (WHERE condition_rating = 'critical')::BIGINT as critical_condition
  FROM hsse_assets
  WHERE tenant_id = p_tenant_id
    AND deleted_at IS NULL;
END;
$$;

-- Create a function to get category distribution
CREATE OR REPLACE FUNCTION public.get_asset_category_distribution(p_tenant_id UUID)
RETURNS TABLE(
  category_id UUID,
  category_name TEXT,
  category_name_ar TEXT,
  asset_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.category_id,
    c.name as category_name,
    c.name_ar as category_name_ar,
    COUNT(*)::BIGINT as asset_count
  FROM hsse_assets a
  JOIN asset_categories c ON c.id = a.category_id
  WHERE a.tenant_id = p_tenant_id
    AND a.deleted_at IS NULL
  GROUP BY a.category_id, c.name, c.name_ar
  ORDER BY asset_count DESC;
END;
$$;

-- Add comments for documentation
COMMENT ON FUNCTION public.get_asset_dashboard_stats(UUID) IS 'Returns aggregated asset statistics for dashboard - replaces client-side aggregation';
COMMENT ON FUNCTION public.get_asset_category_distribution(UUID) IS 'Returns asset count by category for dashboard charts';