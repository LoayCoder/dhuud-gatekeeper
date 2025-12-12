import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

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
  critical: number;
  high: number;
  medium: number;
  low: number;
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
}

export interface HSSEEventDashboardData {
  summary: DashboardSummary;
  by_status: StatusDistribution;
  by_severity: SeverityDistribution;
  by_event_type: EventTypeDistribution;
  monthly_trend: MonthlyTrendItem[];
  actions: ActionStats;
}

export function useHSSEEventDashboard(startDate?: Date, endDate?: Date) {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['hsse-event-dashboard', profile?.tenant_id, startDate?.toISOString(), endDate?.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_hsse_event_dashboard_stats', {
        p_start_date: startDate?.toISOString().split('T')[0] || null,
        p_end_date: endDate?.toISOString().split('T')[0] || null,
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
