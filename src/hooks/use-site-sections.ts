import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

interface SiteSection {
  id: string;
  site_id: string;
  section_id: string;
  created_at: string;
  section?: {
    id: string;
    name: string;
    department_id: string;
  };
}

export function useSiteSections(siteId?: string) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['site-sections', siteId],
    queryFn: async () => {
      if (!siteId) return [];

      const { data, error } = await supabase
        .from('site_sections')
        .select(`
          id,
          site_id,
          section_id,
          created_at,
          sections:section_id (
            id,
            name,
            department_id
          )
        `)
        .eq('site_id', siteId)
        .is('deleted_at', null);

      if (error) throw error;
      return data as unknown as SiteSection[];
    },
    enabled: !!siteId,
  });

  const assignSection = useMutation({
    mutationFn: async ({ 
      siteId, 
      sectionId, 
    }: { 
      siteId: string; 
      sectionId: string; 
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
        .from('site_sections')
        .select('id')
        .eq('site_id', siteId)
        .eq('section_id', sectionId)
        .not('deleted_at', 'is', null)
        .maybeSingle();

      if (existing) {
        // Restore the soft-deleted record
        const { data, error } = await supabase
          .from('site_sections')
          .update({ deleted_at: null })
          .eq('id', existing.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      }

      // No existing soft-deleted record, insert new
      const { data, error } = await supabase
        .from('site_sections')
        .insert({
          site_id: siteId,
          section_id: sectionId,
          tenant_id: profile.tenant_id,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['site-sections', siteId] });
      toast.success(t('admin.orgStructure.sectionAssigned'));
    },
    onError: (error) => {
      console.error('Error assigning section:', error);
      toast.error(t('common.error'));
    },
  });

  const removeSection = useMutation({
    mutationFn: async (assignmentId: string) => {
      const { error } = await supabase
        .from('site_sections')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', assignmentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['site-sections', siteId] });
      toast.success(t('admin.orgStructure.sectionRemoved'));
    },
    onError: (error) => {
      console.error('Error removing section:', error);
      toast.error(t('common.error'));
    },
  });

  return {
    sections: query.data ?? [],
    isLoading: query.isLoading,
    assignSection,
    removeSection,
  };
}
