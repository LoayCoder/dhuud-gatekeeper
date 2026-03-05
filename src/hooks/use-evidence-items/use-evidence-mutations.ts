import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import type { CreateEvidenceParams, UpdateEvidenceReviewParams, Json } from './types';
import { useCurrentLoginSession } from './use-evidence-queries';

// Create evidence item
export function useCreateEvidence() {
    const { t } = useTranslation();
    const { profile, user } = useAuth();
    const queryClient = useQueryClient();
    const { data: sessionId } = useCurrentLoginSession();

    return useMutation({
        mutationFn: async (params: CreateEvidenceParams) => {
            if (!profile?.tenant_id || !user?.id) {
                throw new Error('User not authenticated');
            }

            const { data, error } = await supabase
                .from('incident_evidence')
                .insert({
                    incident_id: params.incident_id,
                    evidence_type: params.evidence_type,
                    file_url: params.storage_path,
                    file_name: params.file_name,
                    file_size: params.file_size,
                    mime_type: params.mime_type,
                    description: params.description,
                    tenant_id: profile.tenant_id,
                    uploaded_by: user.id,
                    cctv_metadata: params.cctv_data ? (params.cctv_data as unknown as Json) : null,
                })
                .select('id')
                .single();

            if (error) throw error;

            await supabase.from('incident_audit_logs').insert({
                incident_id: params.incident_id,
                tenant_id: profile.tenant_id,
                actor_id: user.id,
                action: 'evidence_uploaded',
                details: {
                    evidence_type: params.evidence_type,
                    file_name: params.file_name,
                    session_id: sessionId,
                } as Json,
            });

            return data;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['evidence-items', variables.incident_id] });
            toast.success(t('investigation.evidence.uploaded', 'Evidence uploaded successfully'));
        },
        onError: (error) => {
            toast.error(t('common.error', 'Error: ') + error.message);
        },
    });
}

// Update evidence review
export function useUpdateEvidenceReview() {
    const { t } = useTranslation();
    const { profile, user } = useAuth();
    const queryClient = useQueryClient();
    const { data: sessionId } = useCurrentLoginSession();

    return useMutation({
        mutationFn: async ({ id, review_comment }: UpdateEvidenceReviewParams) => {
            if (!user?.id) {
                throw new Error('User not authenticated');
            }

            const { data, error } = await supabase
                .from('incident_evidence')
                .update({
                    review_comment,
                    reviewed_by: user.id,
                    reviewed_at: new Date().toISOString(),
                })
                .eq('id', id)
                .select('incident_id')
                .single();

            if (error) throw error;

            await supabase.from('incident_audit_logs').insert({
                incident_id: data.incident_id,
                tenant_id: profile?.tenant_id,
                actor_id: user.id,
                action: 'evidence_reviewed',
                details: {
                    evidence_id: id,
                    review_comment,
                    session_id: sessionId,
                } as Json,
            });

            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['evidence-items'] });
            toast.success(t('investigation.evidence.reviewSaved', 'Review saved successfully'));
        },
        onError: (error) => {
            toast.error(t('common.error', 'Error: ') + error.message);
        },
    });
}

// Soft delete evidence item via SECURITY DEFINER RPC
export function useDeleteEvidence() {
    const { t } = useTranslation();
    const { profile, user } = useAuth();
    const queryClient = useQueryClient();
    const { data: sessionId } = useCurrentLoginSession();

    return useMutation({
        mutationFn: async (id: string) => {
            if (!user?.id) {
                throw new Error('User not authenticated');
            }

            if (!profile?.tenant_id) {
                throw new Error('Tenant not found');
            }

            const { data: evidence, error: fetchError } = await supabase
                .from('incident_evidence')
                .select(`
          id,
          incident_id,
          tenant_id,
          evidence_type,
          file_url,
          file_name,
          file_size,
          description,
          created_at,
          uploaded_by
        `)
                .eq('id', id)
                .single();

            if (fetchError || !evidence) {
                throw new Error('Evidence not found');
            }

            // C8: Check litigation hold
            const { data: incident } = await supabase
                .from('incidents')
                .select('litigation_hold')
                .eq('id', evidence.incident_id)
                .single();

            if ((incident as { litigation_hold?: boolean | null })?.litigation_hold === true) {
                throw new Error('Evidence cannot be deleted: this incident is under litigation hold. Contact the legal team to release the hold first.');
            }

            await supabase.from('incident_audit_logs').insert({
                incident_id: evidence.incident_id,
                tenant_id: profile.tenant_id,
                actor_id: user.id,
                action: 'evidence_deleted',
                old_value: {
                    id: evidence.id,
                    evidence_type: evidence.evidence_type,
                    file_name: evidence.file_name,
                    file_size: evidence.file_size,
                    storage_path: evidence.file_url,
                    description: evidence.description,
                    uploaded_by: evidence.uploaded_by,
                    created_at: evidence.created_at,
                } as Json,
                details: {
                    evidence_id: id,
                    session_id: sessionId,
                } as Json,
            });

            const { data: deleteResult, error: deleteError } = await supabase.rpc('soft_delete_incident_evidence' as any, { p_evidence_id: id } as any);

            if (deleteError) {
                throw new Error(deleteError.message || 'Failed to delete evidence');
            }

            if (deleteResult === 'hard' && evidence.file_url) {
                await supabase.storage
                    .from('incident-attachments')
                    .remove([evidence.file_url]);
            }

            return evidence.incident_id;
        },
        onSuccess: (incidentId) => {
            if (incidentId) {
                queryClient.invalidateQueries({ queryKey: ['evidence-items', incidentId] });
            }
            toast.success(t('investigation.evidence.deleted', 'Evidence deleted'));
        },
        onError: (error) => {
            toast.error(t('common.error', 'Error: ') + error.message);
        },
    });
}
