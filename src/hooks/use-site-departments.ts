import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

interface SiteDepartment {
  id: string;
  site_id: string;
  department_id: string;
  is_primary: boolean;
  created_at: string;
  department?: {
    id: string;
    name: string;
  };
}

export function useSiteDepartments(siteId?: string) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['site-departments', siteId],
    queryFn: async () => {
      if (!siteId) return [];

      const { data, error } = await supabase
        .from('site_departments')
        .select(`
          id,
          site_id,
          department_id,
          is_primary,
          created_at,
          departments:department_id (
            id,
            name
          )
        `)
        .eq('site_id', siteId)
        .is('deleted_at', null);

      if (error) throw error;
      return data as unknown as SiteDepartment[];
    },
    enabled: !!siteId,
  });

  const assignDepartment = useMutation({
    mutationFn: async ({ 
      siteId, 
      departmentId, 
      isPrimary = false 
    }: { 
      siteId: string; 
      departmentId: string; 
      isPrimary?: boolean;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single();

      if (!profile) throw new Error('Profile not found');

      // Check if a soft-deleted record already exists (upsert logic)
      const { data: existing } = await supabase
        .from('site_departments')
        .select('id')
        .eq('site_id', siteId)
        .eq('department_id', departmentId)
        .not('deleted_at', 'is', null)
        .maybeSingle();

      if (existing) {
        // Restore the soft-deleted record
        const { data, error } = await supabase
          .from('site_departments')
          .update({ 
            deleted_at: null,
            is_primary: isPrimary,
          })
          .eq('id', existing.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      }

      // No existing soft-deleted record, insert new
      const { data, error } = await supabase
        .from('site_departments')
        .insert({
          site_id: siteId,
          department_id: departmentId,
          tenant_id: profile.tenant_id,
          is_primary: isPrimary,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['site-departments', siteId] });
      toast.success(t('admin.orgStructure.departmentAssigned'));
    },
    onError: (error) => {
      console.error('Error assigning department:', error);
      toast.error(t('common.error'));
    },
  });

  const removeDepartment = useMutation({
    mutationFn: async (assignmentId: string) => {
      const { error } = await supabase
        .from('site_departments')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', assignmentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['site-departments', siteId] });
      toast.success(t('admin.orgStructure.departmentRemoved'));
    },
    onError: (error) => {
      console.error('Error removing department:', error);
      toast.error(t('common.error'));
    },
  });

  const setPrimaryDepartment = useMutation({
    mutationFn: async (assignmentId: string) => {
      // First, unset all primary flags for this site
      await supabase
        .from('site_departments')
        .update({ is_primary: false })
        .eq('site_id', siteId!);

      // Then set the new primary
      const { error } = await supabase
        .from('site_departments')
        .update({ is_primary: true })
        .eq('id', assignmentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['site-departments', siteId] });
      toast.success(t('admin.orgStructure.primaryDepartmentSet'));
    },
    onError: (error) => {
      console.error('Error setting primary department:', error);
      toast.error(t('common.error'));
    },
  });

  return {
    departments: query.data ?? [],
    isLoading: query.isLoading,
    assignDepartment,
    removeDepartment,
    setPrimaryDepartment,
  };
}
