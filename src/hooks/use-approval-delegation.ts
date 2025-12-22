import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

export interface ApprovalDelegation {
  id: string;
  tenant_id: string;
  delegator_id: string;
  delegate_id: string;
  approval_types: string[];
  start_date: string;
  end_date: string;
  reason: string | null;
  is_active: boolean;
  created_at: string;
  created_by: string | null;
  revoked_at: string | null;
  revoked_by: string | null;
}

interface DelegationWithProfiles extends ApprovalDelegation {
  delegator?: { full_name: string };
  delegate?: { full_name: string };
}

export function useApprovalDelegations() {
  const { user, profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ['approval-delegations', tenantId, user?.id],
    queryFn: async () => {
      if (!tenantId || !user?.id) throw new Error('No tenant or user');

      const { data, error } = await supabase
        .from('approval_delegations')
        .select('*')
        .eq('tenant_id', tenantId)
        .or(`delegator_id.eq.${user.id},delegate_id.eq.${user.id}`)
        .is('revoked_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ApprovalDelegation[];
    },
    enabled: !!tenantId && !!user?.id,
  });
}

export function useActiveDelegations() {
  const { user, profile } = useAuth();
  const tenantId = profile?.tenant_id;
  const today = new Date().toISOString().split('T')[0];

  return useQuery({
    queryKey: ['active-delegations', tenantId, user?.id, today],
    queryFn: async () => {
      if (!tenantId || !user?.id) throw new Error('No tenant or user');

      // Get delegations where user is the delegate and delegation is active
      const { data, error } = await supabase
        .from('approval_delegations')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('delegate_id', user.id)
        .eq('is_active', true)
        .is('revoked_at', null)
        .lte('start_date', today)
        .gte('end_date', today);

      if (error) throw error;
      return data as ApprovalDelegation[];
    },
    enabled: !!tenantId && !!user?.id,
  });
}

export function useCreateDelegation() {
  const { t } = useTranslation();
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      delegate_id: string;
      approval_types: string[];
      start_date: string;
      end_date: string;
      reason?: string;
    }) => {
      if (!profile?.tenant_id || !user?.id) throw new Error('No tenant or user');

      const { error } = await supabase
        .from('approval_delegations')
        .insert({
          tenant_id: profile.tenant_id,
          delegator_id: user.id,
          delegate_id: data.delegate_id,
          approval_types: data.approval_types,
          start_date: data.start_date,
          end_date: data.end_date,
          reason: data.reason,
          is_active: true,
          created_by: user.id,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approval-delegations'] });
      toast({
        title: t('approvals.delegationCreated', 'Delegation Created'),
        description: t('approvals.delegationCreatedDesc', 'Your approval delegation has been set up'),
      });
    },
    onError: (error) => {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useRevokeDelegation() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (delegationId: string) => {
      if (!user?.id) throw new Error('No user');

      const { error } = await supabase
        .from('approval_delegations')
        .update({
          is_active: false,
          revoked_at: new Date().toISOString(),
          revoked_by: user.id,
        })
        .eq('id', delegationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approval-delegations'] });
      toast({
        title: t('approvals.delegationRevoked', 'Delegation Revoked'),
      });
    },
    onError: (error) => {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export const APPROVAL_TYPES = [
  { value: 'incident', label: 'Incident Approvals', labelAr: 'موافقات الحوادث' },
  { value: 'visit_request', label: 'Visit Requests', labelAr: 'طلبات الزيارة' },
  { value: 'gate_pass', label: 'Gate Passes', labelAr: 'تصاريح البوابة' },
  { value: 'action_extension', label: 'Action Extensions', labelAr: 'تمديدات الإجراءات' },
  { value: 'worker_approval', label: 'Worker Approvals', labelAr: 'موافقات العمال' },
] as const;
