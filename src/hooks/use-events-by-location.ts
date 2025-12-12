import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface BranchEventData {
  branch_id: string;
  branch_name: string;
  total_events: number;
  incidents: number;
  observations: number;
  open_investigations: number;
  // Enhanced metrics
  incidents_open: number;
  incidents_closed: number;
  observations_open: number;
  observations_closed: number;
  total_actions: number;
  actions_open: number;
  actions_overdue: number;
  prev_total_events: number;
}

export interface SiteEventData {
  site_id: string;
  site_name: string;
  branch_name: string;
  total_events: number;
  incidents: number;
  observations: number;
  open_investigations: number;
  // Enhanced metrics
  incidents_open: number;
  incidents_closed: number;
  observations_open: number;
  observations_closed: number;
  total_actions: number;
  actions_open: number;
  prev_total_events: number;
}

export interface DepartmentEventData {
  department_id: string;
  department_name: string;
  total_events: number;
  incidents: number;
  observations: number;
  open_investigations: number;
  // Enhanced metrics
  events_open: number;
  events_closed: number;
  total_actions: number;
  actions_open: number;
  actions_overdue: number;
  prev_total_events: number;
}

export interface EventsByLocationData {
  by_branch: BranchEventData[];
  by_site: SiteEventData[];
  by_department: DepartmentEventData[];
}

export function useEventsByLocation(startDate?: Date, endDate?: Date) {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['events-by-location', profile?.tenant_id, startDate?.toISOString(), endDate?.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_events_by_location', {
        p_start_date: startDate?.toISOString().split('T')[0] || null,
        p_end_date: endDate?.toISOString().split('T')[0] || null,
      });

      if (error) throw error;
      return data as unknown as EventsByLocationData;
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
