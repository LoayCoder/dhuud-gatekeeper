import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

export interface PushNotificationPreferences {
  id: string;
  user_id: string;
  tenant_id: string;
  // HSSE Types
  incidents_new: boolean;
  incidents_assigned: boolean;
  incidents_status_change: boolean;
  approvals_requested: boolean;
  approvals_decision: boolean;
  sla_warnings: boolean;
  sla_overdue: boolean;
  sla_escalations: boolean;
  // General
  system_announcements: boolean;
  created_at: string;
  updated_at: string;
}

export type NotificationTypeKey = 
  | 'incidents_new'
  | 'incidents_assigned'
  | 'incidents_status_change'
  | 'approvals_requested'
  | 'approvals_decision'
  | 'sla_warnings'
  | 'sla_overdue'
  | 'sla_escalations'
  | 'system_announcements';

const DEFAULT_PREFERENCES: Omit<PushNotificationPreferences, 'id' | 'user_id' | 'tenant_id' | 'created_at' | 'updated_at'> = {
  incidents_new: true,
  incidents_assigned: true,
  incidents_status_change: true,
  approvals_requested: true,
  approvals_decision: true,
  sla_warnings: true,
  sla_overdue: true,
  sla_escalations: true,
  system_announcements: true,
};

export function usePushNotificationPreferences() {
  const { t } = useTranslation();
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();

  const { data: preferences, isLoading, error } = useQuery({
    queryKey: ['push-notification-preferences', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('push_notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      // If no preferences exist, create defaults
      if (!data && profile?.tenant_id) {
        const { data: newPrefs, error: insertError } = await supabase
          .from('push_notification_preferences')
          .insert({
            user_id: user.id,
            tenant_id: profile.tenant_id,
            ...DEFAULT_PREFERENCES,
          })
          .select()
          .single();

        if (insertError) throw insertError;
        return newPrefs as PushNotificationPreferences;
      }

      return data as PushNotificationPreferences | null;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const updatePreference = useMutation({
    mutationFn: async ({ key, value }: { key: NotificationTypeKey; value: boolean }) => {
      if (!user?.id || !preferences?.id) throw new Error('No preferences found');

      const { error } = await supabase
        .from('push_notification_preferences')
        .update({ [key]: value, updated_at: new Date().toISOString() })
        .eq('id', preferences.id);

      if (error) throw error;
    },
    onMutate: async ({ key, value }) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ['push-notification-preferences', user?.id] });
      const previous = queryClient.getQueryData<PushNotificationPreferences>(['push-notification-preferences', user?.id]);
      
      if (previous) {
        queryClient.setQueryData(['push-notification-preferences', user?.id], {
          ...previous,
          [key]: value,
        });
      }
      
      return { previous };
    },
    onError: (err, _variables, context) => {
      // Rollback on error
      if (context?.previous) {
        queryClient.setQueryData(['push-notification-preferences', user?.id], context.previous);
      }
      toast({
        title: t('common.error'),
        description: t('pushNotifications.updateError'),
        variant: 'destructive',
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['push-notification-preferences', user?.id] });
    },
  });

  const updateMultiple = useMutation({
    mutationFn: async (updates: Partial<Record<NotificationTypeKey, boolean>>) => {
      if (!user?.id || !preferences?.id) throw new Error('No preferences found');

      const { error } = await supabase
        .from('push_notification_preferences')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', preferences.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['push-notification-preferences', user?.id] });
    },
    onError: () => {
      toast({
        title: t('common.error'),
        description: t('pushNotifications.updateError'),
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
