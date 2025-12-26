-- Drop and recreate the seed function with correct KPI codes
CREATE OR REPLACE FUNCTION public.seed_default_kpi_targets(p_tenant_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert default KPI targets only if they don't exist
  INSERT INTO public.kpi_targets (tenant_id, kpi_code, target_value, warning_threshold, critical_threshold, comparison_type, description, is_active)
  VALUES
    (p_tenant_id, 'trir', 2.0, 1.5, 2.5, 'less_than', 'Total Recordable Incident Rate - Number of recordable incidents per 200,000 work hours', true),
    (p_tenant_id, 'ltifr', 1.0, 0.8, 1.5, 'less_than', 'Lost Time Injury Frequency Rate - Number of lost time injuries per million work hours', true),
    (p_tenant_id, 'dart', 1.5, 1.0, 2.0, 'less_than', 'Days Away, Restricted, or Transferred rate per 200,000 work hours', true),
    (p_tenant_id, 'fatality_rate', 0, 0, 0.01, 'less_than', 'Fatality rate - Target should always be zero', true),
    (p_tenant_id, 'severity_rate', 10, 8, 15, 'less_than', 'Average days lost per recordable incident', true),
    (p_tenant_id, 'near_miss_rate', 50, 30, 20, 'greater_than', 'Near miss reports per 200,000 work hours - Higher is better for safety culture', true),
    (p_tenant_id, 'action_closure_rate', 90, 80, 70, 'greater_than', 'Percentage of corrective actions closed on time', true),
    (p_tenant_id, 'observation_rate', 85, 75, 60, 'greater_than', 'Safety observation completion rate percentage', true)
  ON CONFLICT (tenant_id, kpi_code) WHERE deleted_at IS NULL DO NOTHING;
END;
$$;