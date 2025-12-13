import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface LaggingIndicators {
  trir: number;
  ltifr: number;
  dart_rate: number;
  fatality_rate: number;
  severity_rate: number;
  total_recordable_injuries: number;
  lost_time_injuries: number;
  restricted_duty_cases: number;
  fatalities: number;
  total_lost_days: number;
  total_manhours: number;
}

interface LeadingIndicators {
  near_miss_rate: number;
  observation_completion_pct: number;
  action_closure_pct: number;
  hazard_identification_rate: number;
  total_near_misses: number;
  total_observations: number;
  closed_observations: number;
  total_actions: number;
  closed_actions: number;
  total_hazards: number;
}

interface ResponseMetrics {
  avg_investigation_days: number;
  within_target_pct: number;
  repeat_incident_rate: number;
  total_investigations: number;
  total_incidents: number;
}

interface PeopleMetrics {
  total_manhours: number;
  employee_hours: number;
  contractor_hours: number;
  employee_incidents: number;
  contractor_incidents: number;
  contractor_ratio: number;
  employee_pct: number;
  contractor_pct: number;
}

interface KPITarget {
  id: string;
  kpi_code: string;
  target_value: number;
  warning_threshold: number;
  critical_threshold: number;
}

export function useLaggingIndicators(
  startDate: string,
  endDate: string,
  branchId?: string,
  siteId?: string
) {
  return useQuery({
    queryKey: ['lagging-indicators', startDate, endDate, branchId, siteId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_lagging_indicators', {
        p_start_date: startDate,
        p_end_date: endDate,
        p_branch_id: branchId || null,
        p_site_id: siteId || null,
      });

      if (error) throw error;
      return data as unknown as LaggingIndicators;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useLeadingIndicators(
  startDate: string,
  endDate: string,
  branchId?: string,
  siteId?: string
) {
  return useQuery({
    queryKey: ['leading-indicators', startDate, endDate, branchId, siteId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_leading_indicators', {
        p_start_date: startDate,
        p_end_date: endDate,
        p_branch_id: branchId || null,
        p_site_id: siteId || null,
      });

      if (error) throw error;
      return data as unknown as LeadingIndicators;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useResponseMetrics(
  startDate: string,
  endDate: string,
  branchId?: string,
  siteId?: string
) {
  return useQuery({
    queryKey: ['response-metrics', startDate, endDate, branchId, siteId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_response_metrics', {
        p_start_date: startDate,
        p_end_date: endDate,
        p_branch_id: branchId || null,
        p_site_id: siteId || null,
      });

      if (error) throw error;
      return data as unknown as ResponseMetrics;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function usePeopleMetrics(
  startDate: string,
  endDate: string,
  branchId?: string,
  siteId?: string
) {
  return useQuery({
    queryKey: ['people-metrics', startDate, endDate, branchId, siteId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_people_metrics', {
        p_start_date: startDate,
        p_end_date: endDate,
        p_branch_id: branchId || null,
        p_site_id: siteId || null,
      });

      if (error) throw error;
      return data as unknown as PeopleMetrics;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useKPITargets() {
  return useQuery({
    queryKey: ['kpi-targets'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('kpi_targets')
        .select('id, kpi_code, target_value, warning_threshold, critical_threshold')
        .is('deleted_at', null);

      if (error) throw error;
      return (data ?? []) as KPITarget[];
    },
    staleTime: 10 * 60 * 1000,
  });
}

export function useDaysSinceLastRecordable(branchId?: string, siteId?: string) {
  return useQuery({
    queryKey: ['days-since-recordable', branchId, siteId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_days_since_last_recordable', {
        p_branch_id: branchId || null,
        p_site_id: siteId || null,
      });

      if (error) throw error;
      return data as number;
    },
    staleTime: 60 * 1000,
  });
}

// Helper to check KPI status against thresholds (less_than comparison)
export function getKPIStatus(
  value: number,
  target: KPITarget | undefined
): 'success' | 'warning' | 'critical' | 'neutral' {
  if (!target) return 'neutral';

  const { warning_threshold, critical_threshold } = target;

  if (value >= critical_threshold) return 'critical';
  if (value >= warning_threshold) return 'warning';
  return 'success';
}