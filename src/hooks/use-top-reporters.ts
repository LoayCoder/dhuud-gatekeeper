import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface TopReporter {
  reporter_id: string;
  reporter_name: string;
  avatar_url: string | null;
  department_name: string | null;
  total_reports: number;
  incidents_reported: number;
  observations_reported: number;
  first_report_date: string;
  last_report_date: string;
  rank: number;
}

export function useTopReporters(limit: number = 10, startDate?: Date, endDate?: Date) {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['top-reporters', profile?.tenant_id, limit, startDate?.toISOString(), endDate?.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_top_reporters', {
        p_limit: limit,
        p_start_date: startDate?.toISOString().split('T')[0] || null,
        p_end_date: endDate?.toISOString().split('T')[0] || null,
      });

      if (error) throw error;
      return (data as unknown as TopReporter[]) || [];
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
