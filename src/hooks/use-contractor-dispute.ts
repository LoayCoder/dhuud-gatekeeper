import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useUserRoles } from "@/hooks/use-user-roles";

export type ContractorDisputeStatus = 'pending_review' | 'upheld' | 'rejected' | 'partially_accepted';
export type ContractorDisputeType = 'liability_denial' | 'evidence_dispute' | 'procedural_issue' | 'other';

export interface ContractorDispute {
  id: string;
  incident_id: string;
  tenant_id: string;
  contractor_id: string | null;
  submitted_by: string | null;
  submitted_at: string;
  dispute_type: string;
  dispute_reason: string;
  evidence_attachments: string[];
  status: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  decision: string | null;
  decision_notes: string | null;
}

export interface SubmitContractorDisputeInput {
  incidentId: string;
  contractorId?: string;
  disputeType: ContractorDisputeType;
  disputeReason: string;
  evidenceAttachments?: string[];
}

export interface ResolveContractorDisputeInput {
  disputeId: string;
  decision: ContractorDisputeStatus;
  decisionNotes: string;
}

// Check if user can submit contractor dispute
export function useCanSubmitContractorDispute() {
  const { user } = useAuth();
  const { hasRole } = useUserRoles();

  return useQuery({
    queryKey: ['can-submit-contractor-dispute', user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      return hasRole('contractor_controller') || hasRole('contractor_representative');
    },
    enabled: !!user?.id,
  });
}

// Check if user can review contractor disputes
export function useCanReviewContractorDispute() {
  const { user, isAdmin } = useAuth();
  const { hasRole } = useUserRoles();

  return useQuery({
    queryKey: ['can-review-contractor-dispute', user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      return isAdmin || hasRole('hsse_manager') || hasRole('hsse_officer');
    },
    enabled: !!user?.id,
  });
}

// Get contractor disputes for an incident
export function useContractorDisputes(incidentId: string | null) {
  return useQuery({
    queryKey: ['contractor-disputes', incidentId],
    queryFn: async () => {
      if (!incidentId) return [];

      const { data, error } = await supabase
        .from('contractor_disputes')
        .select(`
          *,
          submitted_by_profile:profiles!contractor_disputes_submitted_by_fkey(full_name),
          reviewed_by_profile:profiles!contractor_disputes_reviewed_by_fkey(full_name),
          contractor:contractors(company_name)
        `)
        .eq('incident_id', incidentId)
        .is('deleted_at', null)
        .order('submitted_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!incidentId,
  });
}

// Get all pending contractor disputes (for arbitration queue)
export function usePendingContractorDisputes() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['pending-contractor-disputes'],
    queryFn: async () => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user?.id)
        .single();

      if (!profile?.tenant_id) return [];

      const { data, error } = await supabase
        .from('contractor_disputes')
        .select(`
          *,
          incident:incidents(reference_id, title),
          submitted_by_profile:profiles!contractor_disputes_submitted_by_fkey(full_name),
          contractor:contractors(company_name)
        `)
        .eq('tenant_id', profile.tenant_id)
        .eq('status', 'pending_review')
        .is('deleted_at', null)
        .order('submitted_at', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });
}

// Submit contractor dispute
export function useSubmitContractorDispute() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: SubmitContractorDisputeInput) => {
      const { incidentId, contractorId, disputeType, disputeReason, evidenceAttachments } = input;

      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user?.id)
        .single();

      if (!profile?.tenant_id) throw new Error('No tenant found');

      // Insert dispute
      const { data: dispute, error } = await supabase
        .from('contractor_disputes')
        .insert({
          incident_id: incidentId,
          tenant_id: profile.tenant_id,
          contractor_id: contractorId || null,
          submitted_by: user?.id,
          dispute_type: disputeType,
          dispute_reason: disputeReason,
          evidence_attachments: evidenceAttachments || [],
          status: 'pending_review',
        })
        .select()
        .single();

      if (error) throw error;

      // Update incident to flag contractor dispute
      await supabase
        .from('incidents')
        .update({
          contractor_disputes_violation: true,
          contractor_dispute_submitted_at: new Date().toISOString(),
          contractor_dispute_reason: disputeReason,
          contractor_dispute_evidence: evidenceAttachments || [],
          contractor_dispute_status: 'pending_review',
        })
        .eq('id', incidentId);

      // Log audit entry
      await supabase.from('incident_audit_logs').insert({
        incident_id: incidentId,
        tenant_id: profile.tenant_id,
        actor_id: user?.id,
        action: 'contractor_dispute_submitted',
        details: { disputeType, disputeReason },
      });

      // Notify HSSE team
      try {
        await supabase.functions.invoke('send-workflow-notification', {
          body: { incidentId, action: 'contractor_dispute_submitted', disputeType, disputeReason },
        });
      } catch (e) {
        console.error('Failed to send notification:', e);
      }

      return { disputeId: dispute.id };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contractor-disputes'] });
      queryClient.invalidateQueries({ queryKey: ['pending-contractor-disputes'] });
      queryClient.invalidateQueries({ queryKey: ['incidents'] });

      toast({
        title: 'Dispute Submitted',
        description: 'Your dispute has been submitted for HSSE review.',
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

// Resolve contractor dispute
export function useResolveContractorDispute() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: ResolveContractorDisputeInput) => {
      const { disputeId, decision, decisionNotes } = input;

      // Get dispute details
      const { data: dispute } = await supabase
        .from('contractor_disputes')
        .select('incident_id, tenant_id')
        .eq('id', disputeId)
        .single();

      if (!dispute) throw new Error('Dispute not found');

      // Update dispute
      const { error } = await supabase
        .from('contractor_disputes')
        .update({
          status: decision,
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
          decision,
          decision_notes: decisionNotes,
        })
        .eq('id', disputeId);

      if (error) throw error;

      // Update incident
      await supabase
        .from('incidents')
        .update({
          contractor_dispute_status: decision,
          contractor_dispute_reviewed_by: user?.id,
          contractor_dispute_decision_notes: decisionNotes,
          contractor_dispute_resolved_at: new Date().toISOString(),
        })
        .eq('id', dispute.incident_id);

      // Log audit entry
      await supabase.from('incident_audit_logs').insert({
        incident_id: dispute.incident_id,
        tenant_id: dispute.tenant_id,
        actor_id: user?.id,
        action: `contractor_dispute_${decision}`,
        details: { decision, decisionNotes },
      });

      // Send notification
      try {
        await supabase.functions.invoke('send-workflow-notification', {
          body: { incidentId: dispute.incident_id, action: `contractor_dispute_${decision}`, decisionNotes },
        });
      } catch (e) {
        console.error('Failed to send notification:', e);
      }

      return { disputeId, decision };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['contractor-disputes'] });
      queryClient.invalidateQueries({ queryKey: ['pending-contractor-disputes'] });
      queryClient.invalidateQueries({ queryKey: ['incidents'] });

      const messages: Record<ContractorDisputeStatus, string> = {
        upheld: 'Dispute upheld. Contractor liability removed.',
        rejected: 'Dispute rejected. Original finding stands.',
        partially_accepted: 'Dispute partially accepted. Finding modified.',
        pending_review: 'Dispute status updated.',
      };

      toast({
        title: 'Dispute Resolved',
        description: messages[data.decision as ContractorDisputeStatus],
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
