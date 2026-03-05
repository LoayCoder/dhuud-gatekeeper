import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import type { Json } from "@/integrations/supabase/types";
import type { Investigation, CorrectiveAction } from "./types";

export function useCreateInvestigation() {
    const { profile, user } = useAuth();
    const queryClient = useQueryClient();
    const { t } = useTranslation();

    return useMutation({
        mutationFn: async (incidentId: string) => {
            if (!profile?.tenant_id || !user?.id) {
                throw new Error('User not authenticated');
            }

            const { createInvestigation } = await import('@/features/investigation/services/investigationMutationService');
            return createInvestigation(incidentId, profile.tenant_id, user.id);
        },
        onSuccess: (_, incidentId) => {
            queryClient.invalidateQueries({ queryKey: ['investigation', incidentId] });
            toast.success(t('investigation.started', 'Investigation started'));
        },
        onError: (error) => {
            toast.error(t('common.error', 'Error: ') + error.message);
        },
    });
}

export function useUnlockRCA() {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const { t } = useTranslation();

    return useMutation({
        mutationFn: async ({ incidentId }: { incidentId: string }) => {
            if (!user?.id) throw new Error('Not authenticated');

            const { data, error } = await supabase.rpc('unlock_rca', {
                p_incident_id: incidentId,
            });

            if (error) throw error;
            return data;
        },
        onSuccess: (_, { incidentId }) => {
            queryClient.invalidateQueries({ queryKey: ['investigation', incidentId] });
            queryClient.invalidateQueries({ queryKey: ['incident-closure-check', incidentId] });
            toast.success(t('investigation.rca.unlockedSuccess', 'RCA Analysis has been unlocked.'));
        },
        onError: (error) => {
            toast.error(t('common.error', 'Error: ') + error.message);
        },
    });
}

export function useUpdateInvestigation() {
    const { profile, user } = useAuth();
    const queryClient = useQueryClient();
    const { t } = useTranslation();

    return useMutation({
        mutationFn: async ({
            id,
            incidentId,
            updates
        }: {
            id: string;
            incidentId: string;
            updates: Partial<Omit<Investigation, 'id' | 'tenant_id' | 'created_at'>>
        }) => {
            if (!profile?.tenant_id || !user?.id) {
                throw new Error('User not authenticated');
            }

            const dbUpdates: Record<string, unknown> = {
                ...updates,
                updated_at: new Date().toISOString(),
            };

            if (updates.five_whys !== undefined) {
                dbUpdates.five_whys = updates.five_whys as unknown as Json;
            }
            if (updates.root_causes !== undefined) {
                dbUpdates.root_causes = updates.root_causes as unknown as Json;
            }
            if (updates.contributing_factors_list !== undefined) {
                dbUpdates.contributing_factors_list = updates.contributing_factors_list as unknown as Json;
            }

            const { data, error } = await supabase
                .from('investigations')
                .update(dbUpdates)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;

            const rcaUpdates: unknown = {
                incident_id: incidentId,
                tenant_id: profile.tenant_id,
                updated_at: new Date().toISOString(),
            };

            if (updates.five_whys !== undefined) (rcaUpdates as any).five_whys = updates.five_whys;
            if (updates.root_causes !== undefined) (rcaUpdates as any).root_causes = updates.root_causes;
            if (updates.contributing_factors_list !== undefined) (rcaUpdates as any).contributing_factors = updates.contributing_factors_list;
            if (updates.immediate_cause !== undefined) (rcaUpdates as any).immediate_causes = [updates.immediate_cause];
            if (updates.underlying_cause !== undefined) (rcaUpdates as any).underlying_causes = [updates.underlying_cause];

            const { error: rcaError } = await (supabase as any)
                .from('incident_rca')
                .upsert(rcaUpdates, { onConflict: 'incident_id' });

            if (rcaError) throw rcaError;

            await supabase.from('incident_audit_logs').insert({
                incident_id: incidentId,
                tenant_id: profile.tenant_id,
                actor_id: user.id,
                action: 'investigation_updated',
                new_value: updates as unknown as Json,
            });

            return data;
        },
        onSuccess: (_, { incidentId }) => {
            queryClient.invalidateQueries({ queryKey: ['investigation', incidentId] });
            toast.success(t('investigation.updated', 'Investigation updated'));
        },
        onError: (error) => {
            toast.error(t('common.error', 'Error: ') + error.message);
        },
    });
}

export function useLockRCA() {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const { t } = useTranslation();

    return useMutation({
        mutationFn: async ({ incidentId }: { incidentId: string }) => {
            if (!user?.id) throw new Error('Not authenticated');

            const { lockRCA } = await import('@/features/investigation/services/investigationMutationService');
            return lockRCA(incidentId);
        },
        onSuccess: (_, { incidentId }) => {
            queryClient.invalidateQueries({ queryKey: ['investigation', incidentId] });
            queryClient.invalidateQueries({ queryKey: ['incident-closure-check', incidentId] });
            toast.success(t('investigation.rca.locked', 'RCA Locked successfully'));
        },
        onError: (error) => {
            toast.error(t('common.error', 'Error: ') + error.message);
        },
    });
}

