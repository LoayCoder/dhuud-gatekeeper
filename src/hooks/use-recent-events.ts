import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface RecentEvent {
  id: string;
  reference_id: string;
  description_preview: string;
  event_type: string;
  subtype: string | null;
  status: string;
  severity: string | null;
  created_at: string;
  occurred_at: string | null;
}

export function useRecentEvents(limit: number = 10) {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['recent-hsse-events', profile?.tenant_id, limit],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_recent_hsse_events', {
        p_limit: limit,
      });

      if (error) throw error;
      return (data || []) as unknown as RecentEvent[];
    },
    enabled: !!profile?.tenant_id,
    staleTime: 60 * 1000, // 1 minute
  });
}
