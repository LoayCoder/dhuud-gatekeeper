import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import type { Database } from '@/integrations/supabase/types';
import type { IncidentFormData } from './types';

export function useCreateIncident() {
    const { profile, user } = useAuth();
    const { toast } = useToast();
    const { t } = useTranslation();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: IncidentFormData) => {
            const { createIncident } = await import('@/features/incidents/services/incidentMutationService');
            return createIncident(data);
        },
        onSuccess: (incident) => {
            queryClient.invalidateQueries({ queryKey: ['incidents'] });

            supabase.functions.invoke('dispatch-incident-notification', {
                body: { incident_id: incident.id, event_type: 'incident_created' }
            }).catch(err => console.warn('Failed to dispatch incident notification:', err));
        },
        onError: (error) => {
            const errorMsg = error.message?.toLowerCase() || '';
            const isDuplicateRef = errorMsg.includes('duplicate key') &&
                (errorMsg.includes('reference_id') ||
                    errorMsg.includes('tenant_reference_id'));

            if (isDuplicateRef) {
                toast({
                    title: t('incidents.submissionConflict', 'Submission Conflict'),
                    description: t('incidents.submissionConflictRetry', 'A timing issue occurred. Please try submitting again.'),
                    variant: 'default',
                });
            } else {
                toast({
                    title: t('common.error'),
                    description: error.message,
                    variant: 'destructive',
                });
            }
        },
    });
}

export function useUpdateMyActionStatus() {
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
            const { updateMyActionStatus } = await import('@/features/incidents/services/incidentQueryService');
            return updateMyActionStatus({
                id,
                status,
                progressNotes,
                completionNotes,
                overdueJustification
            });
        },
        onMutate: async ({ id, status }) => {
            await queryClient.cancelQueries({ queryKey: ['my-corrective-actions', user?.id] });

            const previousActions = queryClient.getQueryData(['my-corrective-actions', user?.id]);

            queryClient.setQueryData(['my-corrective-actions', user?.id], (old: unknown[]) =>
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
                queryClient.setQueryData(['my-corrective-actions', user?.id], context.previousActions);
            }
            toast({
                title: t('common.error'),
                description: error.message,
                variant: 'destructive',
            });
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['my-corrective-actions'] });
            queryClient.invalidateQueries({ queryKey: ['corrective-actions'] });
            queryClient.invalidateQueries({ queryKey: ['pending-action-approvals'] });
        },
        onSuccess: () => {
            toast({
                title: t('common.success'),
                description: t('investigation.actionStatusUpdated'),
            });
        },
    });
}

export function useUpdateIncidentStatus() {
    const { toast } = useToast();
    const { t } = useTranslation();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, status }: { id: string; status: Database['public']['Enums']['incident_status'] }) => {
            const { updateIncidentStatus } = await import('@/features/incidents/services/incidentQueryService');
            const result = await updateIncidentStatus({ id, status });
            return result;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['incidents'] });
            queryClient.invalidateQueries({ queryKey: ['incident'] });
            toast({
                title: t('common.success'),
                description: t('incidents.statusUpdated'),
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

export function useDeleteIncident() {
    const { toast } = useToast();
    const { t } = useTranslation();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            const { softDeleteIncident } = await import('@/features/incidents/services/incidentQueryService');
            const result = await softDeleteIncident(id);
            return result;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['incidents'] });
            toast({
                title: t('common.success'),
                description: t('incidents.deleteSuccess'),
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
