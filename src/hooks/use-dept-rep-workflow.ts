/**
 * Department Representative Workflow Hooks
 * Handles normal (non-contractor) observation workflow
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import type { Json } from '@/integrations/supabase/types';

interface RpcResponse {
  success: boolean;
  error?: string;
  message?: string;
  new_status?: string;
  action?: string;
  actions_released?: number;
}

// Helper to parse RPC response
function parseRpcResponse(data: Json): RpcResponse {
  if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
    return data as unknown as RpcResponse;
  }
  return { success: false, error: 'Invalid response' };
}

/**
 * Hook to check if user can review as department representative
 * Supports the new pending_dept_rep_review status
 */
export function useCanReviewAsDeptRep(incidentId: string | null) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['can-review-dept-rep', user?.id, incidentId],
    queryFn: async () => {
      if (!user?.id || !incidentId) return false;
      
      // Get incident status, site, and check if it's in dept rep review stage
      const { data: incident, error: incidentError } = await supabase
        .from('incidents')
        .select('status, department_id, site_id, approval_manager_id, event_type, related_contractor_company_id')
        .eq('id', incidentId)
        .single();
      
      if (incidentError || !incident) return false;
      
      // Only for observations in pending_dept_rep_review status (or legacy status)
      const validStatuses = ['pending_dept_rep_review', 'pending_dept_rep_approval'];
      if (!validStatuses.includes(incident.status)) return false;
      
      // Should not be a contractor observation
      if (incident.related_contractor_company_id) return false;
      
      // Check if user is the assigned approval manager (highest priority)
      if (incident.approval_manager_id === user.id) return true;
      
      // Check if user has super admin privileges
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('is_super_admin')
        .eq('id', user.id)
        .single();
      
      if (profileError || !profile) return false;
      
      // Super admin always can
      if (profile.is_super_admin) return true;
      
      // Use SITE-BASED permission check via RPC
      // This checks if user is the dept rep for the site's department
      if (incident.site_id && incident.department_id) {
        const { data: canReview, error: rpcError } = await supabase
          .rpc('can_review_as_site_dept_rep', {
            p_user_id: user.id,
            p_site_id: incident.site_id,
            p_department_id: incident.department_id
          });
        
        if (!rpcError && canReview) return true;
      }
      
      return false;
    },
    enabled: !!user?.id && !!incidentId,
  });
}

/**
 * Hook for department rep to acknowledge observation
 * Supports close-on-spot for Level 1-2 or escalate Level 3+
 */
export function useDeptRepAcknowledgeObservation() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({
      incidentId,
      notes,
      closeOnSpot,
      evidence,
    }: {
      incidentId: string;
      notes?: string;
      closeOnSpot?: boolean;
      evidence?: Json;
    }) => {
      const { data, error } = await supabase.rpc('dept_rep_acknowledge_observation', {
        p_incident_id: incidentId,
        p_notes: notes,
        p_close_on_spot: closeOnSpot || false,
        p_evidence: evidence || null,
      });
      if (error) throw error;
      const result = parseRpcResponse(data);
      if (!result.success) throw new Error(result.error || 'Failed to acknowledge observation');
      return result;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      queryClient.invalidateQueries({ queryKey: ['incident'] });
      queryClient.invalidateQueries({ queryKey: ['corrective-actions'] });
      
      const messages: Record<string, string> = {
        closed_on_spot: t('workflow.deptRep.closedOnSpot', 'Observation closed on spot with evidence'),
        escalated_to_hsse: t('workflow.deptRep.escalatedToHSSE', 'Escalated to HSSE Expert for review (Level 3+)'),
        default: t('workflow.deptRep.acknowledged', 'Observation acknowledged'),
      };
      
      toast.success(messages[data.action || 'default'] || messages.default);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}
