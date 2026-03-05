import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import type { Json } from "@/integrations/supabase/types";

// Combined hook for approval actions
export function useIncidentClosureApproval(incidentId: string) {
    const approveMutation = useApproveIncidentClosure();
    const rejectMutation = useRejectIncidentClosure();

    return {
        approveClosureMutation: {
            mutate: ({ notes }: { notes?: string }) => approveMutation.mutate({ incidentId }),
            isPending: approveMutation.isPending,
        },
        rejectClosureMutation: {
            mutate: ({ notes }: { notes?: string }) => rejectMutation.mutate({ incidentId, rejectionNotes: notes || '' }),
            isPending: rejectMutation.isPending,
        },
    };
}

export function useRequestIncidentClosure() {
    const { profile, user } = useAuth();
    const queryClient = useQueryClient();
    const { t } = useTranslation();

    return useMutation({
        mutationFn: async ({
            incidentId,
            notes,
        }: {
            incidentId: string;
            notes?: string;
        }) => {
            if (!profile?.tenant_id || !user?.id) {
                throw new Error('User not authenticated');
            }

            const { data, error } = await supabase
                .from('incidents')
                .update({
                    status: 'pending_closure' as unknown as 'submitted',
                    closure_requested_by: user.id,
                    closure_requested_at: new Date().toISOString(),
                    closure_request_notes: notes || null,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', incidentId)
                .select('id, reference_id')
                .single();

            if (error) throw error;

            await supabase.from('incident_audit_logs').insert({
                incident_id: incidentId,
                tenant_id: profile.tenant_id,
                actor_id: user.id,
                action: 'closure_requested',
                new_value: { notes, requested_at: new Date().toISOString() } as unknown as Json,
            });

            try {
                await supabase.functions.invoke('send-incident-email', {
                    body: {
                        type: 'closure_requested',
                        incident_id: incidentId,
                        incident_reference: data.reference_id,
                        tenant_id: profile.tenant_id,
                        requested_by_name: profile.full_name,
                        notes,
                    },
                });
            } catch (emailError) {
                console.error('Failed to send closure request email:', emailError);
            }

            return data;
        },
        onSuccess: (_, { incidentId }) => {
            queryClient.invalidateQueries({ queryKey: ['incident', incidentId] });
            queryClient.invalidateQueries({ queryKey: ['incidents'] });
            queryClient.invalidateQueries({ queryKey: ['pending-closures'] });
            toast.success(t('investigation.closureRequested', 'Closure request submitted'));
        },
        onError: (error) => {
            toast.error(t('common.error', 'Error: ') + error.message);
        },
    });
}

export function useApproveIncidentClosure() {
    const { profile, user } = useAuth();
    const queryClient = useQueryClient();
    const { t } = useTranslation();

    return useMutation({
        mutationFn: async ({
            incidentId,
            isFinalClosure = false,
            approvalNotes,
            signatureDataUrl,
        }: {
            incidentId: string;
            isFinalClosure?: boolean;
            approvalNotes?: string;
            signatureDataUrl?: string;
        }) => {
            if (!profile?.tenant_id || !user?.id) {
                throw new Error('User not authenticated');
            }

            let signaturePath: string | null = null;
            if (signatureDataUrl && isFinalClosure) {
                try {
                    const base64Data = signatureDataUrl.replace(/^data:image\/\w+;base64,/, '');
                    const byteArray = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
                    const blob = new Blob([byteArray], { type: 'image/png' });

                    const fileName = `${incidentId}/closure-signature-${Date.now()}.png`;
                    const { error: uploadError } = await supabase.storage
                        .from('incident-evidence')
                        .upload(fileName, blob, { contentType: 'image/png' });

                    if (!uploadError) {
                        signaturePath = fileName;
                    } else {
                        console.error('Signature upload failed:', uploadError);
                    }
                } catch (sigError) {
                    console.error('Failed to process signature:', sigError);
                }
            }

            const targetStatus = isFinalClosure ? 'closed' : 'investigation_closed';
            const actionType = isFinalClosure ? 'final_closure_approved' : 'investigation_closure_approved';

            const updatePayload: Record<string, unknown> = {
                status: targetStatus as unknown as 'submitted',
                closure_approved_by: user.id,
                closure_approved_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            };

            if (isFinalClosure && signaturePath) {
                updatePayload.closure_signature_path = signaturePath;
                updatePayload.closure_signed_by = user.id;
                updatePayload.closure_signed_at = new Date().toISOString();
            }

            const { data, error } = await supabase
                .from('incidents')
                .update(updatePayload)
                .eq('id', incidentId)
                .select('id, reference_id, closure_requested_by')
                .single();

            if (error) throw error;

            await supabase.from('incident_audit_logs').insert({
                incident_id: incidentId,
                tenant_id: profile.tenant_id,
                actor_id: user.id,
                action: actionType,
                new_value: {
                    approved_at: new Date().toISOString(),
                    target_status: targetStatus,
                    approval_notes: approvalNotes || null,
                    has_signature: !!signaturePath,
                } as unknown as Json,
            });

            try {
                await supabase.functions.invoke('send-incident-email', {
                    body: {
                        type: isFinalClosure ? 'incident_closed' : 'investigation_approved',
                        incident_id: incidentId,
                        incident_reference: data.reference_id,
                        tenant_id: profile.tenant_id,
                        approved_by_name: profile.full_name,
                    },
                });
            } catch (emailError) {
                console.error('Failed to send closure approval email:', emailError);
            }

            if (!isFinalClosure) {
                try {
                    const { data: actions } = await supabase
                        .from('corrective_actions')
                        .select(`
              id, title, priority, due_date, description,
              assigned_to,
              assignee:profiles!corrective_actions_assigned_to_fkey(id, full_name, email)
            `)
                        .eq('incident_id', incidentId)
                        .is('deleted_at', null)
                        .not('assigned_to', 'is', null);

                    if (actions && actions.length > 0) {
                        const emailPromises = actions.map(async (action) => {
                            const assignee = action.assignee as { id: string; full_name: string; email: string } | null;
                            if (assignee?.email) {
                                try {
                                    await supabase.functions.invoke('send-action-email', {
                                        body: {
                                            type: 'action_assigned',
                                            recipient_email: assignee.email,
                                            recipient_name: assignee.full_name || 'Team Member',
                                            action_title: action.title,
                                            action_priority: action.priority,
                                            due_date: action.due_date,
                                            action_description: action.description,
                                            incident_reference: data.reference_id,
                                        },
                                    });
                                } catch (err) {
                                    console.error(`Failed to send email for action ${action.id}:`, err);
                                }
                            }
                        });

                        await Promise.allSettled(emailPromises);
                    }
                } catch (actionEmailError) {
                    console.error('Failed to send action release emails:', actionEmailError);
                }
            }

            return data;
        },
        onSuccess: (_, { incidentId, isFinalClosure }) => {
            queryClient.invalidateQueries({ queryKey: ['incident', incidentId] });
            queryClient.invalidateQueries({ queryKey: ['incidents'] });
            queryClient.invalidateQueries({ queryKey: ['pending-closures'] });
            queryClient.invalidateQueries({ queryKey: ['corrective-actions', incidentId] });
            const successMessage = isFinalClosure
                ? t('investigation.incidentClosed', 'Incident closed successfully')
                : t('investigation.investigationApproved', 'Investigation approved - actions released to assignees');
            toast.success(successMessage);
        },
        onError: (error) => {
            toast.error(t('common.error', 'Error: ') + error.message);
        },
    });
}

export function useRejectIncidentClosure() {
    const { profile, user } = useAuth();
    const queryClient = useQueryClient();
    const { t } = useTranslation();

    return useMutation({
        mutationFn: async ({
            incidentId,
            rejectionNotes,
        }: {
            incidentId: string;
            rejectionNotes: string;
        }) => {
            if (!profile?.tenant_id || !user?.id) {
                throw new Error('User not authenticated');
            }

            const { data, error } = await supabase
                .from('incidents')
                .update({
                    status: 'investigation_in_progress',
                    investigation_started_at: new Date().toISOString(),
                    closure_rejection_notes: rejectionNotes,
                    closure_requested_by: null,
                    closure_requested_at: null,
                    closure_request_notes: null,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', incidentId)
                .select('id, reference_id, closure_requested_by')
                .single();

            if (error) throw error;

            await supabase.from('incident_audit_logs').insert({
                incident_id: incidentId,
                tenant_id: profile.tenant_id,
                actor_id: user.id,
                action: 'closure_rejected',
                new_value: { rejection_notes: rejectionNotes, rejected_at: new Date().toISOString() } as unknown as Json,
            });

            try {
                await supabase.functions.invoke('send-incident-email', {
                    body: {
                        type: 'closure_rejected',
                        incident_id: incidentId,
                        incident_reference: data.reference_id,
                        tenant_id: profile.tenant_id,
                        rejected_by_name: profile.full_name,
                        rejection_notes: rejectionNotes,
                    },
                });
            } catch (emailError) {
                console.error('Failed to send closure rejection email:', emailError);
            }

            return data;
        },
        onSuccess: (_, { incidentId }) => {
            queryClient.invalidateQueries({ queryKey: ['incident', incidentId] });
            queryClient.invalidateQueries({ queryKey: ['incidents'] });
            queryClient.invalidateQueries({ queryKey: ['pending-closures'] });
            toast.success(t('investigation.closureRejected', 'Closure request rejected'));
        },
        onError: (error) => {
            toast.error(t('common.error', 'Error: ') + error.message);
        },
    });
}

export function useReopenIncident() {
    const { profile, user } = useAuth();
    const queryClient = useQueryClient();
    const { t } = useTranslation();

    return useMutation({
        mutationFn: async ({
            incidentId,
            reason,
        }: {
            incidentId: string;
            reason: string;
        }) => {
            if (!profile?.tenant_id || !user?.id) {
                throw new Error('User not authenticated');
            }

            const { data: incident } = await supabase
                .from('incidents')
                .select('reopen_count')
                .eq('id', incidentId)
                .single();

            const currentReopenCount = (incident as unknown)?.reopen_count || 0;
            if (currentReopenCount >= 3) {
                throw new Error('Maximum reopens (3) exceeded for this incident. Please submit a new report instead.');
            }

            const { data, error } = await (supabase.rpc as unknown)('reopen_closed_incident', {
                p_incident_id: incidentId,
                p_reason: reason,
            });

            if (error) throw error;

            await supabase
                .from('incidents')
                .update({ reopen_count: currentReopenCount + 1 } as unknown)
                .eq('id', incidentId);

            return data;
        },
        onSuccess: (_, { incidentId }) => {
            queryClient.invalidateQueries({ queryKey: ['incident', incidentId] });
            queryClient.invalidateQueries({ queryKey: ['incidents'] });
            queryClient.invalidateQueries({ queryKey: ['investigation', incidentId] });
            toast.success(t('investigation.reopen.success', 'Incident reopened successfully'));
        },
        onError: (error) => {
            toast.error(t('common.error', 'Error: ') + error.message);
        },
    });
}
