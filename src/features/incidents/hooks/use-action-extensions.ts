import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

export interface ExtensionRequest {
  id: string;
  action_id: string;
  tenant_id: string;
  requested_by: string;
  requested_at: string | null;
  current_due_date: string;
  requested_due_date: string;
  extension_reason: string;
  manager_id: string | null;
  manager_status: string | null;
  manager_decision_at: string | null;
  manager_notes: string | null;
  hsse_manager_id: string | null;
  hsse_manager_status: string | null;
  hsse_manager_decision_at: string | null;
  hsse_manager_notes: string | null;
  status: string | null;
  created_at: string | null;
  // Joined data
  requester?: { id: string; full_name: string | null } | null;
  action?: { id: string; reference_id: string | null; title: string; priority: string | null } | null;
}

// Request an extension for an action (goes directly to HSSE Expert)
export function useRequestExtension() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      actionId,
      currentDueDate,
      requestedDueDate,
      reason,
    }: {
      actionId: string;
      currentDueDate: string;
      requestedDueDate: string;
      reason: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single();

      if (!profile?.tenant_id) throw new Error('No tenant found');

      const { error } = await supabase
        .from('action_extension_requests')
        .insert({
          tenant_id: profile.tenant_id,
          action_id: actionId,
          requested_by: user.id,
          current_due_date: currentDueDate,
          requested_due_date: requestedDueDate,
          extension_reason: reason,
          status: 'pending_hsse', // Goes directly to HSSE Expert
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['extension-requests'] });
      queryClient.invalidateQueries({ queryKey: ['pending-extension-requests'] });
      queryClient.invalidateQueries({ queryKey: ['my-corrective-actions'] });
      toast({
        title: t('common.success'),
        description: t('actions.extensionRequested', 'Extension request submitted'),
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

// Get pending extension requests for HSSE Experts
export function usePendingExtensionRequests() {
  const { profile, user } = useAuth();

  return useQuery({
    queryKey: ['pending-extension-requests', 'hsse', user?.id],
    queryFn: async () => {
      if (!profile?.tenant_id || !user?.id) return [];

      const { data, error } = await supabase
        .from('action_extension_requests')
        .select(`
          *,
          requester:profiles!action_extension_requests_requested_by_fkey(id, full_name),
          action:corrective_actions!action_extension_requests_action_id_fkey(id, reference_id, title, priority)
        `)
        .eq('tenant_id', profile.tenant_id)
        .eq('status', 'pending_hsse')
        .is('deleted_at', null)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return (data || []) as ExtensionRequest[];
    },
    enabled: !!profile?.tenant_id && !!user?.id,
  });
}

// Approve or reject extension request (HSSE Expert - single level approval)
export function useApproveExtension() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      requestId,
      actionId,
      newDueDate,
      approved,
      notes,
    }: {
      requestId: string;
      actionId: string;
      newDueDate: string;
      approved: boolean;
      notes?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) throw new Error('Not authenticated');

      // Update extension request status
      const requestUpdateData = {
        hsse_manager_id: user.id,
        hsse_manager_status: approved ? 'approved' : 'rejected',
        hsse_manager_decision_at: new Date().toISOString(),
        hsse_manager_notes: notes || null,
        status: approved ? 'approved' : 'rejected',
      };

      const { error: requestError } = await supabase
        .from('action_extension_requests')
        .update(requestUpdateData)
        .eq('id', requestId);

      if (requestError) throw requestError;

      // If approved, update the action's due date
      if (approved) {
        const { error: actionError } = await supabase
          .from('corrective_actions')
          .update({ due_date: newDueDate })
          .eq('id', actionId);

        if (actionError) throw actionError;
      }

      return { approved };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['pending-extension-requests'] });
      queryClient.invalidateQueries({ queryKey: ['my-corrective-actions'] });
      queryClient.invalidateQueries({ queryKey: ['corrective-actions'] });
      queryClient.invalidateQueries({ queryKey: ['action-extension-request'] });
      toast({
        title: t('common.success'),
        description: result.approved
          ? t('actions.extensionApproved', 'Extension approved and due date updated')
          : t('actions.extensionRejected', 'Extension request rejected'),
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

// Get extension request for a specific action
export function useActionExtensionRequest(actionId: string | null) {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['action-extension-request', actionId],
    queryFn: async () => {
      if (!actionId || !profile?.tenant_id) return null;

      const { data, error } = await supabase
        .from('action_extension_requests')
        .select('*')
        .eq('action_id', actionId)
        .eq('tenant_id', profile.tenant_id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as ExtensionRequest | null;
    },
    enabled: !!actionId && !!profile?.tenant_id,
  });
}
