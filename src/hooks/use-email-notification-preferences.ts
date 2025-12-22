import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

export interface EmailNotificationPreferences {
  id: string;
  user_id: string;
  tenant_id: string;
  // HSSE
  incidents_new: boolean;
  incidents_assigned: boolean;
  incidents_status_change: boolean;
  approvals_requested: boolean;
  approvals_decision: boolean;
  sla_warnings: boolean;
  sla_overdue: boolean;
  // Security
  visitor_checkin: boolean;
  contractor_alerts: boolean;
  gate_pass_approval: boolean;
  // System
  system_announcements: boolean;
  daily_digest: boolean;
  weekly_summary: boolean;
  created_at: string;
  updated_at: string;
}

export type EmailNotificationKey = keyof Omit<EmailNotificationPreferences, 'id' | 'user_id' | 'tenant_id' | 'created_at' | 'updated_at'>;

const DEFAULT_EMAIL_PREFERENCES: Omit<EmailNotificationPreferences, 'id' | 'user_id' | 'tenant_id' | 'created_at' | 'updated_at'> = {
  incidents_new: true,
  incidents_assigned: true,
  incidents_status_change: true,
  approvals_requested: true,
  approvals_decision: true,
  sla_warnings: true,
  sla_overdue: true,
  visitor_checkin: true,
  contractor_alerts: true,
  gate_pass_approval: true,
  system_announcements: true,
  daily_digest: false,
  weekly_summary: true,
};

export function useEmailNotificationPreferences() {
  const { t } = useTranslation();
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();

  const { data: preferences, isLoading, error } = useQuery({
    queryKey: ['email-notification-preferences', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('email_notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      // If no preferences exist, create defaults
      if (!data && profile?.tenant_id) {
        const { data: newPrefs, error: insertError } = await supabase
          .from('email_notification_preferences')
          .insert({
            user_id: user.id,
            tenant_id: profile.tenant_id,
            ...DEFAULT_EMAIL_PREFERENCES,
          })
          .select()
          .single();

        if (insertError) throw insertError;
        return newPrefs as EmailNotificationPreferences;
      }

      return data as EmailNotificationPreferences | null;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  const updatePreference = useMutation({
    mutationFn: async ({ key, value }: { key: EmailNotificationKey; value: boolean }) => {
      if (!user?.id || !preferences?.id) throw new Error('No preferences found');

      const { error } = await supabase
        .from('email_notification_preferences')
        .update({ [key]: value, updated_at: new Date().toISOString() })
        .eq('id', preferences.id);

      if (error) throw error;
    },
    onMutate: async ({ key, value }) => {
      await queryClient.cancelQueries({ queryKey: ['email-notification-preferences', user?.id] });
      const previous = queryClient.getQueryData<EmailNotificationPreferences>(['email-notification-preferences', user?.id]);
      
      if (previous) {
        queryClient.setQueryData(['email-notification-preferences', user?.id], {
          ...previous,
          [key]: value,
        });
      }
      
      return { previous };
    },
    onError: (err, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['email-notification-preferences', user?.id], context.previous);
      }
      toast({
        title: t('common.error'),
        description: t('notifications.updateError', 'Failed to update preference'),
        variant: 'destructive',
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['email-notification-preferences', user?.id] });
    },
  });

  const updateMultiple = useMutation({
    mutationFn: async (updates: Partial<Record<EmailNotificationKey, boolean>>) => {
      if (!user?.id || !preferences?.id) throw new Error('No preferences found');

      const { error } = await supabase
        .from('email_notification_preferences')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', preferences.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-notification-preferences', user?.id] });
    },
    onError: () => {
      toast({
        title: t('common.error'),
        description: t('notifications.updateError', 'Failed to update preferences'),
        variant: 'destructive',
      });
    },
  });

  return {
    preferences,
    isLoading,
    error,
    updatePreference: updatePreference.mutate,
    updateMultiple: updateMultiple.mutate,
    isUpdating: updatePreference.isPending || updateMultiple.isPending,
  };
}
