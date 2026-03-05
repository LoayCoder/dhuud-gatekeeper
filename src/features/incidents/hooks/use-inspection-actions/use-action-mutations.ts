import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

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

            const { data: action, error: actionError } = await supabase.from('corrective_actions')
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

            const { error: linkError } = await supabase.from('area_inspection_findings')
                .update({
                    corrective_action_id: action.id,
                    status: 'action_assigned'
                })
                .eq('id', input.findingId);

            if (linkError) throw linkError;

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
                    status: 'closed',
                    verified_by: user.id,
                    verified_at: new Date().toISOString(),
                    verification_notes: input.verification_notes,
                }
                : {
                    status: 'returned_for_correction',
                    rejected_by: user.id,
                    rejected_at: new Date().toISOString(),
                    rejection_notes: input.verification_notes,
                    last_returned_at: new Date().toISOString(),
                    last_return_reason: input.verification_notes,
                };

            const { error } = await supabase.from('corrective_actions')
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

            const { error } = await supabase.from('corrective_actions')
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

// Enhanced hook for updating inspection action status with workflow features (matching incident actions)
export function useUpdateInspectionActionStatus() {
    const { toast } = useToast();
    const { t } = useTranslation();
    const { user } = useAuth();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            id,
            status,
            progressNotes,
            completionNotes,
            overdueJustification,
        }: {
            id: string;
            status: string;
            progressNotes?: string;
            completionNotes?: string;
            overdueJustification?: string;
        }) => {
            const updateData: Record<string, unknown> = { status };

            if (status === 'in_progress') {
                updateData.started_at = new Date().toISOString();
                if (progressNotes) {
                    updateData.progress_notes = progressNotes;
                }
            }

            if (status === 'completed') {
                updateData.completed_date = new Date().toISOString().split('T')[0];
                if (completionNotes) {
                    updateData.completion_notes = completionNotes;
                }
                if (overdueJustification) {
                    updateData.overdue_justification = overdueJustification;
                }
            }

            const { error } = await supabase.from('corrective_actions')
                .update(updateData)
                .eq('id', id);

            if (error) throw error;
            return { id, status };
        },
        // Optimistic update
        onMutate: async ({ id, status }) => {
            await queryClient.cancelQueries({ queryKey: ['my-inspection-actions', user?.id] });
            const previousActions = queryClient.getQueryData(['my-inspection-actions', user?.id]);
            queryClient.setQueryData(['my-inspection-actions', user?.id], (old: unknown[]) =>
                old?.map((action: Record<string, unknown>) =>
                    action.id === id
                        ? {
                            ...action,
                            status,
                            ...(status === 'in_progress' ? { started_at: new Date().toISOString() } : {}),
                            ...(status === 'completed' ? { completed_date: new Date().toISOString().split('T')[0] } : {}),
                        }
                        : action
                )
            );
            return { previousActions };
        },
        onError: (error, _variables, context) => {
            if (context?.previousActions) {
                queryClient.setQueryData(['my-inspection-actions', user?.id], context.previousActions);
            }
            toast({
                title: t('common.error'),
                description: (error as Error).message,
                variant: 'destructive',
            });
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['my-inspection-actions'] });
            queryClient.invalidateQueries({ queryKey: ['session-actions'] });
            queryClient.invalidateQueries({ queryKey: ['area-findings'] });
        },
        onSuccess: () => {
            toast({
                title: t('common.success'),
                description: t('actions.statusUpdated'),
            });
        },
    });
}
