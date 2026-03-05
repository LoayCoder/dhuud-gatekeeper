import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import { logger } from '@/lib/logger';

// Verify or reject a completed action
export function useVerifyAction() {
    const { toast } = useToast();
    const { t } = useTranslation();
    const { user, profile } = useAuth();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            actionId,
            approved,
            notes
        }: {
            actionId: string;
            approved: boolean;
            notes?: string;
        }) => {
            if (!user?.id) throw new Error('User not authenticated');

            // Fetch action details for email notification
            const { data: action, error: fetchError } = await supabase
                .from('corrective_actions')
                .select(`
          id, title, return_count, incident_id,
          assigned_user:profiles!corrective_actions_assigned_to_fkey(id, full_name, email),
          incident:incidents!corrective_actions_incident_id_fkey(id, reference_id)
        `)
                .eq('id', actionId)
                .single();

            if (fetchError) throw fetchError;

            const updateData = approved
                ? {
                    status: 'closed', // Auto-close after HSSE Expert verification
                    verified_by: user.id,
                    verified_at: new Date().toISOString(),
                    verification_notes: notes || null,
                }
                : {
                    status: 'returned_for_correction',
                    rejected_by: user.id,
                    rejected_at: new Date().toISOString(),
                    rejection_notes: notes || null,
                    last_returned_at: new Date().toISOString(),
                    last_return_reason: notes || null,
                    return_count: (action?.return_count || 0) + 1,
                };

            const { error } = await supabase
                .from('corrective_actions')
                .update(updateData)
                .eq('id', actionId);

            if (error) throw error;

            // Send email notification for returned actions
            if (!approved && action?.assigned_user) {
                const assignedUser = action.assigned_user as { id: string; full_name: string | null; email: string | null };
                const incident = action.incident as { id: string; reference_id: string | null } | null;

                if (assignedUser.email) {
                    try {
                        await supabase.functions.invoke('send-action-email', {
                            body: {
                                type: 'action_returned',
                                recipient_email: assignedUser.email,
                                recipient_name: assignedUser.full_name || 'Team Member',
                                action_title: action.title,
                                incident_reference: incident?.reference_id || undefined,
                                rejection_notes: notes || undefined,
                                return_count: (action.return_count || 0) + 1,
                            },
                        });
                        logger.info('Action returned email sent to:', assignedUser.email);
                    } catch (emailError) {
                        logger.error('Failed to send action returned email:', emailError);
                    }
                }
            }

            // Send email notification for closed actions & log audit entry
            if (approved && action?.assigned_user) {
                const assignedUser = action.assigned_user as { id: string; full_name: string | null; email: string | null };
                const incident = action.incident as { id: string; reference_id: string | null } | null;

                // Get verifier name for email
                const { data: verifierProfile } = await supabase
                    .from('profiles')
                    .select('full_name')
                    .eq('id', user.id)
                    .single();

                // Send closure notification email
                if (assignedUser.email) {
                    try {
                        await supabase.functions.invoke('send-action-email', {
                            body: {
                                type: 'action_closed',
                                recipient_email: assignedUser.email,
                                recipient_name: assignedUser.full_name || 'Team Member',
                                action_title: action.title,
                                incident_reference: incident?.reference_id || undefined,
                                verification_notes: notes || undefined,
                                verifier_name: verifierProfile?.full_name || 'HSSE Expert',
                            },
                        });
                        logger.info('Action closed email sent to:', assignedUser.email);
                    } catch (emailError) {
                        logger.error('Failed to send action closed email:', emailError);
                    }
                }

                // Log audit entry for action closure
                if (incident?.id && profile?.tenant_id) {
                    try {
                        await supabase.from('incident_audit_logs').insert({
                            incident_id: incident.id,
                            tenant_id: profile.tenant_id,
                            actor_id: user.id,
                            action: 'action_closed_by_verifier',
                            new_value: {
                                action_id: actionId,
                                action_title: action.title,
                                verification_notes: notes || null,
                                closed_at: new Date().toISOString(),
                                closed_by: verifierProfile?.full_name || user.id,
                            },
                        });
                        logger.debug('Audit log entry created for action closure');
                    } catch (auditError) {
                        logger.error('Failed to create audit log:', auditError);
                    }
                }
            }

            return { approved };
        },
        onSuccess: (result) => {
            queryClient.invalidateQueries({ queryKey: ['pending-action-approvals'] });
            queryClient.invalidateQueries({ queryKey: ['corrective-actions'] });
            queryClient.invalidateQueries({ queryKey: ['my-corrective-actions'] });
            toast({
                title: t('common.success'),
                description: result.approved
                    ? t('investigation.approvals.actionClosed', 'Action verified and closed successfully')
                    : t('investigation.approvals.actionRejected', 'Action rejected and returned to assignee'),
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

// Approve or reject a severity change
export function useApproveSeverityChange() {
    const { toast } = useToast();
    const { t } = useTranslation();
    const { user } = useAuth();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            incidentId,
            approved,
        }: {
            incidentId: string;
            approved: boolean;
        }) => {
            if (!user?.id) throw new Error('User not authenticated');

            let updateData: Record<string, unknown>;

            if (approved) {
                // Approve: clear pending flag, record approver
                updateData = {
                    severity_pending_approval: false,
                    severity_approved_by: user.id,
                    severity_approved_at: new Date().toISOString(),
                };
            } else {
                // Reject: revert to original severity_v2
                const { data: incident } = await supabase
                    .from('incidents')
                    .select('original_severity_v2')
                    .eq('id', incidentId)
                    .single();

                updateData = {
                    severity_v2: incident?.original_severity_v2,
                    severity_pending_approval: false,
                    severity_change_justification: null,
                };
            }

            const { error } = await supabase
                .from('incidents')
                .update(updateData)
                .eq('id', incidentId);

            if (error) throw error;
            return { approved };
        },
        onSuccess: (result) => {
            queryClient.invalidateQueries({ queryKey: ['pending-severity-approvals'] });
            queryClient.invalidateQueries({ queryKey: ['incidents'] });
            queryClient.invalidateQueries({ queryKey: ['incident'] });
            toast({
                title: t('common.success'),
                description: result.approved
                    ? t('investigation.approvals.severityApproved', 'Severity change approved')
                    : t('investigation.approvals.severityRejected', 'Severity change rejected'),
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

// Approve or reject a potential severity change
export function useApprovePotentialSeverityChange() {
    const { toast } = useToast();
    const { t } = useTranslation();
    const { user } = useAuth();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            incidentId,
            approved,
        }: {
            incidentId: string;
            approved: boolean;
        }) => {
            if (!user?.id) throw new Error('User not authenticated');

            let updateData: Record<string, unknown>;

            if (approved) {
                // Approve: clear pending flag, record approver
                updateData = {
                    potential_severity_pending_approval: false,
                    potential_severity_approved_by: user.id,
                    potential_severity_approved_at: new Date().toISOString(),
                };
            } else {
                // Reject: revert to original potential_severity_v2
                const { data: incident } = await supabase
                    .from('incidents')
                    .select('original_potential_severity_v2')
                    .eq('id', incidentId)
                    .single();

                updateData = {
                    potential_severity_v2: incident?.original_potential_severity_v2,
                    potential_severity_pending_approval: false,
                    potential_severity_justification: null,
                };
            }

            const { error } = await supabase
                .from('incidents')
                .update(updateData)
                .eq('id', incidentId);

            if (error) throw error;
            return { approved };
        },
        onSuccess: (result) => {
            queryClient.invalidateQueries({ queryKey: ['pending-potential-severity-approvals'] });
            queryClient.invalidateQueries({ queryKey: ['incidents'] });
            queryClient.invalidateQueries({ queryKey: ['incident'] });
            toast({
                title: t('common.success'),
                description: result.approved
                    ? t('investigation.approvals.potentialSeverityApproved', 'Potential severity approved')
                    : t('investigation.approvals.potentialSeverityRejected', 'Potential severity rejected'),
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