export function useCreateCorrectiveAction() {
    const { profile, user } = useAuth();
    const queryClient = useQueryClient();
    const { t } = useTranslation();

    return useMutation({
        mutationFn: async (action: {
            incident_id: string;
            title: string;
            description?: string;
            assigned_to?: string;
            responsible_department_id?: string;
            start_date?: string;
            due_date?: string;
            priority?: string;
            action_type?: string;
            category?: string;
            linked_root_cause_id?: string;
            linked_cause_type?: string;
        }) => {
            if (!profile?.tenant_id || !user?.id) {
                throw new Error('User not authenticated');
            }

            const { data: incident } = await supabase
                .from('incidents')
                .select('branch_id, event_type')
                .eq('id', action.incident_id)
                .single();

            const { data, error } = await supabase
                .from('corrective_actions')
                .insert({
                    ...action,
                    tenant_id: profile.tenant_id,
                    branch_id: incident?.branch_id || null,
                    status: 'assigned',
                })
                .select()
                .single();

            if (error) throw error;

            await supabase.from('incident_audit_logs').insert({
                incident_id: action.incident_id,
                tenant_id: profile.tenant_id,
                actor_id: user.id,
                action: 'action_created',
                new_value: { action_id: data.id, title: action.title },
            });

            return data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['corrective-actions', data.incident_id] });
            toast.success(t('investigation.actions.created', 'Action created. Notification will be sent upon investigation release.'));
        },
        onError: (error) => {
            toast.error(t('common.error', 'Error: ') + error.message);
        },
    });
}

export function useUpdateCorrectiveAction() {
    const { profile, user } = useAuth();
    const queryClient = useQueryClient();
    const { t } = useTranslation();

    return useMutation({
        mutationFn: async ({
            id,
            incidentId,
            updates
        }: {
            id: string;
            incidentId: string;
            updates: Partial<CorrectiveAction>
        }) => {
            if (!profile?.tenant_id || !user?.id) {
                throw new Error('User not authenticated');
            }

            const { data, error } = await supabase
                .from('corrective_actions')
                .update({
                    ...updates,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;

            await supabase.from('incident_audit_logs').insert({
                incident_id: incidentId,
                tenant_id: profile.tenant_id,
                actor_id: user.id,
                action: 'action_updated',
                new_value: updates as unknown as Json,
            });

            return data;
        },
        onSuccess: (_, { incidentId }) => {
            queryClient.invalidateQueries({ queryKey: ['corrective-actions', incidentId] });
            toast.success(t('investigation.actions.updated', 'Action updated'));
        },
        onError: (error) => {
            toast.error(t('common.error', 'Error: ') + error.message);
        },
    });
}

export function useVerifyCorrectiveAction() {
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const { t } = useTranslation();

    return useMutation({
        mutationFn: async (input: {
            actionId: string;
            incidentId: string;
            verification_notes?: string;
            approved: boolean;
        }) => {
            if (!user?.id) throw new Error('No user');

            const { verifyCorrectiveAction } = await import('@/features/investigation/services/investigationMutationService');
            await verifyCorrectiveAction(input, user.id);
        },
        onSuccess: (_, { incidentId, approved }) => {
            queryClient.invalidateQueries({ queryKey: ['corrective-actions', incidentId] });
            queryClient.invalidateQueries({ queryKey: ['incident', incidentId] });
            queryClient.invalidateQueries({ queryKey: ['incidents'] });

            const message = approved
                ? t('investigation.actions.verified', 'Action verified and closed')
                : t('investigation.actions.returned', 'Action returned for correction');
            toast.success(message);
        },
        onError: (error) => {
            toast.error(t('common.error', 'Error: ') + error.message);
        },
    });
}

export function useDeleteCorrectiveAction() {
    const queryClient = useQueryClient();
    const { t } = useTranslation();

    return useMutation({
        mutationFn: async ({ id, incidentId }: { id: string; incidentId: string }) => {
            const { softDeleteCorrectiveAction } = await import('@/features/investigation/services/investigationMutationService');
            const result = await softDeleteCorrectiveAction(id, incidentId);
            return result;
        },
        onSuccess: (_, { incidentId }) => {
            queryClient.invalidateQueries({ queryKey: ['corrective-actions', incidentId] });
            toast.success(t('investigation.actions.deleted', 'Action deleted'));
        },
        onError: (error) => {
            toast.error(t('common.error', 'Error: ') + error.message);
        },
    });
}

export function useSubmitInvestigation() {
    const queryClient = useQueryClient();
    const { t } = useTranslation();

    return useMutation({
        mutationFn: async ({ incidentId }: { incidentId: string }) => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const { data: profile } = await supabase
                .from('profiles')
                .select('tenant_id')
                .eq('id', user.id)
                .single();

            if (!profile?.tenant_id) throw new Error('No tenant found');

            const { submitInvestigation } = await import('@/features/investigation/services/investigationMutationService');
            return submitInvestigation(incidentId, profile.tenant_id, user.id);
        },
        onSuccess: (_, { incidentId }) => {
            queryClient.invalidateQueries({ queryKey: ['incident', incidentId] });
            queryClient.invalidateQueries({ queryKey: ['incidents'] });
            toast.success(t('investigation.submit.success', 'Investigation submitted for review'));
        },
        onError: (error) => {
            toast.error(t('common.error', 'Error: ') + error.message);
        },
    });
}
