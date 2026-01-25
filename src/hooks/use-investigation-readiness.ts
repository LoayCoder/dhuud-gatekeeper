import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface InvestigationReadiness {
  ready: boolean;
  has_evidence: boolean;
  witnesses_approved: boolean;
  rca_locked: boolean;
}

export function useInvestigationReadiness(incidentId: string | null) {
  return useQuery({
    queryKey: ['investigation-readiness', incidentId],
    queryFn: async (): Promise<InvestigationReadiness> => {
      if (!incidentId) throw new Error('Incident ID is required');

      // Call the new RPC function
      // Note: We use 'any' for the RPC call here until types are regenerated
      const { data, error } = await supabase
        .rpc('check_investigation_readiness', { p_incident_id: incidentId });

      if (error) throw error;
      return data as unknown as InvestigationReadiness;
    },
    enabled: !!incidentId,
  });
}
