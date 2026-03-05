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
  violation_id?: string;
}

// Helper to parse RPC response
function parseRpcResponse(data: Json): RpcResponse {
  if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
    return data as unknown as RpcResponse;
  }
  return { success: false, error: 'Invalid response' };
}

// Hook for consultant to identify violation
export function useConsultantIdentifyViolation() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({
      incidentId,
      violationType,
      description,
      recommendedFine,
    }: {
      incidentId: string;
      violationType: string;
      description: string;
      recommendedFine?: number;
    }) => {
      const { data, error } = await supabase.rpc('consultant_identify_violation', {
        p_incident_id: incidentId,
        p_violation_type: violationType,
        p_violation_description: description,
        p_recommended_fine: recommendedFine,
      });
      if (error) throw error;
      const result = parseRpcResponse(data);
      if (!result.success) throw new Error(result.error || 'Failed to identify violation');
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      queryClient.invalidateQueries({ queryKey: ['violations'] });
      toast.success(t('violation.identified', 'Violation identified and submitted'));
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

// Hook for site client to approve violation
export function useSiteClientApproveViolation() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({
      violationId,
      decision,
      notes,
    }: {
      violationId: string;
      decision: 'approved' | 'rejected';
      notes?: string;
    }) => {
      const { data, error } = await supabase.rpc('site_client_approve_violation', {
        p_violation_id: violationId,
        p_decision: decision,
        p_notes: notes,
      });
      if (error) throw error;
      const result = parseRpcResponse(data);
      if (!result.success) throw new Error(result.error || 'Failed to process violation');
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['violations'] });
      const message = variables.decision === 'approved'
        ? t('violation.approvedForController', 'Violation approved for Contract Controller review')
        : t('violation.dropped', 'Violation dropped');
      toast.success(message);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

// Hook for controller to approve violation
export function useControllerApproveViolation() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({
      violationId,
      decision,
      notes,
    }: {
      violationId: string;
      decision: 'approved' | 'rejected';
      notes?: string;
    }) => {
      const { data, error } = await supabase.rpc('controller_approve_violation', {
        p_violation_id: violationId,
        p_decision: decision,
        p_notes: notes,
      });
      if (error) throw error;
      const result = parseRpcResponse(data);
      if (!result.success) throw new Error(result.error || 'Failed to process violation');
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['violations'] });
      const message = variables.decision === 'approved'
        ? t('violation.sentForAcknowledgement', 'Violation sent to contractor for acknowledgement')
        : t('violation.dropped', 'Violation dropped');
      toast.success(message);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

// Hook for contractor to acknowledge/dispute violation
export function useContractorAcknowledgeViolation() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({
      violationId,
      acknowledged,
      disputeReason,
      disputeEvidence,
    }: {
      violationId: string;
      acknowledged: boolean;
      disputeReason?: string;
      disputeEvidence?: Json[];
    }) => {
      const { data, error } = await supabase.rpc('contractor_acknowledge_violation', {
        p_violation_id: violationId,
        p_acknowledged: acknowledged,
        p_dispute_reason: disputeReason,
        p_dispute_evidence: disputeEvidence || [],
      });
      if (error) throw error;
      const result = parseRpcResponse(data);
      if (!result.success) throw new Error(result.error || 'Failed to process acknowledgement');
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['violations'] });
      const message = variables.acknowledged
        ? t('violation.acknowledged', 'Violation acknowledged')
        : t('violation.disputed', 'Dispute submitted for review');
      toast.success(message);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

// Hook for controller to review dispute
export function useControllerReviewDispute() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({
      violationId,
      decision,
      notes,
    }: {
      violationId: string;
      decision: 'upheld' | 'dropped';
      notes?: string;
    }) => {
      const { data, error } = await supabase.rpc('controller_review_dispute', {
        p_violation_id: violationId,
        p_decision: decision,
        p_notes: notes,
      });
      if (error) throw error;
      const result = parseRpcResponse(data);
      if (!result.success) throw new Error(result.error || 'Failed to review dispute');
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['violations'] });
      const message = variables.decision === 'upheld'
        ? t('violation.disputeRejected', 'Dispute rejected - violation upheld')
        : t('violation.disputeAccepted', 'Dispute accepted - violation dropped');
      toast.success(message);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

// Hook for HSSE expert review
export function useHSSEExpertReview() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({
      incidentId,
      decision,
      notes,
    }: {
      incidentId: string;
      decision: 'approved' | 'rejected';
      notes?: string;
    }) => {
      const { data, error } = await supabase.rpc('hsse_expert_review_observation', {
        p_incident_id: incidentId,
        p_decision: decision,
        p_notes: notes,
      });
      if (error) throw error;
      const result = parseRpcResponse(data);
      if (!result.success) throw new Error(result.error || 'Failed to complete review');
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      toast.success(t('observation.hsseReviewed', 'HSSE Expert review completed'));
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}
