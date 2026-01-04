import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useUserRoles } from "@/hooks/use-user-roles";

export type DisputeCategory = 'investigation_scope' | 'findings_accuracy' | 'timeline' | 'other';
export type MediationDecision = 'override_rejection' | 'maintain_rejection' | 'partial_rework';

export interface OpenDisputeInput {
  incidentId: string;
  category: DisputeCategory;
  reason: string;
  evidenceAttachments?: string[];
}

export interface MediationInput {
  incidentId: string;
  decision: MediationDecision;
  notes: string;
}

// Check if user can mediate disputes (HSSE Manager)
export function useCanMediateDispute() {
  const { user, isAdmin } = useAuth();
  const { hasRole } = useUserRoles();

  return useQuery({
    queryKey: ['can-mediate-dispute', user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      return isAdmin || hasRole('hsse_manager');
    },
    enabled: !!user?.id,
  });
}

// Check if user is the investigator for this incident
export function useIsAssignedInvestigator(incidentId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['is-assigned-investigator', incidentId, user?.id],
    queryFn: async () => {
      if (!incidentId || !user?.id) return false;

      const { data: investigation } = await supabase
        .from('investigations')
        .select('investigator_id')
        .eq('incident_id', incidentId)
        .single();

      return investigation?.investigator_id === user.id;
    },
    enabled: !!incidentId && !!user?.id,
  });
}

// Open a dispute (by investigator when manager rejects)
export function useOpenDispute() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: OpenDisputeInput) => {
      const { incidentId, category, reason, evidenceAttachments } = input;

      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user?.id)
        .single();

      const updateData = {
        status: 'dispute_resolution' as const,
        dispute_opened_at: new Date().toISOString(),
        dispute_opened_by: user?.id,
        dispute_category: category,
        dispute_evidence_attachments: evidenceAttachments || [],
        mediation_notes: reason,
      };

      const { error } = await supabase
        .from('incidents')
        .update(updateData)
        .eq('id', incidentId);

      if (error) throw error;

      // Log audit entry
      await supabase.from('incident_audit_logs').insert({
        incident_id: incidentId,
        tenant_id: profile?.tenant_id,
        actor_id: user?.id,
        action: 'dispute_opened',
        details: { category, reason },
      });

      // Notify HSSE Managers
      try {
        await supabase.functions.invoke('send-workflow-notification', {
          body: { incidentId, action: 'dispute_opened', category, reason },
        });
      } catch (e) {
        console.error('Failed to send notification:', e);
      }

      return { incidentId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      queryClient.invalidateQueries({ queryKey: ['incident'] });

      toast({
        title: 'Dispute Opened',
        description: 'Your dispute has been submitted for HSSE Manager mediation.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// Resolve dispute (by HSSE Manager)
export function useMediationDecision() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: MediationInput) => {
      const { incidentId, decision, notes } = input;

      let newStatus: string;
      const updateData: Record<string, unknown> = {
        mediator_id: user?.id,
        mediation_notes: notes,
        mediation_decision: decision,
        mediation_completed_at: new Date().toISOString(),
      };

      switch (decision) {
        case 'override_rejection':
          // Override manager rejection, proceed with investigation closure
          newStatus = 'pending_closure';
          break;
        case 'maintain_rejection':
          // Agree with manager, reopen investigation
          newStatus = 'investigation_in_progress';
          break;
        case 'partial_rework':
          // Partial rework needed
          newStatus = 'investigation_in_progress';
          updateData.rework_required = true;
          break;
        default:
          throw new Error('Invalid decision');
      }

      updateData.status = newStatus;

      const { error } = await supabase
        .from('incidents')
        .update(updateData)
        .eq('id', incidentId);

      if (error) throw error;

      // Log audit entry
      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user?.id)
        .single();

      await supabase.from('incident_audit_logs').insert({
        incident_id: incidentId,
        tenant_id: profile?.tenant_id,
        actor_id: user?.id,
        action: `mediation_${decision}`,
        details: { decision, notes },
      });

      // Send notification
      try {
        await supabase.functions.invoke('send-workflow-notification', {
          body: { incidentId, action: `mediation_${decision}`, notes },
        });
      } catch (e) {
        console.error('Failed to send notification:', e);
      }

      return { incidentId, newStatus };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      queryClient.invalidateQueries({ queryKey: ['incident'] });

      const messages: Record<MediationDecision, string> = {
        override_rejection: 'Manager rejection overridden. Investigation proceeding to closure.',
        maintain_rejection: 'Manager rejection maintained. Investigation reopened for rework.',
        partial_rework: 'Partial rework required. Investigation reopened.',
      };

      toast({
        title: 'Mediation Complete',
        description: messages[variables.decision],
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
