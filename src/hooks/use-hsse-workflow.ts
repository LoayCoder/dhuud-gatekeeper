import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { logger } from "@/lib/logger";
import { type SeverityLevelV2 } from "@/lib/hsse-severity-levels";

// C15: Helper to check if user is a contractor consultant (blocked from severity/close/approve)
async function isContractorConsultant(userId: string): Promise<boolean> {
  const { data } = await supabase
    .rpc('has_contractor_consultant_access', { p_user_id: userId });
  return data === true;
}

export type ExpertRecommendation = 'investigate' | 'no_investigation' | 'return' | 'reject' | 'assign_actions';
export type ManagerDecision = 'approved' | 'rejected' | 'reject_severity_approve_investigation';
export type HSSEManagerDecision = 'override' | 'maintain';
export type DeptRepDecision = 'approve' | 'escalate';

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
  // For severity change
  newSeverity?: SeverityLevelV2;
}

interface DeptRepApprovalInput {
  incidentId: string;
  decision: DeptRepDecision;
  notes?: string;
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
  action: 'resubmit' | 'resubmit_to_expert' | 'confirm_rejection' | 'dispute_rejection';
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
      const {
        incidentId,
        recommendation,
        notes,
        returnReason,
        returnInstructions,
        rejectionReason,
        noInvestigationJustification,
        newSeverity
      } = input;

      let newStatus: string;
      const updateData: Record<string, unknown> = {
        expert_screened_by: user?.id,
        expert_screened_at: new Date().toISOString(),
        expert_screening_notes: notes,
        expert_recommendation: recommendation,
      };

      // If severity is updated during screening
      if (newSeverity) {
        updateData.severity_v2 = newSeverity;
      }

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
          // C4: Route to Dept Manager approval gate instead of directly closing
          newStatus = 'pending_no_investigation_approval';
          updateData.no_investigation_justification = noInvestigationJustification;
          break;
        case 'assign_actions':
          // For observations - send to department representative for action assignment
          const { data: deptManagerId } = await supabase
            .rpc('get_incident_department_manager', { p_incident_id: incidentId });

          newStatus = 'pending_dept_rep_approval';
          updateData.approval_manager_id = deptManagerId;
          break;
        case 'investigate':
          // Get department manager
          const { data: managerId } = await supabase
            .rpc('get_incident_department_manager', { p_incident_id: incidentId });

          // Check if severity was changed (either now or previously)
          const { data: currentIncident } = await supabase
            .from('incidents')
            .select('severity_v2, original_severity_v2')
            .eq('id', incidentId)
            .single();

          // Determine effective severity to check against original
          const effectiveSeverity = newSeverity || currentIncident?.severity_v2;
          const originalSeverity = currentIncident?.original_severity_v2;

          const severityChanged = originalSeverity && effectiveSeverity !== originalSeverity;

          if (severityChanged) {
            // Severity was modified — route to Dept Manager for approval
            newStatus = 'pending_manager_approval';
            updateData.severity_pending_approval = true;
          } else {
            // No severity change — check RPC logic or standard flow
            // Ideally we should move to 'investigation_pending' (ready for assignment) 
            // BUT existing logic used 'pending_manager_approval'. 
            // To be safe and compliant with "Approval" requirement for high severity:
            // We will route to 'pending_manager_approval' as before.
            newStatus = 'pending_manager_approval';
          }
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

      // C9: Expanded severity audit trail with original/proposed/final
      const auditDetails: { [key: string]: string | number | boolean | null | undefined } = {
        recommendation,
        notes,
        returnReason,
        rejectionReason,
        noInvestigationJustification,
      };
      if (newSeverity) {
        const { data: auditIncident } = await supabase
          .from('incidents')
          .select('severity_v2, original_severity_v2')
          .eq('id', incidentId)
          .single();
        auditDetails.original_severity_v2 = auditIncident?.original_severity_v2 || auditIncident?.severity_v2;
        auditDetails.proposed_severity_v2 = newSeverity;
        auditDetails.final_severity_v2 = newSeverity;
      }

