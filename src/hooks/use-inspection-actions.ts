import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

export interface InspectionAction {
  id: string;
  reference_id: string | null;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  assigned_to: string | null;
  session_id: string | null;
  source_finding_id: string | null;
  verified_by: string | null;
  verified_at: string | null;
  verification_notes: string | null;
  created_at: string;
  // Joined data
  assigned_user?: { full_name: string } | null;
  finding?: { 
    reference_id: string; 
    classification: string;
    description: string | null;
  } | null;
  session?: {
    reference_id: string;
    name: string | null;
  } | null;
}

export function useSessionActions(sessionId: string | undefined) {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['session-actions', sessionId],
    queryFn: async () => {
      if (!sessionId || !profile?.tenant_id) return [];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from('corrective_actions') as any)
        .select(`
          id, reference_id, title, description, status, priority, due_date, 
          assigned_to, session_id, source_finding_id,
          verified_by, verified_at, verification_notes, created_at,
          assigned_user:profiles!corrective_actions_assigned_to_fkey(full_name)
        `)
        .eq('session_id', sessionId)
        .eq('tenant_id', profile.tenant_id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as InspectionAction[];
    },
    enabled: !!sessionId && !!profile?.tenant_id,
  });
}

export function useMyInspectionActions() {
  const { user, profile } = useAuth();

  return useQuery({
    queryKey: ['my-inspection-actions', user?.id],
    queryFn: async () => {
      if (!user?.id || !profile?.tenant_id) return [];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from('corrective_actions') as any)
        .select(`
          id, reference_id, title, description, status, priority, due_date, 
          assigned_to, session_id, source_finding_id,
          verified_by, verified_at, verification_notes, created_at
        `)
        .eq('assigned_to', user.id)
        .eq('tenant_id', profile.tenant_id)
        .not('session_id', 'is', null)
        .is('deleted_at', null)
        .order('due_date', { ascending: true, nullsFirst: false });

      if (error) throw error;
      return data as InspectionAction[];
    },
    enabled: !!user?.id && !!profile?.tenant_id,
  });
}

export function useCreateActionFromFinding() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (input: {
      findingId: string;
      sessionId: string;
      title: string;
      description?: string;
      priority?: string;
      due_date?: string;
      assigned_to?: string;
      responsible_department_id?: string;
      action_type?: string;
      category?: string;
    }) => {
      if (!profile?.tenant_id) throw new Error('No tenant');

      // Create the corrective action
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: action, error: actionError } = await (supabase.from('corrective_actions') as any)
        .insert({
          tenant_id: profile.tenant_id,
          title: input.title,
          description: input.description,
          priority: input.priority || 'medium',
          due_date: input.due_date,
          assigned_to: input.assigned_to,
          responsible_department_id: input.responsible_department_id,
          action_type: input.action_type || 'corrective',
          category: input.category || 'administrative',
          session_id: input.sessionId,
          source_finding_id: input.findingId,
          source_type: 'inspection',
          status: 'assigned',
        })
        .select()
        .single();

      if (actionError) throw actionError;

      // Link the action to the finding
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: linkError } = await (supabase.from('area_inspection_findings') as any)
        .update({ 
          corrective_action_id: action.id,
          status: 'action_assigned'
        })
        .eq('id', input.findingId);

      if (linkError) throw linkError;

      return action;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session-actions'] });
      queryClient.invalidateQueries({ queryKey: ['area-findings'] });
      queryClient.invalidateQueries({ queryKey: ['session-closure-status'] });
      toast({ title: t('actions.createdSuccess') });
    },
    onError: () => {
      toast({ title: t('common.error'), variant: 'destructive' });
    },
  });
}

export function useVerifyAction() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (input: {
      actionId: string;
      verification_notes?: string;
      approved: boolean;
    }) => {
      if (!user?.id) throw new Error('No user');

      const updateData = input.approved 
        ? {
            status: 'verified',
            verified_by: user.id,
            verified_at: new Date().toISOString(),
            verification_notes: input.verification_notes,
          }
        : {
            status: 'rejected',
            rejected_by: user.id,
            rejected_at: new Date().toISOString(),
            rejection_notes: input.verification_notes,
          };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('corrective_actions') as any)
        .update(updateData)
        .eq('id', input.actionId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['session-actions'] });
      queryClient.invalidateQueries({ queryKey: ['my-inspection-actions'] });
      queryClient.invalidateQueries({ queryKey: ['area-findings'] });
      queryClient.invalidateQueries({ queryKey: ['session-closure-status'] });
      
      const message = variables.approved 
        ? t('actions.verifiedSuccess') 
        : t('actions.rejectedSuccess');
      toast({ title: message });
    },
    onError: () => {
      toast({ title: t('common.error'), variant: 'destructive' });
    },
  });
}

export function useUpdateActionStatus() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (input: { actionId: string; status: string }) => {
      const updateData: Record<string, unknown> = { status: input.status };
      
      if (input.status === 'completed') {
        updateData.completed_date = new Date().toISOString().split('T')[0];
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('corrective_actions') as any)
        .update(updateData)
        .eq('id', input.actionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session-actions'] });
      queryClient.invalidateQueries({ queryKey: ['my-inspection-actions'] });
      toast({ title: t('actions.statusUpdated') });
    },
    onError: () => {
      toast({ title: t('common.error'), variant: 'destructive' });
    },
  });
}
