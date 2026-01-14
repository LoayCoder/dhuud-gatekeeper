import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useBranchFilter } from "@/hooks/use-branch-filter";

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
  const { branchIds, isAllBranchesMode, queryKey: branchQueryKey } = useBranchFilter();

  return useQuery({
    queryKey: ['dashboard-quick-action-counts', profile?.tenant_id, ...branchQueryKey],
    queryFn: async () => {
      // Get base counts from RPC
      const { data: baseCounts, error } = await supabase.rpc('get_dashboard_quick_action_counts');
      if (error) throw error;
      
      // Get contractor worker approvals count with branch filter
      let workersQuery = supabase
        .from('contractor_workers')
        .select('id', { count: 'exact', head: true })
        .eq('approval_status', 'pending')
        .is('deleted_at', null);
      
      if (!isAllBranchesMode && branchIds && branchIds.length > 0) {
        if (branchIds.length === 1) {
          workersQuery = workersQuery.eq('branch_id', branchIds[0]);
        } else {
          workersQuery = workersQuery.in('branch_id', branchIds);
        }
      }
      const { count: workersCount } = await workersQuery;
      
      // Get gate pass approvals count with branch filter
      let gatePassQuery = supabase
        .from('material_gate_passes')
        .select('id', { count: 'exact', head: true })
        .in('status', ['pending_pm_approval', 'pending_safety_approval'])
        .is('deleted_at', null);
      
      if (!isAllBranchesMode && branchIds && branchIds.length > 0) {
        if (branchIds.length === 1) {
          gatePassQuery = gatePassQuery.eq('branch_id', branchIds[0]);
        } else {
          gatePassQuery = gatePassQuery.in('branch_id', branchIds);
        }
      }
      const { count: gatePassCount } = await gatePassQuery;

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
