import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import type { FailedAssetSummary } from './use-session-failed-assets';

interface CreateSessionActionInput {
  sessionId: string;
  title: string;
  description?: string;
  priority?: string;
  due_date?: string;
  assigned_to?: string;
  responsible_department_id?: string;
  action_type?: string;
  category?: string;
  failedAssets: FailedAssetSummary[];
}

export function useCreateSessionAction() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (input: CreateSessionActionInput) => {
      if (!profile?.tenant_id) throw new Error('No tenant');

      // Build failure context snapshot
      const failureSnapshot = input.failedAssets.map((fa) => ({
        asset_id: fa.asset_id,
        asset_code: fa.asset_code,
        asset_name: fa.asset_name,
        location: fa.location,
        quick_result: fa.quick_result,
        failure_reason: fa.failure_reason,
        notes: fa.notes,
        failed_parts: fa.failed_parts,
      }));

      const { data: action, error: actionError } = await supabase
        .from('corrective_actions' as never)
        .insert({
          tenant_id: profile.tenant_id,
          title: input.title,
          description: input.description,
          priority: input.priority || 'medium',
          due_date: input.due_date,
          assigned_to: input.assigned_to,
          responsible_department_id: input.responsible_department_id,
          action_type: input.action_type || 'corrective',
          category: input.category || 'operations',
          session_id: input.sessionId,
          source_type: 'inspection',
          status: 'assigned',
          failure_context_snapshot: failureSnapshot,
        } as never)
        .select()
        .single();

      if (actionError) throw actionError;

      // Send email notification if assigned
      if (input.assigned_to) {
        try {
          const { data: assignee } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('id', input.assigned_to)
            .single();

          if (assignee?.email) {
            await supabase.functions.invoke('send-action-email', {
              body: {
                type: 'action_assigned',
                recipient_email: assignee.email,
                recipient_name: assignee.full_name || 'Team Member',
                action_title: input.title,
                action_priority: input.priority || 'medium',
                action_description: input.description,
                due_date: input.due_date,
                incident_reference: null,
              },
            });
          }
        } catch (emailError) {
          console.error('Failed to send action assignment email:', emailError);
        }
      }

      return action;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session-actions'] });
      queryClient.invalidateQueries({ queryKey: ['session-closure-status'] });
      toast({ title: t('actions.createdSuccess') });
    },
    onError: () => {
      toast({ title: t('common.error'), variant: 'destructive' });
    },
  });
}
