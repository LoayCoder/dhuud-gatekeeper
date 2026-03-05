import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { getSeverityConfig, type SeverityLevelV2 } from "@/lib/hsse-severity-levels";

interface HSSEValidationInput { incidentId: string; decision: 'accept' | 'reject'; notes?: string; }
interface ManagerClosureInput { incidentId: string; justification: string; }

export function useHSSEValidation() {
    const queryClient = useQueryClient(); const { toast } = useToast(); const { user } = useAuth();
    return useMutation({
        mutationFn: async (input: HSSEValidationInput) => {
            const { incidentId, decision, notes } = input;
            const { data: incident, error: fetchError } = await supabase.from('incidents').select('severity_v2, closure_requires_manager').eq('id', incidentId).single();
            if (fetchError || !incident) throw new Error('Incident not found');
            const severity = incident.severity_v2 as SeverityLevelV2;
            const config = getSeverityConfig(severity);
            let newStatus: string;
            const updateData: Record<string, unknown> = { hsse_validation_status: decision === 'accept' ? 'accepted' : 'rejected', hsse_validated_by: user?.id, hsse_validated_at: new Date().toISOString(), hsse_validation_notes: notes };
            if (decision === 'accept') {
                if (config?.requiresManagerClosure) { newStatus = 'pending_final_closure'; updateData.closure_requires_manager = true; }
                else {
                    const { count: pendingActions } = await supabase.from('corrective_actions').select('id', { count: 'exact', head: true }).eq('incident_id', incidentId).not('status', 'eq', 'verified').is('deleted_at', null);
                    newStatus = (pendingActions && pendingActions > 0) ? 'observation_actions_pending' : 'closed';
                }
            } else { newStatus = 'pending_dept_rep_approval'; }
            updateData.status = newStatus;
            const { error } = await supabase.from('incidents').update(updateData).eq('id', incidentId);
            if (error) throw error;
            const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user?.id).single();
            await supabase.from('incident_audit_logs').insert({ incident_id: incidentId, tenant_id: profile?.tenant_id, actor_id: user?.id, action: `hsse_validation_${decision}`, details: { decision, notes, severity } });
            try { await supabase.functions.invoke('send-workflow-notification', { body: { incidentId, action: `hsse_validation_${decision}`, notes } }); } catch (e) { console.error('Failed to send notification:', e); }
            return { incidentId, newStatus };
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['incidents'] }); queryClient.invalidateQueries({ queryKey: ['incident'] }); queryClient.invalidateQueries({ queryKey: ['pending-hsse-validation'] });
            toast({ title: variables.decision === 'accept' ? "Validation Accepted" : "Validation Rejected", description: variables.decision === 'accept' ? "Risk and actions have been validated" : "Returned to department for correction" });
        },
        onError: (error) => { toast({ title: "Error", description: error.message, variant: "destructive" }); },
    });
}

export function useManagerFinalClosure() {
    const queryClient = useQueryClient(); const { toast } = useToast(); const { user } = useAuth();
    return useMutation({
        mutationFn: async (input: ManagerClosureInput) => {
            const { incidentId, justification } = input;
            const updateData: Record<string, unknown> = { status: 'closed', hsse_manager_decision: 'approved', hsse_manager_decision_by: user?.id, hsse_manager_justification: justification };
            const { error } = await supabase.from('incidents').update(updateData).eq('id', incidentId);
            if (error) throw error;
            const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user?.id).single();
            await supabase.from('incident_audit_logs').insert({ incident_id: incidentId, tenant_id: profile?.tenant_id, actor_id: user?.id, action: 'manager_final_closure', details: { justification } });
            try { await supabase.functions.invoke('send-workflow-notification', { body: { incidentId, action: 'manager_final_closure', justification } }); } catch (e) { console.error('Failed to send notification:', e); }
            return { incidentId };
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['incidents'] }); queryClient.invalidateQueries({ queryKey: ['incident'] }); queryClient.invalidateQueries({ queryKey: ['pending-final-closure'] });
            toast({ title: "Observation Closed", description: "Level 5 observation has been finalized and closed by HSSE Manager" });
        },
        onError: (error) => { toast({ title: "Error", description: error.message, variant: "destructive" }); },
    });
}
