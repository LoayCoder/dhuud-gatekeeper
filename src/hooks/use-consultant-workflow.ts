/**
 * Consultant Workflow Hooks
 * Handles contractor observation screening and severity-based routing
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
  routed_to?: string;
}

// Helper to parse RPC response
function parseRpcResponse(data: Json): RpcResponse {
  if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
    return data as unknown as RpcResponse;
  }
  return { success: false, error: 'Invalid response' };
}

/**
 * Hook to check if user has contractor consultant role access
 * Uses the database RPC function for proper role-based access control
 */
export function useHasConsultantAccess() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['has-consultant-access', user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      
      // Use database RPC for proper role-based access
      const { data: hasAccess, error } = await supabase
        .rpc('has_contractor_consultant_access', { p_user_id: user.id });
      
      if (error) {
        console.error('Error checking consultant access:', error);
        return false;
      }
      
      return hasAccess === true;
    },
    enabled: !!user?.id,
  });
}

/**
 * Hook to check if user can screen as consultant
 * Supports the new pending_consultant_screening status
 */
export function useCanScreenAsConsultant(incidentId: string | null) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['can-screen-consultant', user?.id, incidentId],
    queryFn: async () => {
      if (!user?.id || !incidentId) return false;
      
      // Get incident status AND branch_id for RBAC check
      const { data: incident, error: incidentError } = await supabase
        .from('incidents')
        .select('status, related_contractor_company_id, event_type, branch_id')
        .eq('id', incidentId)
        .single();
      
      if (incidentError || !incident) return false;
      
      // Only for contractor observations in screening stage
      // 'expert_screening' is the database status for contractor consultant screening
      const validStatuses = ['expert_screening', 'pending_consultant_screening', 'pending_consultant_review', 'pending_consultant_actions'];
      if (!validStatuses.includes(incident.status)) return false;
      
      // Must be a contractor observation
      if (!incident.related_contractor_company_id) return false;
      
      // Use branch-aware RPC for RBAC-based access check
      const { data: hasAccess, error } = await supabase
        .rpc('has_contractor_consultant_access_for_branch', { 
          p_user_id: user.id,
          p_branch_id: incident.branch_id 
        });
      
      if (error) {
        console.error('Error checking consultant branch access:', error);
        return false;
      }
      
      return hasAccess === true;
    },
    enabled: !!user?.id && !!incidentId,
  });
}

/**
 * Hook to check if user can review/act on observation as consultant
 * Uses branch-aware RBAC for proper role resolution
 */
export function useCanReviewAsConsultant(incidentId: string | null) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['can-review-consultant', user?.id, incidentId],
    queryFn: async () => {
      if (!user?.id || !incidentId) return false;
      
      // Get incident status AND branch_id for RBAC check
      const { data: incident, error: incidentError } = await supabase
        .from('incidents')
        .select('status, related_contractor_company_id, branch_id')
        .eq('id', incidentId)
        .single();
      
      if (incidentError || !incident) return false;
      
      // Only for contractor observations in review stages
      // 'expert_screening' is the database status for contractor consultant screening
      const validStatuses = ['expert_screening', 'pending_consultant_screening', 'pending_consultant_review', 'pending_consultant_actions'];
      if (!validStatuses.includes(incident.status)) return false;
      
      // Must be a contractor observation
      if (!incident.related_contractor_company_id) return false;
      
      // Use branch-aware RPC for RBAC-based access check
      const { data: hasAccess, error } = await supabase
        .rpc('has_contractor_consultant_access_for_branch', { 
          p_user_id: user.id,
          p_branch_id: incident.branch_id 
        });
      
      if (error) {
        console.error('Error checking consultant branch access:', error);
        return false;
      }
      
      return hasAccess === true;
    },
    enabled: !!user?.id && !!incidentId,
  });
}

/**
 * Hook for consultant to complete screening
 * Routes based on severity: Level 1-2 → Site Client, Level 3+ → HSSE Expert
 */
export function useConsultantCompleteScreening() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({
      incidentId,
      notes,
    }: {
      incidentId: string;
      notes?: string;
    }) => {
      const { data, error } = await supabase.rpc('consultant_complete_screening', {
        p_incident_id: incidentId,
        p_notes: notes,
      });
      if (error) throw error;
      const result = parseRpcResponse(data);
      if (!result.success) throw new Error(result.error || 'Failed to complete screening');
      return result;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      queryClient.invalidateQueries({ queryKey: ['incident'] });
      
      const routedTo = data.routed_to;
      const message = routedTo === 'hsse_expert'
        ? t('workflow.consultant.routedToHSSE', 'Routed to HSSE Expert (Level 3+)')
        : t('workflow.consultant.routedToSiteClient', 'Routed to Site Client for approval');
      
      toast.success(message);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

/**
 * Get the expected routing based on severity
 */
export function getRoutingForSeverity(severity: string | null | undefined): 'site_client' | 'hsse_expert' {
  if (!severity) return 'hsse_expert'; // Default to HSSE for safety
  
  const lowSeverities = ['level_1', 'level_2'];
  return lowSeverities.includes(severity) ? 'site_client' : 'hsse_expert';
}
