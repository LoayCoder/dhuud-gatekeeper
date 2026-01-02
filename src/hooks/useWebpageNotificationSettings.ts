import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface WebpageNotificationSettings {
  id: string;
  tenant_id: string;
  visitor_webpage_enabled: boolean;
  visitor_message_template: string;
  visitor_message_template_ar: string;
  visitor_allow_download: boolean;
  visitor_allow_share: boolean;
  worker_webpage_enabled: boolean;
  worker_message_template: string;
  worker_message_template_ar: string;
  worker_allow_download: boolean;
  worker_allow_share: boolean;
  created_at: string;
  updated_at: string;
}

export type WebpageNotificationSettingsUpdate = Partial<Omit<WebpageNotificationSettings, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>>;

const DEFAULT_SETTINGS: Omit<WebpageNotificationSettings, 'id' | 'tenant_id' | 'created_at' | 'updated_at'> = {
  visitor_webpage_enabled: true,
  visitor_message_template: 'Welcome {{visitor_name}}! View your visitor badge here: {{badge_url}}',
  visitor_message_template_ar: 'مرحباً {{visitor_name}}! اطلع على بطاقة الزائر الخاصة بك هنا: {{badge_url}}',
  visitor_allow_download: true,
  visitor_allow_share: true,
  worker_webpage_enabled: true,
  worker_message_template: 'Your access pass for {{project_name}} is ready: {{pass_url}}',
  worker_message_template_ar: 'تصريح الدخول الخاص بك لمشروع {{project_name}} جاهز: {{pass_url}}',
  worker_allow_download: true,
  worker_allow_share: true,
};

export function useWebpageNotificationSettings() {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ['webpage-notification-settings', tenantId],
    queryFn: async () => {
      if (!tenantId) throw new Error('No tenant');

      const { data, error } = await supabase
        .from('webpage_notification_settings')
        .select('*')
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .maybeSingle();

      if (error) throw error;
      
      // Return existing settings or default values
      if (data) {
        return data as WebpageNotificationSettings;
      }
      
      return {
        ...DEFAULT_SETTINGS,
        id: '',
        tenant_id: tenantId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as WebpageNotificationSettings;
    },
    enabled: !!tenantId,
  });
}

export function useUpdateWebpageNotificationSettings() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useMutation({
    mutationFn: async (updates: WebpageNotificationSettingsUpdate) => {
      if (!tenantId) throw new Error('No tenant');

      // Check if settings exist
      const { data: existing } = await supabase
        .from('webpage_notification_settings')
        .select('id')
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .maybeSingle();

      if (existing) {
        // Update existing
        const { data, error } = await supabase
          .from('webpage_notification_settings')
          .update(updates)
          .eq('id', existing.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Create new
        const { data, error } = await supabase
          .from('webpage_notification_settings')
          .insert({
            tenant_id: tenantId,
            ...DEFAULT_SETTINGS,
            ...updates,
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webpage-notification-settings'] });
      toast.success('Settings saved successfully');
    },
    onError: (error) => {
      toast.error('Failed to save settings: ' + error.message);
    },
  });
}
