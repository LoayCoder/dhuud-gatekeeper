/**
 * HSSE Expert Enforcement Hooks
 * Handles final authority decisions by HSSE Expert
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
  decision?: string;
  is_final?: boolean;
}

// Helper to parse RPC response
function parseRpcResponse(data: Json): RpcResponse {
  if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
    return data as unknown as RpcResponse;
  }
  return { success: false, error: 'Invalid response' };
}

export type HSSEEnforcementDecision = 
  | 'approve'
  | 'reject'
  | 'return_to_consultant'
  | 'return_to_dept_rep';

/**
 * Hook to check if user can enforce HSSE decisions
 */
export function useCanEnforceHSSEDecision() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['can-enforce-hsse', user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('user_type, is_super_admin, job_title')
        .eq('id', user.id)
        .single();
      
      if (error) return false;
      
      // Check job title for HSSE roles
      const jobTitle = (data?.job_title || '').toLowerCase();
      const isHSSERole = jobTitle.includes('hsse') || 
                         jobTitle.includes('safety') ||
                         jobTitle.includes('expert') ||
                         jobTitle.includes('manager');
      
      return isHSSERole || data?.is_super_admin === true;
    },
    enabled: !!user?.id,
  });
}

/**
 * Hook to check if observation is already enforced
 */
export function useIsObservationEnforced(incidentId: string | null) {
  return useQuery({
    queryKey: ['observation-enforced', incidentId],
    queryFn: async () => {
      if (!incidentId) return { enforced: false };
      
      const { data, error } = await supabase
        .from('incidents')
        .select('hsse_enforced_at, hsse_enforced_by, status')
        .eq('id', incidentId)
        .single();
      
      if (error) return { enforced: false };
      
      if (data?.hsse_enforced_at) {
        // Get enforcer name
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', data.hsse_enforced_by)
          .single();
        
        return {
          enforced: true,
          enforcedAt: data.hsse_enforced_at,
          enforcedBy: profile?.full_name || 'HSSE Expert',
          status: data.status,
        };
      }
      
      return { enforced: false };
    },
    enabled: !!incidentId,
  });
}

/**
 * Hook for HSSE Expert to enforce a final decision
 * This is the ultimate authority - no further appeals allowed
 */
export function useHSSEEnforceDecision() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({
      incidentId,
      decision,
      notes,
    }: {
      incidentId: string;
      decision: HSSEEnforcementDecision;
      notes: string;
    }) => {
      const { data, error } = await supabase.rpc('hsse_expert_enforce_decision', {
        p_incident_id: incidentId,
        p_decision: decision,
        p_notes: notes,
      });
      if (error) throw error;
      const result = parseRpcResponse(data);
      if (!result.success) throw new Error(result.error || 'Failed to enforce decision');
      return result;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      queryClient.invalidateQueries({ queryKey: ['incident'] });
      queryClient.invalidateQueries({ queryKey: ['observation-enforced'] });
      queryClient.invalidateQueries({ queryKey: ['corrective-actions'] });
      
      const messages: Record<string, string> = {
        approve: t('workflow.hsseEnforce.approved', 'Observation approved - proceeding to next step'),
        reject: t('workflow.hsseEnforce.rejected', 'Observation rejected - case closed'),
        return_to_consultant: t('workflow.hsseEnforce.returnedToConsultant', 'Returned to consultant for revision'),
        return_to_dept_rep: t('workflow.hsseEnforce.returnedToDeptRep', 'Returned to department representative'),
      };
      
      if (data.is_final) {
        toast.success(
          t('workflow.hsseEnforce.finalDecision', 'Final decision enforced - no further appeals allowed'),
          { duration: 5000 }
        );
      } else {
        toast.success(messages[data.decision || 'approve']);
      }
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}
