import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRoles } from "@/hooks/use-user-roles";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

type HSSEIncidentDecision = 'approve' | 'reject' | 'request_investigation_review';

interface ValidateIncidentParams {
  incidentId: string;
  decision: HSSEIncidentDecision;
  notes?: string;
}

interface ClosurePrerequisitesResult {
  success: boolean;
  ready_for_closure: boolean;
  blocking_reasons: string[];
  checks: {
    investigation_complete: boolean;
    root_cause_documented: boolean;
    immediate_cause_documented: boolean;
    all_actions_completed: boolean;
    all_actions_verified: boolean;
    violation_finalized: boolean;
    hsse_validated: boolean;
  };
}

// Hook to check incident closure prerequisites
export function useIncidentClosurePrerequisites(incidentId: string | null) {
  return useQuery({
    queryKey: ['incident-closure-prerequisites', incidentId],
    queryFn: async (): Promise<ClosurePrerequisitesResult | null> => {
      if (!incidentId) return null;

      const { data, error } = await supabase.rpc('check_incident_closure_prerequisites', {
        p_incident_id: incidentId,
      });

      if (error) throw error;
      return data as unknown as ClosurePrerequisitesResult;
    },
    enabled: !!incidentId,
  });
}

// Hook to check if current user can validate incidents (HSSE role)
export function useCanValidateIncident() {
  const { user, isAdmin } = useAuth();
  const { hasRole } = useUserRoles();
  
  return useQuery({
    queryKey: ['can-validate-incident', user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      
      // Check if admin or has HSSE role
      if (isAdmin) return true;
      
      return hasRole('hsse_manager') || hasRole('hsse_expert') || hasRole('admin');
    },
    enabled: !!user?.id,
  });
}

// Hook for HSSE to validate incident closure
export function useHSSEValidateIncident() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: ValidateIncidentParams) => {
      const { data, error } = await supabase.rpc('hsse_validate_incident_closure', {
        p_incident_id: params.incidentId,
        p_decision: params.decision,
        p_notes: params.notes || null,
      });

      if (error) throw error;
      
      const result = data as { success: boolean; error?: string; decision?: string; new_status?: string; blocking_reasons?: string[] };
      if (!result.success) {
        throw new Error(result.error || 'Failed to validate incident');
      }

      return result;
    },
    onSuccess: (data) => {
      const decisionMessages: Record<HSSEIncidentDecision, string> = {
        'approve': t('investigation.hsseValidation.approvedSuccess', 'Incident approved for closure'),
        'reject': t('investigation.hsseValidation.rejectedSuccess', 'Incident validation rejected'),
        'request_investigation_review': t('investigation.hsseValidation.reviewRequestedSuccess', 'Investigation review requested'),
      };
      
      toast.success(decisionMessages[data.decision as HSSEIncidentDecision] || 'Validation completed');
      queryClient.invalidateQueries({ queryKey: ['investigation'] });
      queryClient.invalidateQueries({ queryKey: ['incident'] });
      queryClient.invalidateQueries({ queryKey: ['pending-approvals'] });
      queryClient.invalidateQueries({ queryKey: ['incident-closure-prerequisites'] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