      await supabase.from('incident_audit_logs').insert({
        incident_id: incidentId,
        tenant_id: profile?.tenant_id,
        actor_id: user?.id,
        action: `expert_screening_${recommendation}`,
        details: auditDetails as any,
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
          // Increment resubmission count and set back to submitted (for dept rep returns)
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
        case 'resubmit_to_expert': {
          // C5: Resubmit after expert rejection — routes back to expert screening, max 3
          const { data: expertIncident } = await supabase
            .from('incidents')
            .select('expert_resubmission_count')
            .eq('id', incidentId)
            .single();

          const currentCount = (expertIncident as any)?.expert_resubmission_count || 0;
          if (currentCount >= 3) {
            throw new Error('Maximum expert resubmissions (3) exceeded. Please submit a new report.');
          }

          newStatus = 'pending_expert_screening';
          updateData = {
            status: newStatus,
            expert_resubmission_count: currentCount + 1,
            expert_rejected_by: null,
            expert_rejected_at: null,
            expert_rejection_reason: null,
          };
          break;
        }
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
        resubmit_to_expert: "Event resubmitted to HSSE Expert for re-screening",
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
      } else if (decision === 'reject_severity_approve_investigation') {
        // C6: Manager rejects the proposed severity but approves investigation at original severity
        const { data: origIncident } = await supabase
          .from('incidents')
          .select('original_severity_v2')
          .eq('id', incidentId)
          .single();

        newStatus = 'investigation_pending';
        updateData.severity_v2 = origIncident?.original_severity_v2; // Revert to original
        updateData.severity_pending_approval = false;
        updateData.manager_severity_override = true;
        updateData.manager_severity_override_reason = rejectionReason;
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

  return useMutation({
    mutationFn: async ({ incidentId, investigatorId, assignmentNotes }: {
      incidentId: string;
      investigatorId: string;
      assignmentNotes?: string;
    }) => {
      // Get fresh user from Supabase auth (avoids stale closure issue)
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) throw new Error('Not authenticated');

      // Get tenant_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
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
          assigned_by: user.id,
          assignment_notes: assignmentNotes || null,
        }, {
          onConflict: 'incident_id',
        });

      if (investigationError) throw investigationError;

      // Log audit entry
      await supabase.from('incident_audit_logs').insert({
        incident_id: incidentId,
        tenant_id: profile.tenant_id,
        actor_id: user.id,
        action: 'investigator_assigned',
        details: { investigatorId, assignmentNotes },
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

// Hook to check if user can approve as department representative
// Uses dual authorization: role-based (department_representative role) OR hierarchy-based (approval_manager_id)
export function useCanApproveDeptRep(incidentId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['can-approve-dept-rep', user?.id, incidentId],
    queryFn: async () => {
      if (!user?.id || !incidentId) return false;

      // Use the RPC function that checks both role and manager status
      const { data, error } = await supabase
        .rpc('can_approve_dept_rep_observation', {
          _user_id: user.id,
          _incident_id: incidentId
        });

      if (error) {
        console.error('Error checking dept rep permission:', error);
        return false;
      }

      return data as boolean;
    },
    enabled: !!user?.id && !!incidentId,
  });
}

// Hook for department representative approval/escalation
export function useDeptRepApproval() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: DeptRepApprovalInput) => {
      const { incidentId, decision, notes } = input;

      let newStatus: string;
      const updateData: Record<string, unknown> = {
        dept_rep_approved_by: user?.id,
        dept_rep_approved_at: new Date().toISOString(),
        dept_rep_notes: notes,
      };

      // Get tenant_id first
      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user?.id)
        .single();

      if (decision === 'approve') {
        // Release all corrective actions linked to this incident
        const { data: releasedActions, error: releaseError } = await supabase
          .from('corrective_actions')
          .update({
            released_at: new Date().toISOString()
          })
          .eq('incident_id', incidentId)
          .is('deleted_at', null)
          .is('released_at', null)
          .select('id, title, assigned_to, priority, due_date');

        // Determine status based on whether there are actions
        if (releasedActions && releasedActions.length > 0) {
          // Has actions: set to pending status, will auto-close when all verified
          newStatus = 'observation_actions_pending';
          logger.debug(`Released ${releasedActions.length} corrective actions for incident ${incidentId}`);

          // Log action release audit entry
          await supabase.from('incident_audit_logs').insert({
            incident_id: incidentId,
            tenant_id: profile?.tenant_id,
            actor_id: user?.id,
            action: 'actions_released',
            details: {
              released_count: releasedActions.length,
              action_ids: releasedActions.map(a => a.id),
              released_by_dept_rep: true
            },
          });

          // Send notifications to action assignees
          try {
            await supabase.functions.invoke('send-action-notifications', {
              body: {
                incidentId,
                action: 'actions_released',
                actions: releasedActions,
              },
            });
          } catch (e) {
            console.error('Failed to send action notifications:', e);
          }
        } else if (releaseError) {
          console.error('Failed to release actions:', releaseError);
          // No actions found due to error, still close
          newStatus = 'closed';
        } else {
          // No actions: close immediately
          newStatus = 'closed';
        }
      } else {
        // Escalate to HSSE Expert for review (not Manager)
        // The HSSE Expert will decide: Reject, Accept as Observation, or Upgrade to Incident
        newStatus = 'pending_hsse_escalation_review';
      }

      updateData.status = newStatus;

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
        action: `dept_rep_${decision}`,
        details: { decision, notes },
      });

      // Send notification
      try {
        await supabase.functions.invoke('send-workflow-notification', {
          body: { incidentId, action: `dept_rep_${decision}`, notes },
        });
      } catch (e) {
        console.error('Failed to send notification:', e);
      }

      return { incidentId, newStatus };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      queryClient.invalidateQueries({ queryKey: ['incident'] });
      queryClient.invalidateQueries({ queryKey: ['corrective-actions'] });
      queryClient.invalidateQueries({ queryKey: ['my-inspection-actions'] });

      toast({
        title: variables.decision === 'approve' ? "Observation Approved" : "Escalation Requested",
        description: variables.decision === 'approve'
          ? "Actions released to assignees. Observation will close when all actions are verified."
          : "Observation has been sent to HSSE Expert for escalation review",
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
