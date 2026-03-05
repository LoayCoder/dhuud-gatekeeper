import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useBranchFilter } from '@/hooks/use-branch-filter';

export interface IncidentMetricsBySeverity {
  level_1: number;
  level_2: number;
  level_3: number;
  level_4: number;
  level_5: number;
  unassigned: number;
}

export interface IncidentTrendDataPoint {
  month: string;
  count: number;
}

export function useIncidentMetricsBySeverity(
  startDate: string,
  endDate: string,
  branchId?: string,
  siteId?: string
) {
  const { branchIds, isAllBranchesMode, isLoading: branchLoading, queryKey: branchQueryKey } = useBranchFilter();
  
  const effectiveBranchIds = branchId ? [branchId] : branchIds;
  const shouldFilterByBranch = branchId ? true : !isAllBranchesMode;

  return useQuery({
    queryKey: ['incident-metrics-severity', ...branchQueryKey, startDate, endDate, branchId, siteId],
    queryFn: async () => {
      let query = supabase
        .from('incidents')
        .select('severity_v2')
        .eq('event_type', 'incident')
        .gte('occurred_at', startDate)
        .lte('occurred_at', endDate)
        .is('deleted_at', null);

      if (shouldFilterByBranch && effectiveBranchIds && effectiveBranchIds.length > 0) {
        if (effectiveBranchIds.length === 1) {
          query = query.eq('branch_id', effectiveBranchIds[0]);
        } else {
          query = query.in('branch_id', effectiveBranchIds);
        }
      }
      if (siteId) query = query.eq('site_id', siteId);

      const { data, error } = await query;
      if (error) throw error;

      const metrics: IncidentMetricsBySeverity = {
        level_1: 0,
        level_2: 0,
        level_3: 0,
        level_4: 0,
        level_5: 0,
        unassigned: 0,
      };

      (data ?? []).forEach((incident) => {
        const sev = incident.severity_v2 as string | null;
        if (sev && sev in metrics) {
          metrics[sev as keyof IncidentMetricsBySeverity]++;
        } else {
          metrics.unassigned++;
        }
      });

      return metrics;
    },
    enabled: !branchLoading,
    staleTime: 5 * 60 * 1000,
  });
}

export function useIncidentFrequencyTrend(
  startDate: string,
  endDate: string,
  branchId?: string,
  siteId?: string
) {
  const { branchIds, isAllBranchesMode, isLoading: branchLoading, queryKey: branchQueryKey } = useBranchFilter();
  
  const effectiveBranchIds = branchId ? [branchId] : branchIds;
  const shouldFilterByBranch = branchId ? true : !isAllBranchesMode;

  return useQuery({
    queryKey: ['incident-frequency-trend', ...branchQueryKey, startDate, endDate, branchId, siteId],
    queryFn: async () => {
      let query = supabase
        .from('incidents')
        .select('occurred_at')
        .eq('event_type', 'incident')
        .gte('occurred_at', startDate)
        .lte('occurred_at', endDate)
        .is('deleted_at', null)
        .not('occurred_at', 'is', null);

      if (shouldFilterByBranch && effectiveBranchIds && effectiveBranchIds.length > 0) {
        if (effectiveBranchIds.length === 1) {
          query = query.eq('branch_id', effectiveBranchIds[0]);
        } else {
          query = query.in('branch_id', effectiveBranchIds);
        }
      }
      if (siteId) query = query.eq('site_id', siteId);

      const { data, error } = await query;
      if (error) throw error;

      const monthCounts: Record<string, number> = {};
      (data ?? []).forEach((incident) => {
        if (incident.occurred_at) {
          const month = incident.occurred_at.substring(0, 7);
          monthCounts[month] = (monthCounts[month] || 0) + 1;
        }
      });

      const trend: IncidentTrendDataPoint[] = Object.entries(monthCounts)
        .map(([month, count]) => ({ month, count }))
        .sort((a, b) => a.month.localeCompare(b.month));

      return trend;
    },
    enabled: !branchLoading,
    staleTime: 5 * 60 * 1000,
  });
}
