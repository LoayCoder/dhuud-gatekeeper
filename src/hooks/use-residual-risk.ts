import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ResidualRiskMetrics {
  summary: {
    total_assessed: number;
    avg_risk_reduction: number | null;
    improved_count: number;
    unchanged_count: number;
    worsened_count: number;
    effectiveness_rate: number | null;
  } | null;
  by_initial_level: Array<{
    initial_risk_level: string;
    count: number;
    avg_reduction: number | null;
  }> | null;
  monthly_trend: Array<{
    month: string;
    assessed_count: number;
    avg_reduction: number | null;
  }> | null;
}

interface UseResidualRiskParams {
  startDate?: Date;
  endDate?: Date;
}

export function useResidualRiskMetrics(params: UseResidualRiskParams = {}) {
  const { startDate, endDate } = params;

  return useQuery({
    queryKey: ['residual-risk-metrics', startDate?.toISOString(), endDate?.toISOString()],
    queryFn: async (): Promise<ResidualRiskMetrics> => {
      const { data, error } = await supabase.rpc('get_residual_risk_metrics', {
        p_start_date: startDate?.toISOString() || null,
        p_end_date: endDate?.toISOString() || null,
      });

      if (error) throw error;
      return data as unknown as ResidualRiskMetrics;
    },
    staleTime: 5 * 60 * 1000,
  });
}
