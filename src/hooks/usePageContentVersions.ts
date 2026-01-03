import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { SupportedLanguage } from '@/lib/language-resolver';

export type PageType = 'visitor_badge' | 'worker_pass' | 'worker_induction';
export type PageStatus = 'draft' | 'published';

export interface PageContentVersion {
  id: string;
  tenant_id: string;
  page_type: PageType;
  language: SupportedLanguage;
  is_main: boolean;
  status: PageStatus;
  content: Record<string, string>;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export function usePageContentVersions(pageType: PageType) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const versionsQuery = useQuery({
    queryKey: ['page-content-versions', pageType],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('page_content_versions')
        .select('*')
        .eq('page_type', pageType)
        .is('deleted_at', null)
        .order('is_main', { ascending: false })
        .order('language', { ascending: true });

      if (error) throw error;
      return data as PageContentVersion[];
    },
  });

  const mainVersion = versionsQuery.data?.find(v => v.is_main);
  const translatedVersions = versionsQuery.data?.filter(v => !v.is_main) || [];

  const createVersionMutation = useMutation({
    mutationFn: async (version: Omit<PageContentVersion, 'id' | 'created_at' | 'updated_at'>) => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;

      const { data, error } = await supabase
        .from('page_content_versions')
        .insert({
          ...version,
          created_by: userId,
          updated_by: userId,
        })
        .select()
        .single();

      if (error) throw error;

      // Log audit
      await supabase.from('page_content_audit_logs').insert({
        tenant_id: version.tenant_id,
        page_version_id: data.id,
        page_type: version.page_type,
        language: version.language,
        action_type: 'created',
        performed_by: userId,
        new_value: version.content,
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['page-content-versions', pageType] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const updateVersionMutation = useMutation({
    mutationFn: async ({ id, content, status }: { id: string; content?: Record<string, string>; status?: PageStatus }) => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;

      // Get current version for audit
      const { data: currentVersion } = await supabase
        .from('page_content_versions')
        .select('*')
        .eq('id', id)
        .single();

      const updates: Record<string, unknown> = { updated_by: userId };
      if (content !== undefined) updates.content = content;
      if (status !== undefined) updates.status = status;

      const { data, error } = await supabase
        .from('page_content_versions')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Log audit
      if (currentVersion) {
        await supabase.from('page_content_audit_logs').insert({
          tenant_id: currentVersion.tenant_id,
          page_version_id: id,
          page_type: currentVersion.page_type,
          language: currentVersion.language,
          action_type: status ? 'published' : 'updated',
          performed_by: userId,
          old_value: currentVersion.content,
          new_value: content || currentVersion.content,
        });
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['page-content-versions', pageType] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteVersionMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;

      // Get version for audit
      const { data: version } = await supabase
        .from('page_content_versions')
        .select('*')
        .eq('id', id)
        .single();

      // Soft delete
      const { error } = await supabase
        .from('page_content_versions')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      // Log audit
      if (version) {
        await supabase.from('page_content_audit_logs').insert({
          tenant_id: version.tenant_id,
          page_version_id: id,
          page_type: version.page_type,
          language: version.language,
          action_type: 'deleted',
          performed_by: userId,
          old_value: version.content,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['page-content-versions', pageType] });
      toast({
        title: 'Deleted',
        description: 'Page version deleted successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const translateMutation = useMutation({
    mutationFn: async ({ 
      content, 
      sourceLanguage, 
      targetLanguages, 
      tenantId 
    }: { 
      content: Record<string, string>; 
      sourceLanguage: string; 
      targetLanguages: string[];
      tenantId: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('translate-page-content', {
        body: {
          content,
          sourceLanguage,
          targetLanguages,
          pageType,
          tenantId,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Translation failed');
      
      return data.translations as Record<string, Record<string, string>>;
    },
    onError: (error: Error) => {
      toast({
        title: 'Translation Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    versions: versionsQuery.data || [],
    mainVersion,
    translatedVersions,
    isLoading: versionsQuery.isLoading,
    error: versionsQuery.error,
    createVersion: createVersionMutation.mutateAsync,
    updateVersion: updateVersionMutation.mutateAsync,
    deleteVersion: deleteVersionMutation.mutateAsync,
    translate: translateMutation.mutateAsync,
    isCreating: createVersionMutation.isPending,
    isUpdating: updateVersionMutation.isPending,
    isDeleting: deleteVersionMutation.isPending,
    isTranslating: translateMutation.isPending,
  };
}

export function useNationalityMappings() {
  return useQuery({
    queryKey: ['nationality-mappings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('nationality_language_mapping')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      return data;
    },
  });
}
