import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface MyReportingStats {
  my_incidents: number;
  my_observations: number;
  my_incidents_this_month: number;
  my_observations_this_month: number;
  completed_actions: number;
  company_rank: number | null;
  department_rank: number | null;
  total_reporters: number;
  dept_reporters: number;
  percentile: number;
  trend_incidents: number;
  trend_observations: number;
}

export function useMyReportingStats() {
  const { isAuthenticated, user } = useAuth();

  return useQuery({
    queryKey: ['my-reporting-stats', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_my_reporting_stats');

      if (error) {
        console.error('Error fetching reporting stats:', error);
        throw error;
      }

      const result = data as unknown as MyReportingStats | { error: string };
      
      if (result && typeof result === 'object' && 'error' in result && typeof result.error === 'string') {
        throw new Error(result.error);
      }

      return result as MyReportingStats;
    },
    enabled: isAuthenticated && !!user?.id,
    staleTime: 60 * 1000,
    refetchInterval: 60 * 1000,
  });
}
