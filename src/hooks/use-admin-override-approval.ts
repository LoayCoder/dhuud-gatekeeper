import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

export interface PendingApprovalIncident {
  id: string;
  reference_id: string;
  title: string;
  status: string;
  event_type: string;
  created_at: string;
  updated_at: string;
  department_id: string;
  department_name?: string;
  assigned_to?: string;
  assigned_to_name?: string;
  reporter_name?: string;
  days_stuck: number;
}

// These are the statuses where incidents can get stuck waiting for approval
const APPROVAL_STATUSES = [
  'pending_dept_rep_approval',
  'pending_dept_rep_incident_review',
  'pending_manager_approval',
  'pending_hsse_rejection_review',
  'pending_hsse_validation',
  'pending_legal_review',
] as const;

export function usePendingApprovals(minDaysStuck = 0) {
  return useQuery({
    queryKey: ['admin-pending-approvals', minDaysStuck],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('incidents')
        .select(`
          id,
          reference_id,
          title,
          status,
          event_type,
          created_at,
          updated_at,
          department_id,
          reporter_id
        `)
        .or(APPROVAL_STATUSES.map(s => `status.eq.${s}`).join(','))
        .is('deleted_at', null)
        .order('updated_at', { ascending: true });

      if (error) throw error;

      const now = new Date();
      const incidents: PendingApprovalIncident[] = ((data || []) as any[]).map((incident) => {
        const updatedAt = new Date(incident.updated_at);
        const daysStuck = Math.floor((now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60 * 24));
        
        return {
          id: incident.id,
          reference_id: incident.reference_id || '',
          title: incident.title,
          status: incident.status,
          event_type: incident.event_type,
          created_at: incident.created_at,
          updated_at: incident.updated_at,
          department_id: incident.department_id || '',
          days_stuck: daysStuck,
        };
      });

      // Filter by minimum days stuck
      return incidents.filter(i => i.days_stuck >= minDaysStuck);
    },
  });
}

export function useAdminOverrideApproval() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      incidentId,
      overrideReason,
      originalApprover,
    }: {
      incidentId: string;
      overrideReason: string;
      originalApprover: string;
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const { data, error } = await supabase.rpc('admin_override_approval', {
        _incident_id: incidentId,
        _admin_id: userData.user.id,
        _override_reason: overrideReason,
        _original_approver: originalApprover,
      });

      if (error) throw error;
      
      const result = data as { success: boolean; error?: string; new_status?: string };
      if (!result.success) {
        throw new Error(result.error || 'Override failed');
      }

      return result;
    },
    onSuccess: () => {
      toast({
        title: t('admin.override.success'),
        description: t('admin.override.successDescription'),
      });
      queryClient.invalidateQueries({ queryKey: ['admin-pending-approvals'] });
      queryClient.invalidateQueries({ queryKey: ['incident'] });
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
    },
    onError: (error: Error) => {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useIsAdmin() {
  return useQuery({
    queryKey: ['is-admin-check'],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return false;

      const { data, error } = await supabase.rpc('is_admin');
      if (error) return false;
      return data === true;
    },
  });
}
