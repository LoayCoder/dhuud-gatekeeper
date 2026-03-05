import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import type { DeptManagerViolationDecision, ContractControllerDecision, ContractorSiteRepDecision, HSSEViolationDecision } from './types';

export function useSubmitContractorViolation() {
    const { t } = useTranslation(); const queryClient = useQueryClient(); const { user } = useAuth();
    return useMutation({
        mutationFn: async ({ incidentId, violationTypeId }: { incidentId: string; violationTypeId: string }) => {
            if (!user?.id) throw new Error('User not authenticated');
            const { data, error } = await supabase.rpc('submit_contractor_violation', { p_incident_id: incidentId, p_violation_type_id: violationTypeId, p_user_id: user.id });
            if (error) throw error;
            const result = data as unknown as { success?: boolean; error?: string };
            if (result?.error) throw new Error(result.error);
            return { ...result, incidentId };
        },
        onSuccess: async (data) => {
            queryClient.invalidateQueries({ queryKey: ['incidents'] }); queryClient.invalidateQueries({ queryKey: ['incident'] });
            toast.success(t('workflow.violation.submitted', 'Contractor violation submitted for approval'));
            try { await supabase.functions.invoke('send-workflow-notification', { body: { incidentId: data.incidentId, action: 'violation_pending_approval' } }); } catch (e) { console.error('Failed to send violation notification:', e); }
        },
        onError: (error) => { console.error('Error submitting contractor violation:', error); toast.error(error.message || t('common.error')); },
    });
}

export function useDeptManagerViolationApproval() {
    const { t } = useTranslation(); const queryClient = useQueryClient(); const { user } = useAuth();
    return useMutation({
        mutationFn: async ({ incidentId, decision, notes }: { incidentId: string; decision: DeptManagerViolationDecision; notes?: string }) => {
            if (!user?.id) throw new Error('User not authenticated');
            const { data, error } = await supabase.rpc('dept_manager_approve_violation', { p_incident_id: incidentId, p_user_id: user.id, p_decision: decision, p_notes: notes || null });
            if (error) throw error;
            const result = data as unknown as { success?: boolean; error?: string };
            if (result?.error) throw new Error(result.error);
            return { ...result, incidentId, decision, notes };
        },
        onSuccess: async (data) => {
            queryClient.invalidateQueries({ queryKey: ['incidents'] }); queryClient.invalidateQueries({ queryKey: ['incident'] });
            if (data.decision === 'approved') {
                toast.success(t('workflow.violation.deptManagerApproved', 'Violation approved and routed to next approver'));
                try { await supabase.functions.invoke('send-workflow-notification', { body: { incidentId: data.incidentId, action: 'violation_fine_pending' } }); } catch (e) { console.error('Failed to send fine pending notification:', e); }
            } else {
                toast.success(t('workflow.violation.deptManagerRejected', 'Violation rejection sent to HSSE for review'));
                try { await supabase.functions.invoke('send-workflow-notification', { body: { incidentId: data.incidentId, action: 'violation_rejected_review', notes: data.notes } }); } catch (e) { console.error('Failed to send rejection notification:', e); }
            }
        },
        onError: (error) => { console.error('Error in dept manager violation approval:', error); toast.error(error.message || t('common.error')); },
    });
}

export function useContractControllerApproval() {
    const { t } = useTranslation(); const queryClient = useQueryClient(); const { user } = useAuth();
    return useMutation({
        mutationFn: async ({ incidentId, decision, notes }: { incidentId: string; decision: ContractControllerDecision; notes?: string }) => {
            if (!user?.id) throw new Error('User not authenticated');
            const { data, error } = await supabase.rpc('contract_controller_approve_violation', { p_incident_id: incidentId, p_user_id: user.id, p_decision: decision, p_notes: notes || null });
            if (error) throw error;
            const result = data as unknown as { success?: boolean; error?: string };
            if (result?.error) throw new Error(result.error);
            return { ...result, incidentId, decision, notes };
        },
        onSuccess: async (data) => {
            queryClient.invalidateQueries({ queryKey: ['incidents'] }); queryClient.invalidateQueries({ queryKey: ['incident'] });
            if (data.decision === 'approved') {
                toast.success(t('workflow.violation.fineApproved', 'Fine approved and violation finalized'));
                try { await supabase.functions.invoke('send-workflow-notification', { body: { incidentId: data.incidentId, action: 'violation_acknowledgment_required' } }); } catch (e) { console.error('Failed to send acknowledgment notification:', e); }
            } else {
                toast.success(t('workflow.violation.fineRejected', 'Fine rejection sent to HSSE for review'));
                try { await supabase.functions.invoke('send-workflow-notification', { body: { incidentId: data.incidentId, action: 'violation_rejected_review', notes: data.notes } }); } catch (e) { console.error('Failed to send rejection notification:', e); }
            }
        },
        onError: (error) => { console.error('Error in contract controller approval:', error); toast.error(error.message || t('common.error')); },
    });
}

