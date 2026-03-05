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

      // Call the RPC function - types may not include it yet
      const { data, error } = await (supabase.rpc as any)('check_investigation_readiness', { p_incident_id: incidentId });

      if (error) throw error;
      return data as unknown as InvestigationReadiness;
    },
    enabled: !!incidentId,
  });
}
