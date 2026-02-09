import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useBranchFilter } from "@/hooks/use-branch-filter";
import { format, parseISO, startOfMonth, subMonths, isSameMonth } from "date-fns";

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
  incidents_overdue: number; // Placeholder (0 for now without due_date logic)
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
      // 1. Fetch raw incidents based on date range and filters
      let query = supabase
        .from('incidents')
        .select(`
          id, event_type, subtype, status, severity_v2, created_at, updated_at, 
          occurred_at, incident_type, branch_id
        `)
        .eq('tenant_id', profile?.tenant_id)
        .is('deleted_at', null);

      if (startDate) {
        query = query.gte('created_at', startDate.toISOString());
      }
      if (endDate) {
        // Add one day to include the end date fully if needed, or assume inclusive
        query = query.lte('created_at', endDate.toISOString());
      }

      if (!isAllBranchesMode && activeBranchId) {
        query = query.eq('branch_id', activeBranchId);
      }

      const { data: incidents, error } = await query;
      if (error) throw error;

      console.log('HSSE Dashboard Raw Incidents:', incidents); // Debug log

      // 2. Client-side Aggregation
      const summary: DashboardSummary = {
        total_events: incidents.length,
        total_incidents: 0,
        total_observations: 0,
        open_investigations: 0,
        pending_closure: 0,
        closed_this_month: 0,
        avg_closure_days: 0,
        incidents_open: 0,
        incidents_closed: 0,
        incidents_overdue: 0,
        observations_open: 0,
        observations_closed: 0,
        total_investigations: 0,
        investigations_open: 0,
        investigations_closed: 0,
        near_miss_count: 0,
      };

      const by_status: StatusDistribution = {
        submitted: 0, expert_screening: 0, pending_manager_approval: 0,
        investigation_in_progress: 0, pending_closure: 0, closed: 0,
        returned: 0, rejected: 0,
      };

      const by_severity: SeverityDistribution = {
        level_1: 0, level_2: 0, level_3: 0, level_4: 0, level_5: 0, unassigned: 0,
      };

      const by_event_type: EventTypeDistribution = {
        observation: 0, incident: 0, near_miss: 0, security_event: 0, environmental_event: 0,
      };

      const by_subtype: SubtypeDistribution = {};

      const currentMonth = format(new Date(), 'yyyy-MM');

      (incidents as any[] || []).forEach(inc => {
        // --- Event Type Counts ---
        if (inc.event_type === 'incident') {
          summary.total_incidents++;
          by_event_type.incident++;
          if (inc.incident_type === 'near_miss') {
            by_event_type.near_miss++;
            summary.near_miss_count = (summary.near_miss_count || 0) + 1;
          } else if (inc.incident_type === 'security') {
            by_event_type.security_event++;
          } else if (inc.incident_type === 'environmental') {
            by_event_type.environmental_event++;
          }
        } else if (inc.event_type === 'observation') {
          summary.total_observations++;
          by_event_type.observation++;
        }

        // --- Status Counts ---
        // Map simplified statuses if needed, or use exact
        const status = inc.status as keyof StatusDistribution;
        if (by_status[status] !== undefined) {
          by_status[status]++;
        }

        const isOpen = status !== 'closed' && status !== 'rejected';

        if (inc.event_type === 'incident') {
          if (isOpen) summary.incidents_open++;
          else summary.incidents_closed++;

          // Assume any non-closed incident implies an investigation workflow
          summary.total_investigations++;
          if (isOpen) {
            summary.investigations_open++;
            summary.open_investigations++; // Maps to header card
          } else {
            summary.investigations_closed++;
          }
        } else if (inc.event_type === 'observation') {
          if (isOpen) summary.observations_open++;
          else summary.observations_closed++;
        }

        if (status === 'pending_closure') summary.pending_closure++;

        // Closed this month logic (using updated_at as proxy for closure time)
        if (status === 'closed' && inc.updated_at) {
          if (format(parseISO(inc.updated_at), 'yyyy-MM') === currentMonth) {
            summary.closed_this_month++;
          }
        }

        // --- Overdue Logic (SLA based on Severity) ---
        if (isOpen) {
          const ageInHours = (new Date().getTime() - new Date(inc.created_at).getTime()) / (1000 * 60 * 60);
          let slaHours = 720; // Default 30 days

          // Define SLA based on severity
          if (inc.severity_v2 === 'level_5') slaHours = 24; // Critical: 24h
          else if (inc.severity_v2 === 'level_4') slaHours = 72; // Major: 3 days
          else if (inc.severity_v2 === 'level_3') slaHours = 168; // Moderate: 7 days
          else if (inc.severity_v2 === 'level_2') slaHours = 336; // Minor: 14 days

          if (ageInHours > slaHours) {
            summary.incidents_overdue++;
          }
        }

        // --- Severity Counts ---
        const sev = inc.severity_v2 as keyof SeverityDistribution;
        if (sev && by_severity[sev] !== undefined) {
          by_severity[sev]++;
        } else {
          by_severity.unassigned++;
        }

        // --- Subtype Counts ---
        if (inc.subtype) {
          by_subtype[inc.subtype] = (by_subtype[inc.subtype] || 0) + 1;
        }
      });

      // --- Monthly Trend ---
      // Generate last 6 months buckets
      const trendMap = new Map<string, MonthlyTrendItem>();
      for (let i = 5; i >= 0; i--) {
        const d = subMonths(startOfMonth(new Date()), i);
        const monthKey = format(d, 'yyyy-MM');
        trendMap.set(monthKey, { month: monthKey, total: 0, incidents: 0, observations: 0 });
      }

      incidents.forEach(inc => {
        const monthKey = format(parseISO(inc.created_at), 'yyyy-MM');
        if (trendMap.has(monthKey)) {
          const item = trendMap.get(monthKey)!;
          item.total++;
          if (inc.event_type === 'incident') item.incidents++;
          if (inc.event_type === 'observation') item.observations++;
        }
      });

      const monthly_trend = Array.from(trendMap.values());

      // 3. Fetch Corrective Actions (Parallel Fetch)
      let actionsQuery = supabase
        .from('corrective_actions')
        .select('id, status, due_date, priority, created_at, completed_date, incident_id')
        .eq('tenant_id', profile?.tenant_id)
        .is('deleted_at', null);

      if (startDate) actionsQuery = actionsQuery.gte('created_at', startDate.toISOString());
      if (endDate) actionsQuery = actionsQuery.lte('created_at', endDate.toISOString());

      const { data: actionsData, error: actionsError } = await actionsQuery;
      if (actionsError) throw actionsError;

      // 4. Aggregate Actions
      const actions: ActionStats = {
        open_actions: 0, overdue_actions: 0, critical_actions: 0, high_priority_actions: 0,
        total_actions: actionsData.length,
        actions_closed: 0,
        actions_in_progress: 0,
        actions_pending_verification: 0
      };

      const now = new Date();

      actionsData.forEach(action => {
        const isClosed = action.status === 'completed' || action.status === 'closed';
        if (isClosed) {
          actions.actions_closed++;
        } else {
          actions.open_actions++;
          if (action.status === 'in_progress') actions.actions_in_progress++;
          if (action.status === 'pending_verification') actions.actions_pending_verification++;

          // Check overdue
          if (action.due_date && new Date(action.due_date) < now) {
            actions.overdue_actions++;
          }
        }

        if (action.priority === 'critical') actions.critical_actions++;
        if (action.priority === 'high') actions.high_priority_actions++;
      });

      const dashboardData: HSSEEventDashboardData = {
        summary,
        by_status,
        by_severity,
        by_event_type,
        by_subtype,
        monthly_trend,
        actions
      };

      return dashboardData;
    },
    enabled: !!profile?.tenant_id,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: true,
  });
}
