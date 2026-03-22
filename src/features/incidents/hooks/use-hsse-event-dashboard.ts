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
  closed_in_period: number;
  avg_closure_days: number;
  incidents_open: number;
  incidents_closed: number;
  incidents_overdue: number;
  observations_open: number;
  observations_closed: number;
  total_investigations: number;
  investigations_open: number;
  investigations_closed: number;
  near_miss_count?: number;
  near_miss_rate?: number;
}

export interface StatusDistribution {
  [key: string]: number;
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

export function useHSSEEventDashboard(startDate?: Date, endDate?: Date, branchId?: string, siteId?: string) {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['hsse-event-dashboard', profile?.tenant_id, startDate?.toISOString(), endDate?.toISOString(), branchId, siteId],
    queryFn: async () => {
      const startDateStr = startDate?.toISOString().split('T')[0] || null;
      const endDateStr = endDate?.toISOString().split('T')[0] || null;

      const { data, error } = await supabase.rpc('get_hsse_dashboard_summary', {
        p_start_date: startDateStr,
        p_end_date: endDateStr,
        p_branch_id: branchId || null,
        p_site_id: siteId || null,
      });

      if (error) throw error;

      const result = data as unknown as {
        summary: Record<string, number>;
        by_status: Record<string, number>;
        by_severity: Record<string, number>;
        by_event_type: Record<string, number>;
        by_subtype: Record<string, number>;
        monthly_trend: MonthlyTrendItem[];
        actions: Record<string, number>;
      };

      // Map server response to typed interfaces
      const summary: DashboardSummary = {
        total_events: result.summary.total_events ?? 0,
        total_incidents: result.summary.total_incidents ?? 0,
        total_observations: result.summary.total_observations ?? 0,
        open_investigations: result.summary.open_investigations ?? 0,
        pending_closure: result.summary.pending_closure ?? 0,
        closed_this_month: result.summary.closed_in_period ?? 0,
        closed_in_period: result.summary.closed_in_period ?? 0,
        avg_closure_days: result.summary.avg_closure_days ?? 0,
        incidents_open: result.summary.incidents_open ?? 0,
        incidents_closed: result.summary.incidents_closed ?? 0,
        incidents_overdue: result.summary.incidents_overdue ?? 0,
        observations_open: result.summary.observations_open ?? 0,
        observations_closed: result.summary.observations_closed ?? 0,
        total_investigations: result.summary.total_investigations ?? 0,
        investigations_open: result.summary.investigations_open ?? 0,
        investigations_closed: result.summary.investigations_closed ?? 0,
        near_miss_count: result.summary.near_miss_count ?? 0,
      };

      // Compute near miss rate
      if (summary.total_incidents > 0) {
        summary.near_miss_rate = ((summary.near_miss_count || 0) / summary.total_incidents) * 100;
      }

      const by_severity: SeverityDistribution = {
        level_1: result.by_severity?.level_1 ?? 0,
        level_2: result.by_severity?.level_2 ?? 0,
        level_3: result.by_severity?.level_3 ?? 0,
        level_4: result.by_severity?.level_4 ?? 0,
        level_5: result.by_severity?.level_5 ?? 0,
        unassigned: result.by_severity?.unassigned ?? 0,
      };

      const by_event_type: EventTypeDistribution = {
        observation: result.by_event_type?.observation ?? 0,
        incident: result.by_event_type?.incident ?? 0,
        near_miss: result.by_event_type?.near_miss ?? 0,
        security_event: result.by_event_type?.security_event ?? 0,
        environmental_event: result.by_event_type?.environmental_event ?? 0,
      };

      const actions: ActionStats = {
        total_actions: result.actions?.total_actions ?? 0,
        open_actions: result.actions?.open_actions ?? 0,
        actions_closed: result.actions?.actions_closed ?? 0,
        actions_in_progress: result.actions?.actions_in_progress ?? 0,
        actions_pending_verification: result.actions?.actions_pending_verification ?? 0,
        overdue_actions: result.actions?.overdue_actions ?? 0,
        critical_actions: result.actions?.critical_actions ?? 0,
        high_priority_actions: result.actions?.high_priority_actions ?? 0,
      };

      // Compute overdue rate
      if (actions.total_actions > 0) {
        actions.overdue_rate = (actions.overdue_actions / actions.total_actions) * 100;
      }

      const dashboardData: HSSEEventDashboardData = {
        summary,
        by_status: result.by_status ?? {},
        by_severity,
        by_event_type,
        by_subtype: result.by_subtype ?? {},
        monthly_trend: result.monthly_trend ?? [],
        actions,
      };

      return dashboardData;
    },
    enabled: !!profile?.tenant_id,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: true,
  });
}
