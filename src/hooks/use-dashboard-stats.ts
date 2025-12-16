import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface DashboardModuleStats {
  ptw: {
    active_permits: number;
    pending_approvals: number;
    expiring_today: number;
  };
  security: {
    open_alerts: number;
    critical_alerts: number;
    visitors_on_site: number;
  };
  inspections: {
    due_today: number;
    overdue: number;
    completed_this_week: number;
  };
  contractors: {
    active_workers: number;
    pending_approvals: number;
    expiring_inductions: number;
  };
  actions: {
    my_pending: number;
    overdue: number;
    due_this_week: number;
  };
}

export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard-module-stats'],
    queryFn: async (): Promise<DashboardModuleStats> => {
      const defaultStats: DashboardModuleStats = {
        ptw: { active_permits: 0, pending_approvals: 0, expiring_today: 0 },
        security: { open_alerts: 0, critical_alerts: 0, visitors_on_site: 0 },
        inspections: { due_today: 0, overdue: 0, completed_this_week: 0 },
        contractors: { active_workers: 0, pending_approvals: 0, expiring_inductions: 0 },
        actions: { my_pending: 0, overdue: 0, due_this_week: 0 },
      };
      
      const { data, error } = await supabase.rpc('get_dashboard_module_stats');
      
      if (error) {
        console.error('Failed to fetch dashboard stats:', error);
        return defaultStats;
      }
      
      if (!data || typeof data !== 'object') {
        return defaultStats;
      }

      // Safely extract and type the response
      const result = data as Record<string, unknown>;
      return {
        ptw: (result.ptw as DashboardModuleStats['ptw']) || defaultStats.ptw,
        security: (result.security as DashboardModuleStats['security']) || defaultStats.security,
        inspections: (result.inspections as DashboardModuleStats['inspections']) || defaultStats.inspections,
        contractors: (result.contractors as DashboardModuleStats['contractors']) || defaultStats.contractors,
        actions: (result.actions as DashboardModuleStats['actions']) || defaultStats.actions,
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 5 * 60 * 1000,
  });
}
