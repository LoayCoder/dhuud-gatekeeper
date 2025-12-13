import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { subDays, subMonths, format } from "date-fns";

export interface KPITrendData {
  month: string;
  trir: number;
  ltifr: number;
  dart: number;
  severity_rate: number;
  near_miss_rate: number;
  action_closure_pct: number;
  total_incidents: number;
  total_manhours: number;
}

export interface KPIPeriodComparison {
  metric_name: string;
  current_value: number;
  previous_value: number;
  percent_change: number;
  trend_direction: 'up' | 'down' | 'stable';
}

export function useKPIHistoricalTrend(
  startDate?: string,
  endDate?: string,
  branchId?: string,
  siteId?: string
) {
  return useQuery({
    queryKey: ['kpi-historical-trend', startDate, endDate, branchId, siteId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_kpi_historical_trend', {
        p_start_date: startDate || format(subMonths(new Date(), 12), 'yyyy-MM-dd'),
        p_end_date: endDate || format(new Date(), 'yyyy-MM-dd'),
        p_branch_id: branchId || null,
        p_site_id: siteId || null,
      });

      if (error) throw error;
      return (data || []) as KPITrendData[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useKPIPeriodComparison(
  dateRange: 'week' | 'month' | '90days' | 'ytd',
  branchId?: string,
  siteId?: string
) {
  return useQuery({
    queryKey: ['kpi-period-comparison', dateRange, branchId, siteId],
    queryFn: async () => {
      const now = new Date();
      let currentStart: Date;
      let currentEnd: Date = now;
      let previousStart: Date;
      let previousEnd: Date;

      switch (dateRange) {
        case 'week':
          currentStart = subDays(now, 7);
          previousEnd = subDays(now, 8);
          previousStart = subDays(now, 14);
          break;
        case 'month':
          currentStart = subDays(now, 30);
          previousEnd = subDays(now, 31);
          previousStart = subDays(now, 60);
          break;
        case '90days':
          currentStart = subDays(now, 90);
          previousEnd = subDays(now, 91);
          previousStart = subDays(now, 180);
          break;
        case 'ytd':
          currentStart = new Date(now.getFullYear(), 0, 1);
          previousEnd = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
          previousStart = new Date(now.getFullYear() - 1, 0, 1);
          break;
        default:
          currentStart = subDays(now, 30);
          previousEnd = subDays(now, 31);
          previousStart = subDays(now, 60);
      }

      const { data, error } = await supabase.rpc('get_kpi_period_comparison', {
        p_current_start: format(currentStart, 'yyyy-MM-dd'),
        p_current_end: format(currentEnd, 'yyyy-MM-dd'),
        p_previous_start: format(previousStart, 'yyyy-MM-dd'),
        p_previous_end: format(previousEnd, 'yyyy-MM-dd'),
        p_branch_id: branchId || null,
        p_site_id: siteId || null,
      });

      if (error) throw error;
      
      // Convert to a map for easy access
      const comparisonMap: Record<string, KPIPeriodComparison> = {};
      (data || []).forEach((item: KPIPeriodComparison) => {
        comparisonMap[item.metric_name] = item;
      });
      
      return comparisonMap;
    },
    staleTime: 5 * 60 * 1000,
  });
}

// Helper to get period label
export function getPeriodLabel(dateRange: 'week' | 'month' | '90days' | 'ytd'): string {
  switch (dateRange) {
    case 'week': return 'vs previous week';
    case 'month': return 'vs previous month';
    case '90days': return 'vs previous 90 days';
    case 'ytd': return 'vs same period last year';
    default: return 'vs previous period';
  }
}
