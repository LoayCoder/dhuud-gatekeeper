import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";

export type DeptManagerDecision = 'approved' | 'rejected';

interface DeptManagerApprovalInput {
  incidentId: string;
  decision: DeptManagerDecision;
  notes?: string;
  updatedDescription?: string;
  updatedInitialActions?: string;
}

/**
 * Hook to check if user can approve an incident as Department Manager
 * For Level 3-5 incidents that have passed Dept Rep review
 */
export function useCanApproveDeptManager(incidentId: string | null) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['can-approve-dept-manager', user?.id, incidentId],
    queryFn: async () => {
      if (!user?.id || !incidentId) return false;
      
      const { data, error } = await supabase
        .rpc('can_review_as_dept_manager', {
          p_user_id: user.id,
          p_incident_id: incidentId
        });
      
      if (error) {
        console.error('Error checking dept manager permission:', error);
        return false;
      }
      
      return data as boolean;
    },
    enabled: !!user?.id && !!incidentId,
  });
}

/**
 * Hook for Department Manager to approve/reject Level 3-5 incidents
 * Manager can also update description and initial corrective actions
 */
export function useDeptManagerIncidentApproval() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const { t } = useTranslation();
  
  return useMutation({
    mutationFn: async (input: DeptManagerApprovalInput) => {
      const { incidentId, decision, notes, updatedDescription, updatedInitialActions } = input;
      
      if (!user?.id) {
        throw new Error('User not authenticated');
      }
      
      const { data, error } = await supabase
        .rpc('process_dept_manager_incident_approval', {
          _incident_id: incidentId,
          _user_id: user.id,
          _decision: decision,
          _notes: notes || null,
          _updated_description: updatedDescription || null,
          _updated_initial_actions: updatedInitialActions || null
        });
      
      if (error) throw error;
      
      const result = data as { success: boolean; error?: string; new_status?: string; routed_to_clinic?: boolean };
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to process decision');
      }
      
      // Send notification
      try {
        await supabase.functions.invoke('send-workflow-notification', {
          body: { 
            incidentId, 
            action: `dept_manager_${decision}`, 
            notes,
            newStatus: result.new_status,
            routedToClinic: result.routed_to_clinic
          },
        });
      } catch (e) {
        console.error('Failed to send notification:', e);
      }
      
      return { incidentId, newStatus: result.new_status, decision, routedToClinic: result.routed_to_clinic };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      queryClient.invalidateQueries({ queryKey: ['incident'] });
      queryClient.invalidateQueries({ queryKey: ['pending-dept-manager-reviews'] });
      
      const description = result.decision === 'approved'
        ? result.routedToClinic
          ? t('workflow.deptManager.approvedRoutedToClinic', 'Incident approved and routed to clinic for injury review')
          : t('workflow.deptManager.approvedRoutedToExpert', 'Incident approved and forwarded to HSSE Expert')
        : t('workflow.deptManager.rejected', 'Incident rejected and escalated to HSSE Manager');
      
      toast({
        title: result.decision === 'approved' 
          ? t('workflow.deptManager.approvedTitle', 'Incident Approved')
          : t('workflow.deptManager.rejectedTitle', 'Incident Rejected'),
        description,
      });
    },
    onError: (error) => {
      toast({
        title: t('common.error', 'Error'),
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

/**
 * C4: Hook to check if user can approve a "No Investigation" decision as Dept Manager
 */
export function useCanApproveNoInvestigation(incidentId: string | null) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['can-approve-no-investigation', user?.id, incidentId],
    queryFn: async () => {
      if (!user?.id || !incidentId) return false;
      
      // Check if incident is in the right status and user is dept manager
      const { data, error } = await supabase
        .rpc('can_review_as_dept_manager', {
          p_user_id: user.id,
          p_incident_id: incidentId
        });
      
      if (error) {
        console.error('[NoInvestigationApproval] Permission check error:', error);
        return false;
      }
      
      return data as boolean;
    },
    enabled: !!user?.id && !!incidentId,
    refetchOnMount: 'always',
  });
}

/**
 * C4: Hook for Dept Manager to approve/reject "No Investigation" decisions
 */
export function useNoInvestigationApproval() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const { t } = useTranslation();
  
  return useMutation({
    mutationFn: async (input: { incidentId: string; decision: 'approved' | 'rejected'; notes?: string }) => {
      const { incidentId, decision, notes } = input;
      
      if (!user?.id) throw new Error('User not authenticated');
      
      const newStatus = decision === 'approved' 
        ? 'no_investigation_required' 
        : 'pending_expert_screening';
      
      const updateData: Record<string, unknown> = {
        status: newStatus,
        updated_at: new Date().toISOString(),
      };
      
      if (decision === 'approved') {
        updateData.closed_at = new Date().toISOString();
        updateData.closed_by = user.id;
      }
      
      const { error } = await supabase
        .from('incidents')
        .update(updateData as any)
        .eq('id', incidentId);
      
      if (error) throw error;
      
      // Send notification
      try {
        await supabase.functions.invoke('send-workflow-notification', {
          body: { 
            incidentId, 
            action: `no_investigation_${decision}`, 
            notes,
            newStatus,
          },
        });
      } catch (e) {
        console.error('Failed to send notification:', e);
      }
      
      return { incidentId, newStatus, decision };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      queryClient.invalidateQueries({ queryKey: ['incident'] });
      
      toast({
        title: result.decision === 'approved'
          ? t('workflow.noInvestigationApproval.approvedTitle', 'Incident Closed')
          : t('workflow.noInvestigationApproval.rejectedTitle', 'Returned to Expert'),
        description: result.decision === 'approved'
          ? t('workflow.noInvestigationApproval.approvedDesc', 'Incident closed as no investigation required.')
          : t('workflow.noInvestigationApproval.rejectedDesc', 'Incident returned to HSSE Expert for re-screening.'),
      });
    },
    onError: (error) => {
      toast({
        title: t('common.error', 'Error'),
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

/**
 * Hook to get incidents pending Department Manager approval
 */
export function usePendingDeptManagerReviews() {
  const { user, profile } = useAuth();
  
  return useQuery({
    queryKey: ['pending-dept-manager-reviews', user?.id, profile?.tenant_id],
    queryFn: async () => {
      if (!user?.id || !profile?.tenant_id) return [];
      
      const { data, error } = await supabase
        .from('incidents')
        .select(`
          id, reference_id, title, description, event_type, subtype,
          severity, severity_v2, status, occurred_at, created_at,
          location, location_city,
          reporter:profiles!incidents_reporter_id_fkey(id, full_name),
          site:sites!incidents_site_id_fkey(id, name),
          branch:branches!incidents_branch_id_fkey(id, name)
        `)
        .eq('tenant_id', profile.tenant_id)
        .eq('status', 'pending_department_manager_approval')
        .is('deleted_at', null)
        .order('created_at', { ascending: true });
      
      if (error) {
        console.error('Error fetching pending dept manager reviews:', error);
        return [];
      }
      
      return data || [];
    },
    enabled: !!user?.id && !!profile?.tenant_id,
  });
}
