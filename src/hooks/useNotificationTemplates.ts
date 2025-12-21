import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface NotificationTemplate {
  id: string;
  tenant_id: string;
  slug: string;
  meta_template_name: string | null;
  content_pattern: string;
  variable_keys: string[];
  default_gateway: 'official' | 'wasender';
  category: string;
  language: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateTemplateInput {
  slug: string;
  meta_template_name?: string;
  content_pattern: string;
  variable_keys: string[];
  default_gateway: 'official' | 'wasender';
  category?: string;
  language?: string;
  is_active?: boolean;
}

export function useNotificationTemplates() {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ['notification-templates', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      
      const { data, error } = await supabase
        .from('notification_templates')
        .select('*')
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .order('category')
        .order('slug');

      if (error) throw error;
      return data as NotificationTemplate[];
    },
    enabled: !!tenantId,
  });
}

export function useCreateTemplate() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useMutation({
    mutationFn: async (input: CreateTemplateInput) => {
      if (!tenantId) throw new Error('No tenant ID');

      const { data, error } = await supabase
        .from('notification_templates')
        .insert({
          ...input,
          tenant_id: tenantId,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-templates'] });
      toast.success('Template created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create template: ${error.message}`);
    },
  });
}

export function useUpdateTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<CreateTemplateInput> & { id: string }) => {
      const { data, error } = await supabase
        .from('notification_templates')
        .update(input)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-templates'] });
      toast.success('Template updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update template: ${error.message}`);
    },
  });
}

export function useDeleteTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // Soft delete
      const { error } = await supabase
        .from('notification_templates')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-templates'] });
      toast.success('Template deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete template: ${error.message}`);
    },
  });
}
