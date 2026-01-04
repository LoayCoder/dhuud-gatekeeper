import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

// Types
export interface ViolationDetails {
  occurrence: number;
  occurrence_label: string;
  action_type: string | null;
  fine_amount: number | null;
  action_description: string | null;
  is_fine_only: boolean;
  violation_type: {
    id: string;
    name: string;
    name_ar: string | null;
    severity_level: string;
    category: string | null;
  };
}

export type DeptManagerViolationDecision = 'approved' | 'rejected';
export type ContractControllerDecision = 'approved' | 'rejected';
export type ContractorSiteRepDecision = 'acknowledged' | 'rejected';
export type HSSEViolationDecision = 'enforce' | 'modify' | 'cancel';

// Hook to get violation details with occurrence
export function useViolationDetailsWithOccurrence(incidentId: string | null, violationTypeId: string | null) {
  return useQuery({
    queryKey: ['violation-details-occurrence', incidentId, violationTypeId],
    queryFn: async () => {
      if (!incidentId || !violationTypeId) return null;
      
      const { data, error } = await supabase.rpc('get_violation_details_with_occurrence', {
        p_incident_id: incidentId,
        p_violation_type_id: violationTypeId,
      });
      
      if (error) throw error;
      const result = data as unknown as ViolationDetails & { error?: string };
      if (result?.error) throw new Error(result.error);
      
      return result as ViolationDetails;
    },
    enabled: !!incidentId && !!violationTypeId,
  });
}

// Hook to submit contractor violation (Dept Rep)
export function useSubmitContractorViolation() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async ({ incidentId, violationTypeId }: { incidentId: string; violationTypeId: string }) => {
      if (!user?.id) throw new Error('User not authenticated');
      
      const { data, error } = await supabase.rpc('submit_contractor_violation', {
        p_incident_id: incidentId,
        p_violation_type_id: violationTypeId,
        p_user_id: user.id,
      });
      
      if (error) throw error;
      const result = data as unknown as { success?: boolean; error?: string };
      if (result?.error) throw new Error(result.error);
      
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      queryClient.invalidateQueries({ queryKey: ['incident'] });
      toast.success(t('workflow.violation.submitted', 'Contractor violation submitted for approval'));
    },
    onError: (error) => {
      console.error('Error submitting contractor violation:', error);
      toast.error(error.message || t('common.error'));
    },
  });
}

// Hook to check if user can approve violation at current stage
export function useCanApproveViolation(incidentId: string | null) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['can-approve-violation', incidentId, user?.id],
    queryFn: async () => {
      if (!incidentId || !user?.id) return { can_approve: false };
      
      const { data, error } = await supabase.rpc('can_approve_violation', {
        p_incident_id: incidentId,
        p_user_id: user.id,
      });
      
      if (error) return { can_approve: false };
      return data as { can_approve: boolean; stage?: string; reason?: string };
    },
    enabled: !!incidentId && !!user?.id,
  });
}

// Hook for Department Manager Violation Approval
export function useDeptManagerViolationApproval() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async ({ 
      incidentId, 
      decision, 
      notes 
    }: { 
      incidentId: string; 
      decision: DeptManagerViolationDecision; 
      notes?: string;
    }) => {
      if (!user?.id) throw new Error('User not authenticated');
      
      const { data, error } = await supabase.rpc('dept_manager_approve_violation', {
        p_incident_id: incidentId,
        p_user_id: user.id,
        p_decision: decision,
        p_notes: notes || null,
      });
      
      if (error) throw error;
      const result = data as unknown as { success?: boolean; error?: string };
      if (result?.error) throw new Error(result.error);
      
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      queryClient.invalidateQueries({ queryKey: ['incident'] });
      
      if (variables.decision === 'approved') {
        toast.success(t('workflow.violation.deptManagerApproved', 'Violation approved and routed to next approver'));
      } else {
        toast.success(t('workflow.violation.deptManagerRejected', 'Violation rejection sent to HSSE for review'));
      }
    },
    onError: (error) => {
      console.error('Error in dept manager violation approval:', error);
      toast.error(error.message || t('common.error'));
    },
  });
}

