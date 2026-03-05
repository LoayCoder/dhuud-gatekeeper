import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import type { CreateAreaFindingInput, CreateActionFromFindingInput } from './types';

/**
 * Create a new finding (auto-called on FAIL or manual)
 */
export function useCreateAreaFinding() {
    const queryClient = useQueryClient();
    const { profile, user } = useAuth();

    return useMutation({
        mutationFn: async (input: CreateAreaFindingInput) => {
            if (!profile?.tenant_id || !user?.id) throw new Error('Not authenticated');

            // Check if finding already exists for this response
            const { data: existing } = await supabase
                .from('area_inspection_findings')
                .select('id, session_id')
                .eq('response_id', input.response_id)
                .is('deleted_at', null)
                .maybeSingle();

            if (existing) {
                return existing as { id: string; session_id: string };
            }

            const { data, error } = await supabase
                .from('area_inspection_findings')
                .insert({
                    tenant_id: profile.tenant_id,
                    session_id: input.session_id,
                    response_id: input.response_id,
                    reference_id: '', // Will be set by trigger
                    classification: input.classification || 'observation',
                    risk_level: input.risk_level || 'medium',
                    description: input.description || null,
                    recommendation: input.recommendation || null,
                    status: 'open',
                    created_by: user.id,
                })
                .select('id, session_id')
                .single();

            if (error) throw error;
            return data as { id: string; session_id: string };
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['area-findings', data.session_id] });
        },
    });
}

/**
 * Update finding classification, risk level, or recommendation
 */
export function useUpdateAreaFinding() {
    const queryClient = useQueryClient();
    const { t } = useTranslation();

    return useMutation({
        mutationFn: async ({
            findingId,
            sessionId,
            ...updates
        }: {
            findingId: string;
            sessionId: string;
            classification?: 'minor_nc' | 'major_nc' | 'critical_nc' | 'observation' | 'ofi';
            risk_level?: 'low' | 'medium' | 'high' | 'critical';
            description?: string;
            recommendation?: string;
        }) => {
            const { data, error } = await supabase
                .from('area_inspection_findings')
                .update(updates)
                .eq('id', findingId)
                .select('id')
                .single();

            if (error) throw error;
            return { ...data, sessionId };
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['area-findings', data.sessionId] });
            toast.success(t('inspections.findings.updated'));
        },
        onError: (error: Error) => {
            toast.error(error.message);
        },
    });
}

/**
 * Link finding to a corrective action
 */
export function useLinkFindingToAction() {
    const queryClient = useQueryClient();
    const { t } = useTranslation();

    return useMutation({
        mutationFn: async ({
            findingId,
            sessionId,
            actionId
        }: {
            findingId: string;
            sessionId: string;
            actionId: string;
        }) => {
            const { data, error } = await supabase
                .from('area_inspection_findings')
                .update({
                    corrective_action_id: actionId,
                    status: 'action_assigned',
                })
                .eq('id', findingId)
                .select()
                .single();

            if (error) throw error;
            return { ...data, sessionId };
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['area-findings', data.sessionId] });
            toast.success(t('inspections.findings.actionLinked'));
        },
        onError: (error: Error) => {
            toast.error(error.message);
        },
    });
}

/**
 * Close finding after action is verified
 */
export function useCloseAreaFinding() {
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const { t } = useTranslation();

    return useMutation({
        mutationFn: async ({ findingId, sessionId }: { findingId: string; sessionId: string }) => {
            if (!user?.id) throw new Error('Not authenticated');

            const { data, error } = await supabase
                .from('area_inspection_findings')
                .update({
                    status: 'closed',
                    closed_at: new Date().toISOString(),
                    closed_by: user.id,
                })
                .eq('id', findingId)
                .select()
                .single();

            if (error) throw error;
            return { ...data, sessionId };
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['area-findings', data.sessionId] });
            toast.success(t('inspections.findings.closed'));
        },
        onError: (error: Error) => {
            toast.error(error.message);
        },
    });
}

/**
 * Create a corrective action from a finding and link them
 */
export function useCreateActionFromFinding() {
    const queryClient = useQueryClient();
    const { profile } = useAuth();
    const { t } = useTranslation();

    return useMutation({
        mutationFn: async (input: CreateActionFromFindingInput) => {
            if (!profile?.tenant_id) throw new Error('Not authenticated');

            // 1. Create the corrective action
            const { data: action, error: actionError } = await supabase
                .from('corrective_actions')
                .insert({
                    tenant_id: profile.tenant_id,
                    title: input.title,
                    description: input.description,
                    assigned_to: input.assigned_to || null,
                    responsible_department_id: input.responsible_department_id || null,
                    due_date: input.due_date,
                    priority: input.priority,
                    action_type: input.action_type,
                    category: input.category,
                    status: 'assigned',
                    source_type: 'inspection_finding',
                    source_finding_id: input.findingId,
                    session_id: input.sessionId,
                })
                .select('id')
                .single();

            if (actionError) throw actionError;

            // 2. Update the finding with the action link and status
            const { error: findingError } = await supabase
                .from('area_inspection_findings')
                .update({
                    corrective_action_id: action.id,
                    status: 'action_assigned',
                })
                .eq('id', input.findingId);

            if (findingError) throw findingError;

            return { actionId: action.id, sessionId: input.sessionId };
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['area-findings', data.sessionId] });
            queryClient.invalidateQueries({ queryKey: ['area-findings-count', data.sessionId] });
            queryClient.invalidateQueries({ queryKey: ['can-close-session', data.sessionId] });
            toast.success(t('inspections.findings.actionCreated'));
        },
        onError: (error: Error) => {
            toast.error(error.message);
        },
    });
}
