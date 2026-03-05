/**
 * Action Dispute Workflow Hooks
 * Handles contractor action disputes and consultant resolution
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import type { Json } from '@/integrations/supabase/types';

interface RpcResponse {
  success: boolean;
  error?: string;
  message?: string;
  new_status?: string;
  decision?: string;
}

// Helper to parse RPC response
function parseRpcResponse(data: Json): RpcResponse {
  if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
    return data as unknown as RpcResponse;
  }
  return { success: false, error: 'Invalid response' };
}

/**
 * Hook for contractor to submit an action dispute
 * Routes the observation back to the consultant for review
 */
export function useContractorSubmitActionDispute() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({
      actionId,
      disputeReason,
    }: {
      actionId: string;
      disputeReason: string;
    }) => {
      const { data, error } = await supabase.rpc('contractor_submit_action_dispute', {
        p_action_id: actionId,
        p_dispute_reason: disputeReason,
      });
      if (error) throw error;
      const result = parseRpcResponse(data);
      if (!result.success) throw new Error(result.error || 'Failed to submit dispute');
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      queryClient.invalidateQueries({ queryKey: ['corrective-actions'] });
      toast.success(t('workflow.actionDispute.submitted', 'Action dispute submitted for review'));
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

/**
 * Hook for consultant to resolve an action dispute
 * Can resolve, modify action, or escalate to HSSE Expert
 */
export function useConsultantResolveActionDispute() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({
      incidentId,
      decision,
      notes,
    }: {
      incidentId: string;
      decision: 'resolve' | 'modify' | 'escalate_to_hsse';
      notes?: string;
    }) => {
      const { data, error } = await supabase.rpc('consultant_resolve_action_dispute', {
        p_incident_id: incidentId,
        p_decision: decision,
        p_notes: notes,
      });
      if (error) throw error;
      const result = parseRpcResponse(data);
      if (!result.success) throw new Error(result.error || 'Failed to resolve dispute');
      return result;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      queryClient.invalidateQueries({ queryKey: ['corrective-actions'] });
      
      const messages: Record<string, string> = {
        resolve: t('workflow.actionDispute.resolved', 'Dispute resolved - actions restored'),
        modify: t('workflow.actionDispute.modified', 'Actions modified - returned to contractor'),
        escalate_to_hsse: t('workflow.actionDispute.escalated', 'Escalated to HSSE Expert for final decision'),
      };
      
      toast.success(messages[data.decision || 'resolve']);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

export type ActionDisputeDecision = 'resolve' | 'modify' | 'escalate_to_hsse';
