import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useBranchFilter } from '@/hooks/use-branch-filter';

export interface ObservationTrendData {
  by_month: Array<{
    month: string;
    positive: number;
    negative: number;
    total: number;
  }> | null;
  by_department: Array<{
    department_id: string;
    department_name: string;
    positive: number;
    negative: number;
    total: number;
    positive_ratio: number | null;
  }> | null;
  by_site: Array<{
    site_id: string;
    site_name: string;
    positive: number;
    negative: number;
    total: number;
    positive_ratio: number | null;
  }> | null;
  summary: {
    total_positive: number;
    total_negative: number;
    total_observations: number;
    overall_ratio: number | null;
  } | null;
}

interface UseObservationTrendsParams {
  startDate?: Date;
  endDate?: Date;
  branchId?: string;
  siteId?: string;
}

export function useObservationTrends(params: UseObservationTrendsParams = {}) {
  const { startDate, endDate, branchId, siteId } = params;
  const { activeBranchId, isAllBranchesMode, queryKey: branchQueryKey } = useBranchFilter();
  
  // Use explicit branchId if passed, otherwise use context branch
  const effectiveBranchId = branchId ?? (!isAllBranchesMode ? activeBranchId : null);

  return useQuery({
    queryKey: ['observation-trends', ...branchQueryKey, startDate?.toISOString(), endDate?.toISOString(), branchId, siteId],
    queryFn: async (): Promise<ObservationTrendData> => {
      const { data, error } = await supabase.rpc('get_observation_trend_analytics', {
        p_start_date: startDate?.toISOString() || null,
        p_end_date: endDate?.toISOString() || null,
        p_branch_id: effectiveBranchId || null,
        p_site_id: siteId || null,
      });

      if (error) throw error;
      return data as unknown as ObservationTrendData;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
