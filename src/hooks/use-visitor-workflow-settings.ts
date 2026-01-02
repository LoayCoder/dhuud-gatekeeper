import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

export interface VisitorWorkflowSettings {
  id: string;
  tenant_id: string;
  require_photo: boolean;
  auto_approve_internal: boolean;
  default_duration_hours: number;
  expiry_warning_minutes: number;
  notify_host_on_arrival: boolean;
  notify_host_on_departure: boolean;
  allow_multiple_active_visits: boolean;
  require_security_approval: boolean;
  max_visit_duration_hours: number;
  badge_valid_hours: number;
  created_at: string;
  updated_at: string;
}

export function useVisitorWorkflowSettings() {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ['visitor-workflow-settings', tenantId],
    queryFn: async () => {
      if (!tenantId) return null;

      const { data, error } = await supabase
        .from('visitor_workflow_settings')
        .select('*')
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .maybeSingle();

      if (error) throw error;
      return data as VisitorWorkflowSettings | null;
    },
    enabled: !!tenantId,
  });
}

export function useUpdateVisitorWorkflowSettings() {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (settings: Partial<VisitorWorkflowSettings>) => {
      if (!tenantId) throw new Error('No tenant');

      // Check if settings exist
      const { data: existing } = await supabase
        .from('visitor_workflow_settings')
        .select('id')
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .maybeSingle();

      if (existing) {
        // Update existing
        const { data, error } = await supabase
          .from('visitor_workflow_settings')
          .update({ ...settings, updated_at: new Date().toISOString() })
          .eq('id', existing.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Insert new
        const { data, error } = await supabase
          .from('visitor_workflow_settings')
          .insert({ ...settings, tenant_id: tenantId })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visitor-workflow-settings'] });
      toast({ title: t('admin.visitors.settingsSaved', 'Settings saved') });
    },
    onError: (error) => {
      toast({
        title: t('common.error', 'Error'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
