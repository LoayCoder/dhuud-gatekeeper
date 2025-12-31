import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface DeptRepDashboardStats {
  new_count: number;
  in_progress_count: number;
  overdue_count: number;
  total_count: number;
  has_department: boolean;
}

/**
 * Fetch department representative dashboard statistics
 * Returns event counts scoped to the user's assigned department
 */
export function useDeptRepDashboard() {
  return useQuery({
    queryKey: ['dept-rep-dashboard-stats'],
    queryFn: async (): Promise<DeptRepDashboardStats> => {
      const { data, error } = await supabase.rpc('get_dept_rep_event_dashboard_stats');

      if (error) {
        console.error('Error fetching dept rep dashboard stats:', error);
        throw error;
      }

      return data as unknown as DeptRepDashboardStats;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes cache
    gcTime: 30 * 60 * 1000,
  });
}
