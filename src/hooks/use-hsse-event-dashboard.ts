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
}

export interface StatusDistribution {
  submitted: number;
  investigation_in_progress: number;
  pending_closure: number;
  closed: number;
}

export interface SeverityDistribution {
  critical: number;
  high: number;
  medium: number;
  low: number;
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
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}
