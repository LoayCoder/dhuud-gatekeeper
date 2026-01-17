/**
 * Hook to get the count of corrective actions for an incident
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useActionsCount(incidentId: string | null) {
  return useQuery({
    queryKey: ['actions-count', incidentId],
    queryFn: async () => {
      if (!incidentId) return 0;
      
      const { count, error } = await supabase
        .from('corrective_actions')
        .select('*', { count: 'exact', head: true })
        .eq('incident_id', incidentId)
        .is('deleted_at', null);
      
      if (error) {
        console.error('[useActionsCount] Error:', error);
        return 0;
      }
      
      return count ?? 0;
    },
    enabled: !!incidentId,
    staleTime: 10000, // 10 seconds
  });
}
