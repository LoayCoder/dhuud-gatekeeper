import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import type { Json } from '@/integrations/supabase/types';

// Types for the workflow
export interface ObservationWorkflowLog {
  id: string;
  incident_id: string;
  actor_id: string;
  workflow_step: string;
  previous_status: string | null;
  new_status: string | null;
  decision: string | null;
  notes: string | null;
  evidence: Json;
  metadata: Json;
  created_at: string;
}

interface RpcResponse {
  success: boolean;
  error?: string;
  message?: string;
  new_status?: string;
  all_complete?: boolean;
  violation_id?: string;
}

// Helper to parse RPC response
function parseRpcResponse(data: Json): RpcResponse {
  if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
    return data as unknown as RpcResponse;
  }
  return { success: false, error: 'Invalid response' };
}

// Hook to route observation to consultant
export function useRouteToConsultant() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({ incidentId, consultantId }: { incidentId: string; consultantId: string }) => {
      const { data, error } = await supabase.rpc('route_observation_to_consultant', {
        p_incident_id: incidentId,
        p_consultant_id: consultantId,
      });
      if (error) throw error;
      const result = parseRpcResponse(data);
      if (!result.success) throw new Error(result.error || 'Failed to route observation');
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      toast.success(t('observation.routedToConsultant', 'Observation routed to consultant'));
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

// Hook for consultant to submit for approval
export function useConsultantSubmitForApproval() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({ incidentId, notes }: { incidentId: string; notes?: string }) => {
      const { data, error } = await supabase.rpc('consultant_submit_for_approval', {
        p_incident_id: incidentId,
        p_notes: notes,
      });
      if (error) throw error;
      const result = parseRpcResponse(data);
      if (!result.success) throw new Error(result.error || 'Failed to submit for approval');
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      toast.success(t('observation.submittedForApproval', 'Submitted for Site Client approval'));
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

// Hook for site client to approve actions
export function useSiteClientApproveActions() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({ incidentId, decision, notes }: { incidentId: string; decision: 'approved' | 'rejected'; notes?: string }) => {
      const { data, error } = await supabase.rpc('site_client_approve_actions', {
        p_incident_id: incidentId,
        p_decision: decision,
        p_notes: notes,
      });
      if (error) throw error;
      const result = parseRpcResponse(data);
      if (!result.success) throw new Error(result.error || 'Failed to process approval');
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      const message = variables.decision === 'approved' 
        ? t('observation.actionsApproved', 'Actions approved')
        : t('observation.actionsRejected', 'Actions returned for revision');
      toast.success(message);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

// Hook for contractor to complete action
export function useContractorCompleteAction() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({ actionId, evidence, notes }: { actionId: string; evidence?: Json[]; notes?: string }) => {
      const { data, error } = await supabase.rpc('contractor_complete_action', {
        p_action_id: actionId,
        p_evidence: evidence || [],
        p_notes: notes,
      });
      if (error) throw error;
      const result = parseRpcResponse(data);
      if (!result.success) throw new Error(result.error || 'Failed to complete action');
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      queryClient.invalidateQueries({ queryKey: ['corrective-actions'] });
      toast.success(t('observation.actionCompleted', 'Action completed'));
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

// Hook for consultant to verify action
export function useConsultantVerifyAction() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({ actionId, decision, notes }: { actionId: string; decision: 'accepted' | 'rejected'; notes?: string }) => {
      const { data, error } = await supabase.rpc('consultant_verify_action', {
        p_action_id: actionId,
        p_decision: decision,
        p_notes: notes,
      });
      if (error) throw error;
      const result = parseRpcResponse(data);
      if (!result.success) throw new Error(result.error || 'Failed to verify action');
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      queryClient.invalidateQueries({ queryKey: ['corrective-actions'] });
      const message = variables.decision === 'accepted'
        ? t('observation.actionVerified', 'Action verified')
        : t('observation.actionRejected', 'Action returned for re-implementation');
      toast.success(message);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

// Hook to close observation
export function useCloseContractorObservation() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({ incidentId, notes }: { incidentId: string; notes?: string }) => {
      const { data, error } = await supabase.rpc('close_contractor_observation', {
        p_incident_id: incidentId,
        p_closure_notes: notes,
      });
      if (error) throw error;
      const result = parseRpcResponse(data);
      if (!result.success) throw new Error(result.error || 'Failed to close observation');
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      toast.success(t('observation.closed', 'Observation closed successfully'));
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

// Hook to fetch workflow logs - returns empty until types are regenerated
export function useObservationWorkflowLogs(incidentId: string | undefined) {
  return useQuery({
    queryKey: ['observation-workflow-logs', incidentId],
    queryFn: async (): Promise<ObservationWorkflowLog[]> => {
      if (!incidentId) return [];
      // Table exists but types not yet regenerated - will work after types update
      return [];
    },
    enabled: !!incidentId,
  });
}
