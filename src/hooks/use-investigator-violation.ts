import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

interface IdentifyViolationParams {
  investigationId: string;
  violationTypeId: string;
  rootCauseSummary: string;
  contractorContributionPercentage: number;
  evidenceSummary?: string;
}

interface SubmitViolationParams {
  investigationId: string;
  evidenceSummary: string;
}

interface ViolationType {
  id: string;
  name: string;
  name_ar: string | null;
  severity_level: string | null;
  first_fine_amount: number | null;
  second_fine_amount: number | null;
  third_fine_amount: number | null;
}

// Hook to fetch violation types for selection
export function useViolationTypesForIncident() {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['violation-types-for-incident', profile?.tenant_id],
    queryFn: async (): Promise<ViolationType[]> => {
      if (!profile?.tenant_id) return [];

      const { data, error } = await supabase
        .from('violation_types')
        .select('id, name, name_ar, severity_level, first_fine_amount, second_fine_amount, third_fine_amount')
        .eq('tenant_id', profile.tenant_id)
        .eq('is_active', true)
        .is('deleted_at', null)
        .order('name');

      if (error) throw error;
      return data || [];
    },
    enabled: !!profile?.tenant_id,
  });
}

// Hook for investigator to identify contractor violation during investigation
export function useIdentifyContractorViolation() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: IdentifyViolationParams) => {
      const { data, error } = await supabase.rpc('investigator_identify_contractor_violation', {
        p_investigation_id: params.investigationId,
        p_violation_type_id: params.violationTypeId,
        p_root_cause_summary: params.rootCauseSummary,
        p_contractor_contribution_percentage: params.contractorContributionPercentage,
        p_evidence_summary: params.evidenceSummary || null,
      });

      if (error) throw error;
      
      const result = data as { success: boolean; error?: string; lifecycle_id?: string; occurrence?: number };
      if (!result.success) {
        throw new Error(result.error || 'Failed to identify violation');
      }

      return result;
    },
    onSuccess: (data) => {
      toast.success(t('investigation.violation.identifiedSuccess', 'Contractor violation identified successfully'));
      queryClient.invalidateQueries({ queryKey: ['investigation'] });
      queryClient.invalidateQueries({ queryKey: ['incident'] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// Hook for investigator to submit identified violation for approval workflow
export function useSubmitContractorViolation() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: SubmitViolationParams) => {
      const { data, error } = await supabase.rpc('investigator_submit_contractor_violation', {
        p_investigation_id: params.investigationId,
        p_evidence_summary: params.evidenceSummary,
      });

      if (error) throw error;
      
      const result = data as { success: boolean; error?: string; lifecycle_id?: string; new_status?: string };
      if (!result.success) {
        throw new Error(result.error || 'Failed to submit violation');
      }

      return result;
    },
    onSuccess: (data) => {
      toast.success(t('investigation.violation.submittedSuccess', 'Violation submitted for approval'));
      queryClient.invalidateQueries({ queryKey: ['investigation'] });
      queryClient.invalidateQueries({ queryKey: ['incident'] });
      queryClient.invalidateQueries({ queryKey: ['pending-approvals'] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// Hook to check if current user is the assigned investigator
export function useIsAssignedInvestigator(investigatorId: string | null | undefined) {
  const { user } = useAuth();
  return investigatorId === user?.id;
}
