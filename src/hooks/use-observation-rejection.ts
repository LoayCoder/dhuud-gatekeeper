import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

export type HSSERejectionDecision = 'approve_rejection' | 'reject_rejection';

interface DeptRepRejectInput {
  incidentId: string;
  rejectionReason: string;
}

interface HSSERejectionReviewInput {
  incidentId: string;
  decision: HSSERejectionDecision;
  notes?: string;
}

// Hook to count corrective actions for an incident
export function useCorrectiveActionsCount(incidentId: string | null) {
  return useQuery({
    queryKey: ['corrective-actions-count', incidentId],
    queryFn: async () => {
      if (!incidentId) return 0;
      
      const { count, error } = await supabase
        .from('corrective_actions')
        .select('*', { count: 'exact', head: true })
        .eq('incident_id', incidentId)
        .is('deleted_at', null);
      
      if (error) {
        console.error('Error counting corrective actions:', error);
        return 0;
      }
      
      return count || 0;
    },
    enabled: !!incidentId,
  });
}

// Hook to validate if dept rep can approve (backend validation)
export function useValidateDeptRepApproval(incidentId: string | null) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['validate-dept-rep-approval', incidentId, user?.id],
    queryFn: async () => {
      if (!incidentId || !user?.id) return { valid: false, error: 'Missing data' };
      
      const { data, error } = await supabase
        .rpc('validate_dept_rep_observation_approval', {
          p_incident_id: incidentId,
          p_user_id: user.id,
        });
      
      if (error) {
        console.error('Error validating dept rep approval:', error);
        return { valid: false, error: error.message };
      }
      
      return data as { valid: boolean; error?: string; action_count?: number };
    },
    enabled: !!incidentId && !!user?.id,
  });
}

// Hook for department representative to reject observation
export function useDeptRepRejectObservation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (input: DeptRepRejectInput) => {
      const { incidentId, rejectionReason } = input;
      
      if (!user?.id) throw new Error('Not authenticated');
      
      // Call RPC function that handles all validation and updates
      const { data, error } = await supabase
        .rpc('dept_rep_reject_observation', {
          p_incident_id: incidentId,
          p_user_id: user.id,
          p_rejection_reason: rejectionReason,
        });
      
      if (error) throw error;
      
      const result = data as { success: boolean; error?: string };
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to reject observation');
      }
      
      // Send notification to HSSE Expert
      try {
        await supabase.functions.invoke('send-workflow-notification', {
          body: { 
            incidentId, 
            action: 'dept_rep_reject_observation',
            rejectionReason,
          },
        });
      } catch (e) {
        console.error('Failed to send notification:', e);
      }
      
      return { incidentId, newStatus: 'pending_hsse_rejection_review' };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      queryClient.invalidateQueries({ queryKey: ['incident'] });
      
      toast({
        title: "Observation Rejected",
        description: "The observation has been sent to HSSE Expert for review.",
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

// Hook to check if user can review HSSE rejection
export function useCanReviewHSSERejection(incidentId: string | null) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['can-review-hsse-rejection', user?.id, incidentId],
    queryFn: async () => {
      if (!user?.id || !incidentId) return false;
      
      const { data, error } = await supabase
        .rpc('can_review_hsse_rejection', {
          p_user_id: user.id,
          p_incident_id: incidentId,
        });
      
      if (error) {
        console.error('Error checking HSSE rejection review permission:', error);
        return false;
      }
      
      return data as boolean;
    },
    enabled: !!user?.id && !!incidentId,
  });
}

// Hook for HSSE Expert to review rejection
export function useHSSERejectionReview() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (input: HSSERejectionReviewInput) => {
      const { incidentId, decision, notes } = input;
      
      if (!user?.id) throw new Error('Not authenticated');
      
      // Call RPC function that handles all validation and updates
      const { data, error } = await supabase
        .rpc('hsse_review_rejection', {
          p_incident_id: incidentId,
          p_user_id: user.id,
          p_decision: decision,
          p_notes: notes || null,
        });
      
      if (error) throw error;
      
      const result = data as { success: boolean; error?: string; new_status?: string };
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to review rejection');
      }
      
      // Send notification
      try {
        await supabase.functions.invoke('send-workflow-notification', {
          body: { 
            incidentId, 
            action: decision === 'approve_rejection' 
              ? 'hsse_approve_rejection' 
              : 'hsse_reject_rejection',
            notes,
          },
        });
      } catch (e) {
        console.error('Failed to send notification:', e);
      }
      
      return { incidentId, newStatus: result.new_status };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      queryClient.invalidateQueries({ queryKey: ['incident'] });
      
      const isApproved = variables.decision === 'approve_rejection';
      toast({
        title: isApproved ? "Rejection Approved" : "Rejection Returned",
        description: isApproved
          ? "The observation has been closed as rejected."
          : "The observation has been returned to the Department Representative for action.",
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
