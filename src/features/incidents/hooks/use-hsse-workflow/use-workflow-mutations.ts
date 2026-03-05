import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import type { ExpertScreeningInput, DeptRepApprovalInput, ManagerApprovalInput, HSSEManagerEscalationInput, ReporterResponseInput } from './types';

// C15: Helper to check if user is a contractor consultant (blocked from severity/close/approve)
async function isContractorConsultant(userId: string): Promise<boolean> {
    const { data } = await supabase.rpc('has_contractor_consultant_access', { p_user_id: userId });
    return data === true;
}

export function useExpertScreening() {
    const queryClient = useQueryClient(); const { toast } = useToast(); const { user } = useAuth();
    return useMutation({
        mutationFn: async (input: ExpertScreeningInput) => {
            if (!user?.id) throw new Error('Not authenticated');
            const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user.id).single();
            if (!profile?.tenant_id) throw new Error('No tenant found');
            const { performExpertScreening } = await import('@/features/incidents');
            return performExpertScreening(input, user.id, profile.tenant_id);
        },
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['incidents'] }); queryClient.invalidateQueries({ queryKey: ['incident'] }); toast({ title: "Screening complete", description: "The event has been processed." }); },
        onError: (error) => { toast({ title: "Error", description: error.message, variant: "destructive" }); },
    });
}

export function useReporterResponse() {
    const queryClient = useQueryClient(); const { toast } = useToast(); const { user } = useAuth();
    return useMutation({
        mutationFn: async (input: ReporterResponseInput) => {
            if (!user?.id) throw new Error('Not authenticated');
            const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user.id).single();
            if (!profile?.tenant_id) throw new Error('No tenant found');
            const { handleReporterResponse } = await import('@/features/incidents');
            return handleReporterResponse(input, user.id, profile.tenant_id);
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['incidents'] }); queryClient.invalidateQueries({ queryKey: ['incident'] });
            const messages: Record<string, string> = { resubmit: "Event resubmitted for review", resubmit_to_expert: "Event resubmitted to HSSE Expert for re-screening", confirm_rejection: "Rejection confirmed, event closed", dispute_rejection: "Dispute submitted to HSSE Manager" };
            toast({ title: "Success", description: messages[variables.action] });
        },
        onError: (error) => { toast({ title: "Error", description: error.message, variant: "destructive" }); },
    });
}

export function useManagerApproval() {
    const queryClient = useQueryClient(); const { toast } = useToast(); const { user } = useAuth();
    return useMutation({
        mutationFn: async (input: ManagerApprovalInput) => {
            if (!user?.id) throw new Error('Not authenticated');
            const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user.id).single();
            if (!profile?.tenant_id) throw new Error('No tenant found');
            const { handleManagerApproval } = await import('@/features/incidents');
            return handleManagerApproval(input, user.id, profile.tenant_id);
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['incidents'] }); queryClient.invalidateQueries({ queryKey: ['incident'] });
            toast({ title: variables.decision === 'approved' ? "Investigation Approved" : "Investigation Rejected", description: variables.decision === 'approved' ? "HSSE Expert can now assign an investigator" : "Escalated to HSSE Manager for review" });
        },
        onError: (error) => { toast({ title: "Error", description: error.message, variant: "destructive" }); },
    });
}

export function useHSSEManagerEscalation() {
    const queryClient = useQueryClient(); const { toast } = useToast(); const { user } = useAuth();
    return useMutation({
        mutationFn: async (input: HSSEManagerEscalationInput) => {
            if (!user?.id) throw new Error('Not authenticated');
            const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user.id).single();
            if (!profile?.tenant_id) throw new Error('No tenant found');
            const { handleHSSEManagerEscalation } = await import('@/features/incidents');
            return handleHSSEManagerEscalation(input, user.id, profile.tenant_id);
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['incidents'] }); queryClient.invalidateQueries({ queryKey: ['incident'] });
            toast({ title: variables.decision === 'override' ? "Rejection Overridden" : "Rejection Maintained", description: variables.decision === 'override' ? "Investigation will proceed" : "Event has been closed" });
        },
        onError: (error) => { toast({ title: "Error", description: error.message, variant: "destructive" }); },
    });
}

export function useStartInvestigation() {
    const queryClient = useQueryClient(); const { toast } = useToast();
    return useMutation({
        mutationFn: async ({ incidentId, investigatorId, assignmentNotes }: { incidentId: string; investigatorId: string; assignmentNotes?: string }) => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user?.id) throw new Error('Not authenticated');
            const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user.id).single();
            if (!profile?.tenant_id) throw new Error('No tenant found');
            const { startInvestigation } = await import('@/features/incidents');
            return startInvestigation(incidentId, investigatorId, assignmentNotes, user.id, profile.tenant_id);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['incidents'] }); queryClient.invalidateQueries({ queryKey: ['incident'] }); queryClient.invalidateQueries({ queryKey: ['investigation'] });
            toast({ title: "Investigation Started", description: "Investigator has been assigned and notified." });
        },
        onError: (error) => { toast({ title: "Error", description: error.message, variant: "destructive" }); },
    });
}

export function useDeptRepApproval() {
    const queryClient = useQueryClient(); const { toast } = useToast(); const { user } = useAuth();
    return useMutation({
        mutationFn: async (input: DeptRepApprovalInput) => {
            if (!user?.id) throw new Error('Not authenticated');
            const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user.id).single();
            if (!profile?.tenant_id) throw new Error('No tenant found');
            const { handleDeptRepApproval } = await import('@/features/incidents');
            return handleDeptRepApproval(input, user.id, profile.tenant_id);
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['incidents'] }); queryClient.invalidateQueries({ queryKey: ['incident'] }); queryClient.invalidateQueries({ queryKey: ['corrective-actions'] }); queryClient.invalidateQueries({ queryKey: ['my-inspection-actions'] });
            toast({ title: variables.decision === 'approve' ? "Observation Approved" : "Escalation Requested", description: variables.decision === 'approve' ? "Actions released to assignees. Observation will close when all actions are verified." : "Observation has been sent to HSSE Expert for escalation review" });
        },
        onError: (error) => { toast({ title: "Error", description: error.message, variant: "destructive" }); },
    });
}
