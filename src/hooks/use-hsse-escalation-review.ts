import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

export type EscalationDecision = 'reject' | 'accept_observation' | 'upgrade_incident';

export interface EscalationReviewInput {
  incidentId: string;
  decision: EscalationDecision;
  notes?: string;
  investigatorId?: string; // Required for upgrade_incident
}

/**
 * Hook to check if user can review HSSE escalation for a specific observation
 */
export function useCanReviewHSSEEscalation(incidentId: string | null) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['can-review-hsse-escalation', user?.id, incidentId],
    queryFn: async () => {
      if (!user?.id || !incidentId) return false;
      
      // Check if user has HSSE role and incident is in pending_hsse_escalation_review status
      const { data: canPerform } = await supabase
        .rpc('can_perform_expert_screening', { _user_id: user.id });
      
      if (!canPerform) return false;
      
      // Check incident status
      const { data: incident } = await supabase
        .from('incidents')
        .select('status, event_type')
        .eq('id', incidentId)
        .single();
      
      // Use string comparison since new status may not be in types yet
      const status = incident?.status as string;
      return status === 'pending_hsse_escalation_review' && incident?.event_type === 'observation';
    },
    enabled: !!user?.id && !!incidentId,
  });
}

/**
 * Hook for HSSE Expert to review escalation requests from Dept Rep
 * 
 * Three decision options:
 * - reject: Escalation not justified, return to Dept Rep
 * - accept_observation: Confirm as observation, continue observation workflow
 * - upgrade_incident: Convert to incident with new INC reference
 */
export function useHSSEEscalationReview() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (input: EscalationReviewInput) => {
      const { incidentId, decision, notes, investigatorId } = input;
      
      // Get tenant_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user?.id)
        .single();
      
      if (!profile?.tenant_id) throw new Error('No tenant found');
      
      let newStatus: string;
      let newIncidentId: string | null = null;
      const updateData: Record<string, unknown> = {
        escalation_decision: decision,
        escalation_decision_by: user?.id,
        escalation_decision_at: new Date().toISOString(),
        escalation_decision_notes: notes,
      };
      
      switch (decision) {
        case 'reject':
          // Return to Dept Rep for action
          if (!notes || notes.length < 10) {
            throw new Error('Rejection reason is required (minimum 10 characters)');
          }
          newStatus = 'pending_dept_rep_approval';
          break;
          
        case 'accept_observation':
          // Continue as observation - go to HSSE validation or actions pending
          newStatus = 'pending_hsse_validation';
          break;
          
        case 'upgrade_incident':
          // Upgrade to incident using RPC function
          if (!investigatorId) {
            throw new Error('Investigator must be assigned when upgrading to incident');
          }
          
          const { data: upgradedIncidentId, error: upgradeError } = await supabase
            .rpc('upgrade_observation_to_incident', {
              p_observation_id: incidentId,
              p_user_id: user?.id,
              p_investigator_id: investigatorId,
              p_notes: notes || null,
            });
          
          if (upgradeError) throw upgradeError;
          
          newIncidentId = upgradedIncidentId as string;
          
          // The RPC already handles the status update, so we return early
          // Send notification
          try {
            await supabase.functions.invoke('send-workflow-notification', {
              body: { 
                incidentId, 
                action: 'escalation_upgraded',
                notes,
                newIncidentId,
                investigatorId,
              },
            });
          } catch (e) {
            console.error('Failed to send notification:', e);
          }
          
          return { incidentId, newStatus: 'upgraded_to_incident', newIncidentId };
          
        default:
          throw new Error('Invalid decision');
      }
      
      // For reject and accept_observation, update the incident
      updateData.status = newStatus;
      
      const { error } = await supabase
        .from('incidents')
        .update(updateData)
        .eq('id', incidentId);
      
      if (error) throw error;
      
      // Log audit entry
      await supabase.from('incident_audit_logs').insert({
        incident_id: incidentId,
        tenant_id: profile.tenant_id,
        actor_id: user?.id,
        action: `escalation_${decision}`,
        details: { decision, notes },
      });
      
      // Send notification
      try {
        await supabase.functions.invoke('send-workflow-notification', {
          body: { 
            incidentId, 
            action: `escalation_${decision}`,
            notes,
          },
        });
      } catch (e) {
        console.error('Failed to send notification:', e);
      }
      
      return { incidentId, newStatus, newIncidentId };
    },
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      queryClient.invalidateQueries({ queryKey: ['incident'] });
      queryClient.invalidateQueries({ queryKey: ['investigation'] });
      
      const messages: Record<EscalationDecision, { title: string; description: string }> = {
        reject: {
          title: "Escalation Rejected",
          description: "Observation returned to Department Representative",
        },
        accept_observation: {
          title: "Accepted as Observation",
          description: "Observation will continue through the observation workflow",
        },
        upgrade_incident: {
          title: "Upgraded to Incident",
          description: result.newIncidentId 
            ? "New incident created with investigation assigned"
            : "Observation has been upgraded to incident",
        },
      };
      
      const msg = messages[variables.decision];
      toast({
        title: msg.title,
        description: msg.description,
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
