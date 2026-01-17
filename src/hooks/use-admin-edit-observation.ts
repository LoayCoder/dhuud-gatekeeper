/**
 * Hook for admin observation editing with optional re-routing
 * Allows admins to change location (branch/site) and contractor assignment
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

export interface AdminEditObservationInput {
  incidentId: string;
  branchId?: string | null;
  siteId?: string | null;
  contractorCompanyId?: string | null;
  shouldReroute: boolean;
  adminNotes?: string;
}

export interface AdminEditObservationResult {
  success: boolean;
  rerouted: boolean;
  new_assigned_to: string | null;
  new_status: string;
  role_selected: string | null;
  selection_reason: string;
  site_primary_department: string | null;
}

export function useAdminEditObservation() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (input: AdminEditObservationInput): Promise<AdminEditObservationResult> => {
      const { data, error } = await supabase.rpc('reroute_observation_to_new_site', {
        p_incident_id: input.incidentId,
        p_new_branch_id: input.branchId || null,
        p_new_site_id: input.siteId || null,
        p_new_contractor_id: input.contractorCompanyId,
        p_should_reroute: input.shouldReroute,
        p_admin_notes: input.adminNotes || null,
      });

      if (error) throw error;
      
      // Type assertion for the RPC response
      const result = data as unknown as AdminEditObservationResult;
      if (!result || typeof result.success === 'undefined') {
        throw new Error('Invalid response from server');
      }
      return result;
    },
    onSuccess: (data, variables) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['incident', variables.incidentId] });
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      queryClient.invalidateQueries({ queryKey: ['investigation', variables.incidentId] });
      queryClient.invalidateQueries({ queryKey: ['pending-incident-approvals'] });

      if (data.rerouted) {
        toast.success(t('admin.editObservation.reroutedSuccess', 'Observation updated and re-routed successfully'));
      } else {
        toast.success(t('admin.editObservation.updatedSuccess', 'Observation updated successfully'));
      }
    },
    onError: (error: Error) => {
      console.error('Admin edit observation error:', error);
      toast.error(t('admin.editObservation.error', 'Failed to update observation'));
    },
  });
}

/**
 * Hook to fetch contractor companies for the admin edit dialog
 */
export function useContractorCompanies(branchId?: string | null) {
  return useQueryClient().fetchQuery({
    queryKey: ['contractor-companies', branchId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single();

      if (!profile) return [];

      let query = supabase
        .from('contractor_companies')
        .select('id, name, name_ar')
        .eq('tenant_id', profile.tenant_id)
        .is('deleted_at', null)
        .eq('status', 'active')
        .order('name');

      if (branchId) {
        query = query.eq('assigned_branch_id', branchId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}
