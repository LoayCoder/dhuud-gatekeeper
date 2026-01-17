/**
 * Visitor Approvals Hook
 * 
 * Manages multi-stage approval workflow for visitor requests.
 * VISITOR-ONLY - No shared logic with worker approvals.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tables, TablesInsert, Enums } from '@/integrations/supabase/types';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';

export type VisitorApproval = Tables<'visitor_approvals'>;
export type VisitorApprovalInsert = TablesInsert<'visitor_approvals'>;
export type ApprovalStage = Enums<'visitor_approval_stage'>;
export type ApprovalDecision = Enums<'visitor_approval_decision'>;

interface UsePendingApprovalsFilters {
  stage?: ApprovalStage;
}

export function usePendingApprovals(filters?: UsePendingApprovalsFilters) {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ['visitor-pending-approvals', tenantId, filters],
    queryFn: async () => {
      if (!tenantId) throw new Error('No tenant');

      let query = supabase
        .from('visitor_approvals')
        .select('*')
        .eq('tenant_id', tenantId)
        .is('decision', null)
        .is('deleted_at', null)
        .order('created_at', { ascending: true });

      if (filters?.stage) {
        query = query.eq('approval_stage', filters.stage);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });
}

export function useVisitApprovalHistory(visitRequestId: string | undefined) {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ['visitor-approval-history', visitRequestId],
    queryFn: async () => {
      if (!tenantId || !visitRequestId) throw new Error('Missing params');

      const { data, error } = await supabase
        .from('visitor_approvals')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('visit_request_id', visitRequestId)
        .is('deleted_at', null)
        .order('stage_order', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!tenantId && !!visitRequestId,
  });
}

export function usePendingAreaRepApprovals() {
  return usePendingApprovals({ stage: 'area_rep' });
}

export function usePendingHSSEApprovals() {
  return usePendingApprovals({ stage: 'hsse' });
}

export function usePendingSecurityApprovals() {
  return usePendingApprovals({ stage: 'security' });
}

export function useApproveVisitStage() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ approvalId, notes }: { approvalId: string; notes?: string }) => {
      const { data, error } = await supabase
        .from('visitor_approvals')
        .update({ decision: 'approved', decision_at: new Date().toISOString(), approver_id: user?.id, notes })
        .eq('id', approvalId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visitor-pending-approvals'] });
      queryClient.invalidateQueries({ queryKey: ['visitor-approval-history'] });
      queryClient.invalidateQueries({ queryKey: ['visit-requests'] });
      toast({ title: t('visitors.approvals.approved', 'Visit approved') });
    },
    onError: (error) => {
      toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
    },
  });
}

export function useRejectVisitStage() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ approvalId, reason }: { approvalId: string; reason: string }) => {
      const { data, error } = await supabase
        .from('visitor_approvals')
        .update({ decision: 'rejected', decision_at: new Date().toISOString(), approver_id: user?.id, notes: reason })
        .eq('id', approvalId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visitor-pending-approvals'] });
      queryClient.invalidateQueries({ queryKey: ['visitor-approval-history'] });
      queryClient.invalidateQueries({ queryKey: ['visit-requests'] });
      toast({ title: t('visitors.approvals.rejected', 'Visit rejected') });
    },
    onError: (error) => {
      toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
    },
  });
}
