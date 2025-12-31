import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

export type DeptRepIncidentDecision = 'approved' | 'rejected';

interface DeptRepIncidentReviewInput {
  incidentId: string;
  decision: DeptRepIncidentDecision;
  justification: string; // MANDATORY - must be at least 10 characters
}

// Hook to check if user can review an incident as Dept Rep (read-only review with approve/reject)
export function useCanReviewDeptRepIncident(incidentId: string | null) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['can-review-dept-rep-incident', user?.id, incidentId],
    queryFn: async () => {
      if (!user?.id || !incidentId) return false;
      
      const { data, error } = await supabase
        .rpc('can_review_dept_rep_incident', {
          _user_id: user.id,
          _incident_id: incidentId
        });
      
      if (error) {
        console.error('Error checking dept rep incident review permission:', error);
        return false;
      }
      
      return data as boolean;
    },
    enabled: !!user?.id && !!incidentId,
  });
}

// Hook for department representative incident review (approve/reject only, no modifications)
export function useDeptRepIncidentReview() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (input: DeptRepIncidentReviewInput) => {
      const { incidentId, decision, justification } = input;
      
      if (!user?.id) {
        throw new Error('User not authenticated');
      }
      
      // Validate justification length
      if (!justification || justification.trim().length < 10) {
        throw new Error('Justification is required and must be at least 10 characters.');
      }
      
      // Use the server-side function to process the decision
      const { data, error } = await supabase
        .rpc('process_dept_rep_incident_decision', {
          _incident_id: incidentId,
          _user_id: user.id,
          _decision: decision,
          _justification: justification.trim()
        });
      
      if (error) throw error;
      
      const result = data as { success: boolean; error?: string; new_status?: string };
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to process decision');
      }
      
      // Send notification
      try {
        await supabase.functions.invoke('send-workflow-notification', {
          body: { 
            incidentId, 
            action: `dept_rep_incident_${decision}`, 
            justification,
            newStatus: result.new_status
          },
        });
      } catch (e) {
        console.error('Failed to send notification:', e);
      }
      
      return { incidentId, newStatus: result.new_status, decision };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      queryClient.invalidateQueries({ queryKey: ['incident'] });
      queryClient.invalidateQueries({ queryKey: ['pending-dept-rep-reviews'] });
      
      toast({
        title: result.decision === 'approved' 
          ? "Incident Approved" 
          : "Incident Rejected",
        description: result.decision === 'approved'
          ? "Incident forwarded to Department Manager for final approval"
          : "Incident escalated to HSSE Manager for review",
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

// Hook to get incidents pending Dept Rep review
export function usePendingDeptRepIncidentReviews() {
  const { user, profile } = useAuth();
  
  return useQuery({
    queryKey: ['pending-dept-rep-reviews', user?.id, profile?.tenant_id],
    queryFn: async () => {
      if (!user?.id || !profile?.tenant_id) return [];
      
      // Get user's department
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('assigned_department_id')
        .eq('id', user.id)
        .single();
      
      if (!userProfile?.assigned_department_id) return [];
      
      // Check if user has dept rep role
      const { data: hasDeptRepRole } = await supabase
        .rpc('has_role_by_code', {
          p_user_id: user.id,
          p_role_code: 'department_representative'
        });
      
      if (!hasDeptRepRole) return [];
      
      // Get incidents from user's department that are pending dept rep incident review
      // Note: status filter uses string since type may not include new status yet
      const { data, error } = await supabase
        .from('incidents')
        .select(`
          id, reference_id, title, description, event_type, subtype,
          severity, severity_v2, status, occurred_at, created_at,
          reporter:profiles!incidents_reporter_id_fkey(id, full_name)
        `)
        .eq('tenant_id', profile.tenant_id)
        .filter('status', 'eq', 'pending_dept_rep_incident_review')
        .is('deleted_at', null)
        .order('created_at', { ascending: true });
      
      if (error) {
        console.error('Error fetching pending dept rep reviews:', error);
        return [];
      }
      
      // Filter by department (using reporter's department)
      const filteredData = [];
      for (const incident of data || []) {
        if (incident.reporter) {
          const reporterId = (incident.reporter as { id: string }).id;
          const { data: reporterProfile } = await supabase
            .from('profiles')
            .select('assigned_department_id')
            .eq('id', reporterId)
            .single();
          
          if (reporterProfile?.assigned_department_id === userProfile.assigned_department_id) {
            filteredData.push(incident);
          }
        }
      }
      
      return filteredData;
    },
    enabled: !!user?.id && !!profile?.tenant_id,
  });
}
