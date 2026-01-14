import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useBranchFilter } from "@/hooks/use-branch-filter";

export interface DashboardSummary {
  total_events: number;
  total_incidents: number;
  total_observations: number;
  open_investigations: number;
  pending_closure: number;
  closed_this_month: number;
  avg_closure_days: number;
  // Extended breakdowns
  incidents_open: number;
  incidents_closed: number;
  incidents_overdue: number;
  observations_open: number;
  observations_closed: number;
  total_investigations: number;
  investigations_open: number;
  investigations_closed: number;
  // Near miss analysis
  near_miss_count?: number;
  near_miss_rate?: number;
}

export interface StatusDistribution {
  submitted: number;
  expert_screening: number;
  pending_manager_approval: number;
  investigation_in_progress: number;
  pending_closure: number;
  closed: number;
  returned: number;
  rejected: number;
}

export interface SeverityDistribution {
  level_1: number;
  level_2: number;
  level_3: number;
  level_4: number;
  level_5: number;
  unassigned: number;
}

export interface EventTypeDistribution {
  observation: number;
  incident: number;
  near_miss: number;
  security_event: number;
  environmental_event: number;
}

export interface MonthlyTrendItem {
  month: string;
  total: number;
  incidents: number;
  observations: number;
}

export interface ActionStats {
  open_actions: number;
  overdue_actions: number;
  critical_actions: number;
  high_priority_actions: number;
  // Extended breakdowns
  total_actions: number;
  actions_closed: number;
  actions_in_progress: number;
  actions_pending_verification: number;
  overdue_rate?: number;
  avg_completion_days?: number;
}

export interface SubtypeDistribution {
  [key: string]: number;
}

export interface HSSEEventDashboardData {
  summary: DashboardSummary;
  by_status: StatusDistribution;
  by_severity: SeverityDistribution;
  by_event_type: EventTypeDistribution;
  by_subtype?: SubtypeDistribution;
  monthly_trend: MonthlyTrendItem[];
  actions: ActionStats;
}

export function useHSSEEventDashboard(startDate?: Date, endDate?: Date) {
  const { profile } = useAuth();
  const { activeBranchId, isAllBranchesMode, queryKey: branchQueryKey } = useBranchFilter();

  return useQuery({
    queryKey: ['hsse-event-dashboard', profile?.tenant_id, ...branchQueryKey, startDate?.toISOString(), endDate?.toISOString()],
    queryFn: async () => {
      // Call RPC with branch_id filter if not in "all branches" mode
      const { data, error } = await supabase.rpc('get_hsse_event_dashboard_stats', {
        p_start_date: startDate?.toISOString().split('T')[0] || null,
        p_end_date: endDate?.toISOString().split('T')[0] || null,
        // Pass branch_id if filtering by specific branch
        ...((!isAllBranchesMode && activeBranchId) ? { p_branch_id: activeBranchId } : {}),
      });

      if (error) throw error;
      return data as unknown as HSSEEventDashboardData;
    },
    enabled: !!profile?.tenant_id,
    // Enhanced caching for better performance
    staleTime: 5 * 60 * 1000,           // 5 minutes - data considered fresh
    gcTime: 30 * 60 * 1000,             // 30 minutes - keep in cache
    refetchOnWindowFocus: true,          // Refresh when user returns to tab
    refetchInterval: 5 * 60 * 1000,      // Background refresh every 5 minutes
    placeholderData: (previousData) => previousData, // Show stale data while refetching
  });
}
