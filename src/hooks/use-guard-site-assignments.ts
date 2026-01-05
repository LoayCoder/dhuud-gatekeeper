import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

export interface GuardSiteAssignment {
  id: string;
  tenant_id: string;
  guard_id: string;
  site_id: string;
  is_primary: boolean;
  can_float: boolean;
  assignment_type: 'permanent' | 'temporary' | 'floating';
  effective_from: string;
  effective_to: string | null;
  created_at: string;
  // Joined
  guard?: { full_name: string } | null;
  site?: { name: string } | null;
}

export function useGuardSiteAssignments(options?: { guardId?: string; siteId?: string }) {
  return useQuery({
    queryKey: ['guard-site-assignments', options],
    queryFn: async () => {
      let query = supabase
        .from('guard_site_assignments')
        .select('*, guard:profiles!guard_site_assignments_guard_id_fkey(full_name), site:sites!guard_site_assignments_site_id_fkey(name)')
        .is('deleted_at', null)
        .order('is_primary', { ascending: false });

      if (options?.guardId) {
        query = query.eq('guard_id', options.guardId);
      }
      if (options?.siteId) {
        query = query.eq('site_id', options.siteId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as GuardSiteAssignment[];
    },
  });
}

export function useCreateSiteAssignment() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (data: {
      guard_id: string;
      site_id: string;
      is_primary?: boolean;
      can_float?: boolean;
      assignment_type?: 'permanent' | 'temporary' | 'floating';
      effective_from?: string;
      effective_to?: string;
    }) => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', data.guard_id)
        .single();

      if (!profile?.tenant_id) throw new Error('No tenant');

      // If setting as primary, unset other primary assignments for this guard
      if (data.is_primary) {
        await supabase
          .from('guard_site_assignments')
          .update({ is_primary: false })
          .eq('guard_id', data.guard_id)
          .is('deleted_at', null);
      }

      const { data: result, error } = await supabase
        .from('guard_site_assignments')
        .insert({
          tenant_id: profile.tenant_id,
          guard_id: data.guard_id,
          site_id: data.site_id,
          is_primary: data.is_primary ?? false,
          can_float: data.can_float ?? true,
          assignment_type: data.assignment_type ?? 'permanent',
          effective_from: data.effective_from ?? new Date().toISOString().split('T')[0],
          effective_to: data.effective_to || null,
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guard-site-assignments'] });
      toast.success(t('security.siteAssignment.added', 'Site assignment added'));
    },
    onError: (error) => {
      toast.error(t('common.error', 'Error'), { description: error.message });
    },
  });
}

export function useUpdateSiteAssignment() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (data: {
      id: string;
      is_primary?: boolean;
      can_float?: boolean;
      assignment_type?: 'permanent' | 'temporary' | 'floating';
      effective_to?: string | null;
    }) => {
      // If setting as primary, need to get guard_id first
      if (data.is_primary) {
        const { data: assignment } = await supabase
          .from('guard_site_assignments')
          .select('guard_id')
          .eq('id', data.id)
          .single();

        if (assignment) {
          await supabase
            .from('guard_site_assignments')
            .update({ is_primary: false })
            .eq('guard_id', assignment.guard_id)
            .neq('id', data.id)
            .is('deleted_at', null);
        }
      }

      const { error } = await supabase
        .from('guard_site_assignments')
        .update({
          is_primary: data.is_primary,
          can_float: data.can_float,
          assignment_type: data.assignment_type,
          effective_to: data.effective_to,
        })
        .eq('id', data.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guard-site-assignments'] });
      toast.success(t('security.siteAssignment.updated', 'Assignment updated'));
    },
    onError: (error) => {
      toast.error(t('common.error', 'Error'), { description: error.message });
    },
  });
}

export function useDeleteSiteAssignment() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('guard_site_assignments')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guard-site-assignments'] });
      toast.success(t('security.siteAssignment.deleted', 'Assignment removed'));
    },
    onError: (error) => {
      toast.error(t('common.error', 'Error'), { description: error.message });
    },
  });
}
