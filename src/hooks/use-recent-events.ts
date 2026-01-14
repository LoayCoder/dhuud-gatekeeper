import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useBranchFilter } from "@/hooks/use-branch-filter";

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
  branch_id?: string | null;
}

export function useRecentEvents(limit: number = 10) {
  const { profile } = useAuth();
  const { branchIds, isAllBranchesMode, queryKey: branchQueryKey } = useBranchFilter();

  return useQuery({
    queryKey: ['recent-hsse-events', profile?.tenant_id, ...branchQueryKey, limit],
    queryFn: async () => {
      // Query incidents directly with branch filter
      let query = supabase
        .from('incidents')
        .select('id, reference_id, description, event_type, subtype, status, severity, created_at, occurred_at, branch_id')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(limit);
      
      // Apply branch filter if not in "all branches" mode
      if (!isAllBranchesMode && branchIds && branchIds.length > 0) {
        if (branchIds.length === 1) {
          query = query.eq('branch_id', branchIds[0]);
        } else {
          query = query.in('branch_id', branchIds);
        }
      }

      const { data, error } = await query;

      if (error) throw error;
      
      // Transform to expected format
      return (data || []).map(incident => ({
        id: incident.id,
        reference_id: incident.reference_id || '',
        description_preview: incident.description?.substring(0, 100) || '',
        event_type: incident.event_type,
        subtype: incident.subtype,
        status: incident.status || '',
        severity: incident.severity,
        created_at: incident.created_at || '',
        occurred_at: incident.occurred_at,
        branch_id: incident.branch_id,
      })) as RecentEvent[];
    },
    enabled: !!profile?.tenant_id,
    staleTime: 60 * 1000, // 1 minute
  });
}
