import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

export type ExpertRecommendation = 'investigate' | 'no_investigation' | 'return' | 'reject';
export type ManagerDecision = 'approved' | 'rejected';
export type HSSEManagerDecision = 'override' | 'maintain';

interface ExpertScreeningInput {
  incidentId: string;
  recommendation: ExpertRecommendation;
  notes?: string;
  // For return to reporter
  returnReason?: string;
  returnInstructions?: string;
  // For rejection
  rejectionReason?: string;
  // For no investigation
  noInvestigationJustification?: string;
}

interface ManagerApprovalInput {
  incidentId: string;
  decision: ManagerDecision;
  rejectionReason?: string;
}

interface HSSEManagerEscalationInput {
  incidentId: string;
  decision: HSSEManagerDecision;
  justification: string;
}

interface ReporterResponseInput {
  incidentId: string;
  action: 'resubmit' | 'confirm_rejection' | 'dispute_rejection';
  disputeNotes?: string;
}

// Hook to check if user can perform expert screening
export function useCanPerformExpertScreening() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['can-perform-expert-screening', user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      
      const { data, error } = await supabase
        .rpc('can_perform_expert_screening', { _user_id: user.id });
      
      if (error) {
        console.error('Error checking expert screening permission:', error);
        return false;
      }
      
      return data as boolean;
    },
    enabled: !!user?.id,
  });
}

// Hook to check if user can approve investigation for a specific incident
export function useCanApproveInvestigation(incidentId: string | null) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['can-approve-investigation', user?.id, incidentId],
    queryFn: async () => {
      if (!user?.id || !incidentId) return false;
      
      const { data, error } = await supabase
        .rpc('can_approve_investigation', { 
          _user_id: user.id,
          _incident_id: incidentId 
        });
      
      if (error) {
        console.error('Error checking investigation approval permission:', error);
        return false;
      }
      
      return data as boolean;
    },
    enabled: !!user?.id && !!incidentId,
  });
}

// Hook to get department manager for an incident
export function useIncidentDepartmentManager(incidentId: string | null) {
  return useQuery({
    queryKey: ['incident-department-manager', incidentId],
    queryFn: async () => {
      if (!incidentId) return null;
      
      const { data, error } = await supabase
        .rpc('get_incident_department_manager', { p_incident_id: incidentId });
      
      if (error) {
        console.error('Error getting department manager:', error);
        return null;
      }
      
      if (!data) return null;
      
      // Get manager profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, full_name, job_title')
        .eq('id', data)
        .single();
      
      return profile;
    },
    enabled: !!incidentId,
  });
}

