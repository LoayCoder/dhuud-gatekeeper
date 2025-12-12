import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface QuickActionCounts {
  pending_approvals: number;
  open_investigations: number;
  overdue_actions: number;
  my_actions: number;
}

export function useQuickActionCounts() {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['dashboard-quick-action-counts', profile?.tenant_id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_dashboard_quick_action_counts');

      if (error) throw error;
      return data as unknown as QuickActionCounts;
    },
    enabled: !!profile?.tenant_id,
    staleTime: 30 * 1000, // 30 seconds
  });
}
