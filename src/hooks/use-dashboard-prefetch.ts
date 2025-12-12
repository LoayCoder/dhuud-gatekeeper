import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { DASHBOARD_CACHE_CONFIG } from "./use-incident-progression";

/**
 * Prefetches all dashboard queries in parallel on initial mount
 * This improves perceived performance by loading data before the user scrolls to see it
 */
export function useDashboardPrefetch(startDate?: Date, endDate?: Date) {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  useEffect(() => {
    if (!profile?.tenant_id) return;

    const prefetchQueries = async () => {
      const startDateStr = startDate?.toISOString().split('T')[0] || null;
      const endDateStr = endDate?.toISOString().split('T')[0] || null;

      // Prefetch all dashboard queries in parallel
      await Promise.allSettled([
        // Main dashboard stats
        queryClient.prefetchQuery({
          queryKey: ['hsse-event-dashboard', profile.tenant_id, startDate?.toISOString(), endDate?.toISOString()],
          queryFn: async () => {
            const { data, error } = await supabase.rpc('get_hsse_event_dashboard_stats', {
              p_start_date: startDateStr,
              p_end_date: endDateStr,
            });
            if (error) throw error;
            return data;
          },
          ...DASHBOARD_CACHE_CONFIG,
        }),

        // Events by location
        queryClient.prefetchQuery({
          queryKey: ['events-by-location', profile.tenant_id, startDate?.toISOString(), endDate?.toISOString()],
          queryFn: async () => {
            const { data, error } = await supabase.rpc('get_events_by_location', {
              p_start_date: startDateStr,
              p_end_date: endDateStr,
            });
            if (error) throw error;
            return data;
          },
          ...DASHBOARD_CACHE_CONFIG,
        }),

        // Top reporters
        queryClient.prefetchQuery({
          queryKey: ['top-reporters', profile.tenant_id, 10, startDate?.toISOString(), endDate?.toISOString()],
          queryFn: async () => {
            const { data, error } = await supabase.rpc('get_top_reporters', {
              p_limit: 10,
              p_start_date: startDateStr,
              p_end_date: endDateStr,
            });
            if (error) throw error;
            return data;
          },
          ...DASHBOARD_CACHE_CONFIG,
        }),
      ]);
    };

    prefetchQueries();
  }, [queryClient, profile?.tenant_id, startDate?.toISOString(), endDate?.toISOString()]);
}