// Hook for HSSE Expert screening actions
export function useExpertScreening() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (input: ExpertScreeningInput) => {
      const { incidentId, recommendation, notes, returnReason, returnInstructions, rejectionReason, noInvestigationJustification } = input;
      
      let newStatus: string;
      const updateData: Record<string, unknown> = {
        expert_screened_by: user?.id,
        expert_screened_at: new Date().toISOString(),
        expert_screening_notes: notes,
        expert_recommendation: recommendation,
      };
      
      switch (recommendation) {
        case 'return':
          newStatus = 'returned_to_reporter';
          updateData.returned_by = user?.id;
          updateData.returned_at = new Date().toISOString();
          updateData.return_reason = returnReason;
          updateData.return_instructions = returnInstructions;
          break;
        case 'reject':
          newStatus = 'expert_rejected';
          updateData.expert_rejected_by = user?.id;
          updateData.expert_rejected_at = new Date().toISOString();
          updateData.expert_rejection_reason = rejectionReason;
          break;
        case 'no_investigation':
          newStatus = 'no_investigation_required';
          updateData.no_investigation_justification = noInvestigationJustification;
          break;
        case 'investigate':
          // Get department manager and set pending approval
          const { data: managerId } = await supabase
            .rpc('get_incident_department_manager', { p_incident_id: incidentId });
          
          newStatus = 'pending_manager_approval';
          updateData.approval_manager_id = managerId;
          break;
        default:
          throw new Error('Invalid recommendation');
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
        action: `expert_screening_${recommendation}`,
        details: { recommendation, notes, returnReason, rejectionReason, noInvestigationJustification },
      });
      
      // Send notification email
      try {
        await supabase.functions.invoke('send-workflow-notification', {
          body: { 
            incidentId, 
            action: `expert_${recommendation}`,
            notes,
            returnReason,
            returnInstructions,
            rejectionReason,
          },
        });
      } catch (e) {
        console.error('Failed to send notification:', e);
      }
      
      return { incidentId, newStatus };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      queryClient.invalidateQueries({ queryKey: ['incident'] });
      toast({
        title: "Screening complete",
        description: "The event has been processed.",
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

// Hook for reporter response (resubmit, confirm rejection, dispute)
export function useReporterResponse() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (input: ReporterResponseInput) => {
      const { incidentId, action, disputeNotes } = input;
      
      let updateData: Record<string, unknown> = {};
      let newStatus: string;
      
      switch (action) {
        case 'resubmit':
          // Increment resubmission count and set back to submitted
          const { data: incident } = await supabase
            .from('incidents')
            .select('resubmission_count')
            .eq('id', incidentId)
            .single();
          
          newStatus = 'submitted';
          updateData = {
            status: newStatus,
            resubmission_count: (incident?.resubmission_count || 0) + 1,
            returned_by: null,
            returned_at: null,
            return_reason: null,
            return_instructions: null,
          };
          break;
        case 'confirm_rejection':
          newStatus = 'closed';
          updateData = {
            status: newStatus,
            reporter_rejection_confirmed_at: new Date().toISOString(),
          };
          break;
        case 'dispute_rejection':
          newStatus = 'hsse_manager_escalation';
          updateData = {
            status: newStatus,
            reporter_disputes_rejection: true,
            reporter_dispute_notes: disputeNotes,
            escalated_to_hsse_manager_at: new Date().toISOString(),
          };
          break;
        default:
          throw new Error('Invalid action');
      }
      
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
        action: `reporter_${action}`,
        details: { disputeNotes },
      });
      
      // Send notification
      try {
        await supabase.functions.invoke('send-workflow-notification', {
          body: { incidentId, action: `reporter_${action}`, disputeNotes },
        });
      } catch (e) {
        console.error('Failed to send notification:', e);
      }
      
      return { incidentId, newStatus };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      queryClient.invalidateQueries({ queryKey: ['incident'] });
      
      const messages: Record<string, string> = {
        resubmit: "Event resubmitted for review",
        confirm_rejection: "Rejection confirmed, event closed",
        dispute_rejection: "Dispute submitted to HSSE Manager",
      };
      
      toast({
        title: "Success",
        description: messages[variables.action],
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

// Hook for manager approval/rejection
export function useManagerApproval() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (input: ManagerApprovalInput) => {
      const { incidentId, decision, rejectionReason } = input;
      
      let newStatus: string;
      const updateData: Record<string, unknown> = {
        manager_decision: decision,
        manager_decision_at: new Date().toISOString(),
      };
      
      if (decision === 'approved') {
        newStatus = 'investigation_pending';
      } else {
        newStatus = 'hsse_manager_escalation';
        updateData.manager_rejection_reason = rejectionReason;
        updateData.escalated_to_hsse_manager_at = new Date().toISOString();
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
        action: `manager_${decision}`,
        details: { decision, rejectionReason },
      });
      
      // Send notification
      try {
        await supabase.functions.invoke('send-workflow-notification', {
          body: { incidentId, action: `manager_${decision}`, rejectionReason },
        });
      } catch (e) {
        console.error('Failed to send notification:', e);
      }
      
      return { incidentId, newStatus };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      queryClient.invalidateQueries({ queryKey: ['incident'] });
      
      toast({
        title: variables.decision === 'approved' ? "Investigation Approved" : "Investigation Rejected",
        description: variables.decision === 'approved' 
          ? "HSSE Expert can now assign an investigator"
          : "Escalated to HSSE Manager for review",
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

// Hook for HSSE Manager escalation decisions
export function useHSSEManagerEscalation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (input: HSSEManagerEscalationInput) => {
      const { incidentId, decision, justification } = input;
      
      let newStatus: string;
      const updateData: Record<string, unknown> = {
        hsse_manager_decision: decision,
        hsse_manager_decision_by: user?.id,
        hsse_manager_justification: justification,
      };
      
      if (decision === 'override') {
        // Override rejection - proceed with investigation
        newStatus = 'investigation_pending';
        updateData.manager_decision = 'approved';
      } else {
        // Maintain rejection - close the incident
        newStatus = 'closed';
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
        action: `hsse_manager_${decision}`,
        details: { decision, justification },
      });
      
      // Send notification
      try {
        await supabase.functions.invoke('send-workflow-notification', {
          body: { incidentId, action: `hsse_manager_${decision}`, justification },
        });
      } catch (e) {
        console.error('Failed to send notification:', e);
      }
      
      return { incidentId, newStatus };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      queryClient.invalidateQueries({ queryKey: ['incident'] });
      
      toast({
        title: variables.decision === 'override' ? "Rejection Overridden" : "Rejection Maintained",
        description: variables.decision === 'override'
          ? "Investigation will proceed"
          : "Event has been closed",
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

// Hook to start investigation (HSSE Expert assigns investigator)
export function useStartInvestigation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async ({ incidentId, investigatorId }: { incidentId: string; investigatorId: string }) => {
      // Get tenant_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user?.id)
        .single();
      
      if (!profile?.tenant_id) throw new Error('No tenant found');
      
      // Update incident status
      const { error: incidentError } = await supabase
        .from('incidents')
        .update({ status: 'investigation_in_progress' })
        .eq('id', incidentId);
      
      if (incidentError) throw incidentError;
      
      // Create or update investigation record
      const { error: investigationError } = await supabase
        .from('investigations')
        .upsert({
          incident_id: incidentId,
          tenant_id: profile.tenant_id,
          investigator_id: investigatorId,
          assigned_at: new Date().toISOString(),
          assigned_by: user?.id,
        }, {
          onConflict: 'incident_id',
        });
      
      if (investigationError) throw investigationError;
      
      // Log audit entry
      await supabase.from('incident_audit_logs').insert({
        incident_id: incidentId,
        tenant_id: profile.tenant_id,
        actor_id: user?.id,
        action: 'investigator_assigned',
        details: { investigatorId },
      });
      
      // Send notification to investigator
      try {
        await supabase.functions.invoke('send-workflow-notification', {
          body: { incidentId, action: 'investigator_assigned', investigatorId },
        });
      } catch (e) {
        console.error('Failed to send notification:', e);
      }
      
      return { incidentId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      queryClient.invalidateQueries({ queryKey: ['incident'] });
      queryClient.invalidateQueries({ queryKey: ['investigation'] });
      
      toast({
        title: "Investigation Started",
        description: "Investigator has been assigned and notified.",
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