export function useContractorSiteRepAcknowledge() {
    const { t } = useTranslation(); const queryClient = useQueryClient(); const { user } = useAuth();
    return useMutation({
        mutationFn: async ({ incidentId, decision, notes }: { incidentId: string; decision: ContractorSiteRepDecision; notes?: string }) => {
            if (!user?.id) throw new Error('User not authenticated');
            const { data, error } = await supabase.rpc('contractor_site_rep_acknowledge_violation', { p_incident_id: incidentId, p_user_id: user.id, p_decision: decision, p_notes: notes || null });
            if (error) throw error;
            const result = data as unknown as { success?: boolean; error?: string };
            if (result?.error) throw new Error(result.error);
            return { ...result, incidentId, decision, notes };
        },
        onSuccess: async (data) => {
            queryClient.invalidateQueries({ queryKey: ['incidents'] }); queryClient.invalidateQueries({ queryKey: ['incident'] });
            if (data.decision === 'acknowledged') {
                toast.success(t('workflow.violation.acknowledged', 'Violation acknowledged and finalized'));
                try { await supabase.functions.invoke('send-workflow-notification', { body: { incidentId: data.incidentId, action: 'violation_finalized' } }); } catch (e) { console.error('Failed to send finalized notification:', e); }
            } else {
                toast.success(t('workflow.violation.contestSent', 'Contest sent to HSSE for review'));
                try { await supabase.functions.invoke('send-workflow-notification', { body: { incidentId: data.incidentId, action: 'violation_contested', notes: data.notes } }); } catch (e) { console.error('Failed to send contested notification:', e); }
            }
        },
        onError: (error) => { console.error('Error in contractor site rep acknowledgment:', error); toast.error(error.message || t('common.error')); },
    });
}

export function useHSSEViolationReview() {
    const { t } = useTranslation(); const queryClient = useQueryClient(); const { user } = useAuth();
    return useMutation({
        mutationFn: async ({ incidentId, decision, notes, modifiedViolationTypeId }: { incidentId: string; decision: HSSEViolationDecision; notes?: string; modifiedViolationTypeId?: string }) => {
            if (!user?.id) throw new Error('User not authenticated');
            const { data, error } = await supabase.rpc('hsse_review_violation', { p_incident_id: incidentId, p_user_id: user.id, p_decision: decision, p_notes: notes || null, p_modified_violation_type_id: modifiedViolationTypeId || null });
            if (error) throw error;
            const result = data as unknown as { success?: boolean; error?: string };
            if (result?.error) throw new Error(result.error);
            return { ...result, incidentId, decision, notes };
        },
        onSuccess: async (data) => {
            queryClient.invalidateQueries({ queryKey: ['incidents'] }); queryClient.invalidateQueries({ queryKey: ['incident'] });
            const action = data.decision === 'cancel' ? 'violation_cancelled' : 'violation_finalized';
            const msg = data.decision === 'enforce' ? t('workflow.violation.enforced', 'Violation enforced') : data.decision === 'modify' ? t('workflow.violation.modified', 'Violation modified and enforced') : t('workflow.violation.cancelled', 'Violation cancelled');
            toast.success(msg);
            try { await supabase.functions.invoke('send-workflow-notification', { body: { incidentId: data.incidentId, action, notes: data.notes } }); } catch (e) { console.error('Failed to send notification:', e); }
        },
        onError: (error) => { console.error('Error in HSSE violation review:', error); toast.error(error.message || t('common.error')); },
    });
}
