import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { WaterfallStage } from "@/components/incidents/dashboard/IncidentWaterfallChart";

// Dashboard cache configuration
export const DASHBOARD_CACHE_CONFIG = {
  staleTime: 5 * 60 * 1000,        // 5 minutes - data considered fresh
  gcTime: 30 * 60 * 1000,          // 30 minutes - keep in cache
  refetchOnWindowFocus: true,       // Refetch when user returns to tab
  refetchInterval: 5 * 60 * 1000,   // Background refresh every 5 minutes
};

export interface IncidentProgressionData {
  waterfall: WaterfallStage[];
  summary: {
    total_open: number;
    new_this_period: number;
    closed_this_period: number;
    net_change: number;
  };
}

const STATUS_STAGES: { key: string; label: string; order: number }[] = [
  { key: 'submitted', label: 'Submitted', order: 1 },
  { key: 'expert_screening', label: 'Screening', order: 2 },
  { key: 'pending_manager_approval', label: 'Pending Approval', order: 3 },
  { key: 'investigation_in_progress', label: 'In Investigation', order: 4 },
  { key: 'pending_closure', label: 'Pending Closure', order: 5 },
];

export function useIncidentProgression(startDate?: Date, endDate?: Date) {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['incident-progression', profile?.tenant_id, startDate?.toISOString(), endDate?.toISOString()],
    queryFn: async (): Promise<IncidentProgressionData> => {
      // Fetch all non-deleted incidents
      let query = supabase
        .from('incidents')
        .select('id, status, created_at, occurred_at')
        .is('deleted_at', null);

      if (startDate) {
        query = query.gte('created_at', startDate.toISOString());
      }
      if (endDate) {
        query = query.lte('created_at', endDate.toISOString());
      }

      const { data: incidents, error } = await query;
      if (error) throw error;

      // Count incidents by status
      const statusCounts: Record<string, { current: number; entering: number; leaving: number }> = {};
      
      STATUS_STAGES.forEach(stage => {
        statusCounts[stage.key] = { current: 0, entering: 0, leaving: 0 };
      });

      let closedCount = 0;
      let totalOpen = 0;

      (incidents || []).forEach((inc: any) => {
        const status = inc.status || 'submitted';
        
        if (status === 'closed') {
          closedCount++;
        } else {
          totalOpen++;
          if (statusCounts[status]) {
            statusCounts[status].current++;
          }
        }
      });

      // Build waterfall data
      const waterfall: WaterfallStage[] = [];
      const totalEvents = incidents?.length || 0;

      // Start bar - total new incidents in period
      waterfall.push({
        stage: 'New Events',
        stageKey: 'new',
        entering: totalEvents,
        leaving: 0,
        net: totalEvents,
        running_total: totalEvents,
        type: 'start',
      });

      // Intermediate stages - show net movement
      let runningTotal = totalEvents;
      
      // Calculate closed/resolved as leaving
      runningTotal -= closedCount;
      if (closedCount > 0) {
        waterfall.push({
          stage: 'Resolved/Closed',
          stageKey: 'closed',
          entering: 0,
          leaving: closedCount,
          net: -closedCount,
          running_total: runningTotal,
          type: 'negative',
        });
      }

      // Final total bar
      waterfall.push({
        stage: 'Current Open',
        stageKey: 'open_total',
        entering: 0,
        leaving: 0,
        net: 0,
        running_total: totalOpen,
        type: 'total',
      });

      return {
        waterfall,
        summary: {
          total_open: totalOpen,
          new_this_period: totalEvents,
          closed_this_period: closedCount,
          net_change: totalEvents - closedCount,
        },
      };
    },
    enabled: !!profile?.tenant_id,
    ...DASHBOARD_CACHE_CONFIG,
    placeholderData: (previousData) => previousData, // Show stale data while refetching
  });
}
