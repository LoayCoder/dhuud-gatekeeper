import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface QuickActionCounts {
  pending_approvals: number;
  open_investigations: number;
  overdue_actions: number;
  my_actions: number;
  // Contractor approvals
  pending_workers: number;
  pending_gate_passes: number;
}

export function useQuickActionCounts() {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['dashboard-quick-action-counts', profile?.tenant_id],
    queryFn: async () => {
      // Get base counts from RPC
      const { data: baseCounts, error } = await supabase.rpc('get_dashboard_quick_action_counts');
      if (error) throw error;
      
      // Get contractor worker approvals count
      const { count: workersCount } = await supabase
        .from('contractor_workers')
        .select('*', { count: 'exact', head: true })
        .eq('approval_status', 'pending')
        .is('deleted_at', null);
      
      // Get gate pass approvals count
      const { count: gatePassCount } = await supabase
        .from('material_gate_passes')
        .select('*', { count: 'exact', head: true })
        .in('status', ['pending_pm_approval', 'pending_safety_approval'])
        .is('deleted_at', null);

      return {
        ...(baseCounts as unknown as QuickActionCounts),
        pending_workers: workersCount || 0,
        pending_gate_passes: gatePassCount || 0,
      };
    },
    enabled: !!profile?.tenant_id,
    staleTime: 30 * 1000, // 30 seconds
  });
}