// Hook for Contract Controller Approval
export function useContractControllerApproval() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async ({ 
      incidentId, 
      decision, 
      notes 
    }: { 
      incidentId: string; 
      decision: ContractControllerDecision; 
      notes?: string;
    }) => {
      if (!user?.id) throw new Error('User not authenticated');
      
      const { data, error } = await supabase.rpc('contract_controller_approve_violation', {
        p_incident_id: incidentId,
        p_user_id: user.id,
        p_decision: decision,
        p_notes: notes || null,
      });
      
      if (error) throw error;
      const result = data as unknown as { success?: boolean; error?: string };
      if (result?.error) throw new Error(result.error);
      
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      queryClient.invalidateQueries({ queryKey: ['incident'] });
      
      if (variables.decision === 'approved') {
        toast.success(t('workflow.violation.fineApproved', 'Fine approved and violation finalized'));
      } else {
        toast.success(t('workflow.violation.fineRejected', 'Fine rejection sent to HSSE for review'));
      }
    },
    onError: (error) => {
      console.error('Error in contract controller approval:', error);
      toast.error(error.message || t('common.error'));
    },
  });
}

// Hook for Contractor Site Rep Acknowledgment
export function useContractorSiteRepAcknowledge() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async ({ 
      incidentId, 
      decision, 
      notes 
    }: { 
      incidentId: string; 
      decision: ContractorSiteRepDecision; 
      notes?: string;
    }) => {
      if (!user?.id) throw new Error('User not authenticated');
      
      const { data, error } = await supabase.rpc('contractor_site_rep_acknowledge_violation', {
        p_incident_id: incidentId,
        p_user_id: user.id,
        p_decision: decision,
        p_notes: notes || null,
      });
      
      if (error) throw error;
      const result = data as unknown as { success?: boolean; error?: string };
      if (result?.error) throw new Error(result.error);
      
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      queryClient.invalidateQueries({ queryKey: ['incident'] });
      
      if (variables.decision === 'acknowledged') {
        toast.success(t('workflow.violation.acknowledged', 'Violation acknowledged and finalized'));
      } else {
        toast.success(t('workflow.violation.contestSent', 'Contest sent to HSSE for review'));
      }
    },
    onError: (error) => {
      console.error('Error in contractor site rep acknowledgment:', error);
      toast.error(error.message || t('common.error'));
    },
  });
}

// Hook for HSSE Violation Review (Final Authority)
export function useHSSEViolationReview() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async ({ 
      incidentId, 
      decision, 
      notes,
      modifiedViolationTypeId,
    }: { 
      incidentId: string; 
      decision: HSSEViolationDecision; 
      notes?: string;
      modifiedViolationTypeId?: string;
    }) => {
      if (!user?.id) throw new Error('User not authenticated');
      
      const { data, error } = await supabase.rpc('hsse_review_violation', {
        p_incident_id: incidentId,
        p_user_id: user.id,
        p_decision: decision,
        p_notes: notes || null,
        p_modified_violation_type_id: modifiedViolationTypeId || null,
      });
      
      if (error) throw error;
      const result = data as unknown as { success?: boolean; error?: string };
      if (result?.error) throw new Error(result.error);
      
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      queryClient.invalidateQueries({ queryKey: ['incident'] });
      
      switch (variables.decision) {
        case 'enforce':
          toast.success(t('workflow.violation.enforced', 'Violation enforced'));
          break;
        case 'modify':
          toast.success(t('workflow.violation.modified', 'Violation modified and enforced'));
          break;
        case 'cancel':
          toast.success(t('workflow.violation.cancelled', 'Violation cancelled'));
          break;
      }
    },
    onError: (error) => {
      console.error('Error in HSSE violation review:', error);
      toast.error(error.message || t('common.error'));
    },
  });
}
