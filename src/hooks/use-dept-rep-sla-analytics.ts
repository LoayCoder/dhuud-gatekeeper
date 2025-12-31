import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ComplianceStats {
  on_time: number;
  overdue: number;
  pending: number;
  total: number;
  compliance_rate: number;
}

export interface TrendDataPoint {
  period: string;
  period_label: string;
  resolved_count: number;
  overdue_count: number;
  compliance_rate: number;
}

export interface EventTypeStats {
  event_type: string;
  on_time: number;
  overdue: number;
  total: number;
}

export interface DeptRepSLAAnalytics {
  compliance_stats: ComplianceStats;
  trend_data: TrendDataPoint[];
  by_event_type: EventTypeStats[];
}

interface UseDeptRepSLAAnalyticsOptions {
  period?: 'week' | 'month';
  enabled?: boolean;
}

export function useDeptRepSLAAnalytics(options: UseDeptRepSLAAnalyticsOptions = {}) {
  const { period = 'month', enabled = true } = options;

  return useQuery({
    queryKey: ['dept-rep-sla-analytics', period],
    queryFn: async (): Promise<DeptRepSLAAnalytics> => {
      const { data, error } = await supabase.rpc('get_dept_rep_sla_analytics', {
        p_period: period,
      });

      if (error) throw error;

      const result = data as unknown as DeptRepSLAAnalytics;
      return {
        compliance_stats: result?.compliance_stats ?? {
          on_time: 0,
          overdue: 0,
          pending: 0,
          total: 0,
          compliance_rate: 0,
        },
        trend_data: result?.trend_data ?? [],
        by_event_type: result?.by_event_type ?? [],
      };
    },
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
