import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

export interface HSSENotification {
  id: string;
  tenant_id: string;
  title_en: string;
  title_ar: string | null;
  body_en: string;
  body_ar: string | null;
  category: 'weather_risk' | 'regulation' | 'safety_alert' | 'policy_update' | 'training' | 'general';
  priority: 'critical' | 'high' | 'medium' | 'low';
  notification_type: 'mandatory' | 'informational';
  target_audience: 'all_users' | 'specific_roles' | 'specific_branches' | 'specific_sites';
  target_role_ids: string[];
  target_branch_ids: string[];
  target_site_ids: string[];
  created_by: string | null;
  published_at: string | null;
  expires_at: string | null;
  is_active: boolean;
  send_push_notification: boolean;
  created_at: string;
  updated_at: string;
}

export interface NotificationAcknowledgment {
  id: string;
  notification_id: string;
  user_id: string;
  acknowledged_at: string;
  ip_address: string | null;
  device_info: Record<string, unknown> | null;
}

export interface NotificationRead {
  id: string;
  notification_id: string;
  user_id: string;
  read_at: string;
}

export interface CreateNotificationData {
  title_en: string;
  title_ar?: string;
  body_en: string;
  body_ar?: string;
  category: HSSENotification['category'];
  priority: HSSENotification['priority'];
  notification_type: HSSENotification['notification_type'];
  target_audience: HSSENotification['target_audience'];
  target_role_ids?: string[];
  target_branch_ids?: string[];
  target_site_ids?: string[];
  expires_at?: string;
  send_push_notification?: boolean;
  send_email_notification?: boolean;
  publish_immediately?: boolean;
}

// Hook for admin notification management
export function useHSSENotificationsAdmin() {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  const { data: notifications, isLoading, error } = useQuery({
    queryKey: ['hsse-notifications-admin', profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) return [];
      
      const { data, error } = await supabase
        .from('hsse_notifications')
        .select('*')
        .eq('tenant_id', profile.tenant_id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as HSSENotification[];
    },
    enabled: !!profile?.tenant_id,
  });

  const createNotification = useMutation({
    mutationFn: async (data: CreateNotificationData) => {
      if (!profile?.tenant_id) throw new Error('No tenant');

      const { data: userData } = await supabase.auth.getUser();
      
      const { data: newNotification, error } = await supabase
        .from('hsse_notifications')
        .insert({
          tenant_id: profile.tenant_id,
          created_by: userData.user?.id || null,
          title_en: data.title_en,
          title_ar: data.title_ar || null,
          body_en: data.body_en,
          body_ar: data.body_ar || null,
          category: data.category,
          priority: data.priority,
          notification_type: data.notification_type,
          target_audience: data.target_audience,
          target_role_ids: data.target_role_ids || [],
          target_branch_ids: data.target_branch_ids || [],
          target_site_ids: data.target_site_ids || [],
          expires_at: data.expires_at || null,
          send_push_notification: data.send_push_notification ?? true,
          send_email_notification: data.send_email_notification ?? false,
          published_at: data.publish_immediately ? new Date().toISOString() : null,
        })
        .select()
        .single();
      
      if (error) throw error;
      return newNotification;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hsse-notifications-admin'] });
      toast({ title: t('hsseNotifications.notificationCreated') });
    },
    onError: (error: Error) => {
      toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
    },
  });

  const publishNotification = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('hsse_notifications')
        .update({ published_at: new Date().toISOString() })
        .eq('id', notificationId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hsse-notifications-admin'] });
      queryClient.invalidateQueries({ queryKey: ['hsse-notifications-user'] });
      toast({ title: t('hsseNotifications.notificationPublished') });
    },
  });

  const deactivateNotification = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('hsse_notifications')
        .update({ is_active: false })
        .eq('id', notificationId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hsse-notifications-admin'] });
      queryClient.invalidateQueries({ queryKey: ['hsse-notifications-user'] });
      toast({ title: t('hsseNotifications.notificationDeactivated') });
    },
  });

  const deleteNotification = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('hsse_notifications')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', notificationId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hsse-notifications-admin'] });
      toast({ title: t('hsseNotifications.notificationDeleted') });
    },
  });

  return {
    notifications,
    isLoading,
    error,
    createNotification,
    publishNotification,
    deactivateNotification,
    deleteNotification,
  };
}

// Hook for user-facing notifications
export function useHSSENotificationsUser() {
  const { t, i18n } = useTranslation();
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();

  // Fetch all active notifications for the user
  const { data: notifications, isLoading } = useQuery({
    queryKey: ['hsse-notifications-user', profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) return [];
      
      const { data, error } = await supabase
        .from('hsse_notifications')
        .select('*')
        .eq('tenant_id', profile.tenant_id)
        .eq('is_active', true)
        .is('deleted_at', null)
        .not('published_at', 'is', null)
        .lte('published_at', new Date().toISOString())
        .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
        .order('priority', { ascending: true })
        .order('published_at', { ascending: false });
      
      if (error) throw error;
      return data as HSSENotification[];
    },
    enabled: !!profile?.tenant_id,
    staleTime: 60 * 1000, // 1 minute
  });

  // Fetch acknowledgments
  const { data: acknowledgments } = useQuery({
    queryKey: ['hsse-notification-acknowledgments', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('hsse_notification_acknowledgments')
        .select('notification_id, acknowledged_at')
        .eq('user_id', user.id);
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch read status
  const { data: reads } = useQuery({
    queryKey: ['hsse-notification-reads', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('hsse_notification_reads')
        .select('notification_id, read_at')
        .eq('user_id', user.id);
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Get pending mandatory notifications
  const { data: pendingMandatory } = useQuery({
    queryKey: ['hsse-pending-mandatory', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase.rpc('get_pending_mandatory_notifications');
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
    refetchInterval: 60 * 1000, // Check every minute
  });

  const acknowledgeNotification = useMutation({
    mutationFn: async (notificationId: string) => {
      if (!user?.id || !profile?.tenant_id) throw new Error('Not authenticated');

      const deviceInfo = {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        screenWidth: window.screen.width,
        screenHeight: window.screen.height,
      };

      const { error } = await supabase
        .from('hsse_notification_acknowledgments')
        .insert({
          tenant_id: profile.tenant_id,
          notification_id: notificationId,
          user_id: user.id,
          device_info: deviceInfo,
          user_agent: navigator.userAgent,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hsse-notification-acknowledgments'] });
      queryClient.invalidateQueries({ queryKey: ['hsse-pending-mandatory'] });
      toast({ title: t('hsseNotifications.acknowledged') });
    },
    onError: (error: Error) => {
      toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
    },
  });

  const markAsRead = useMutation({
    mutationFn: async (notificationId: string) => {
      if (!user?.id || !profile?.tenant_id) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('hsse_notification_reads')
        .insert({
          tenant_id: profile.tenant_id,
          notification_id: notificationId,
          user_id: user.id,
        });
      
      // Ignore duplicate errors
      if (error && !error.message.includes('duplicate')) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hsse-notification-reads'] });
    },
  });

  // Helper to get localized title
  const getLocalizedTitle = (notification: HSSENotification) => {
    if (i18n.language === 'ar' && notification.title_ar) {
      return notification.title_ar;
    }
    return notification.title_en;
  };

  // Helper to get localized body
  const getLocalizedBody = (notification: HSSENotification) => {
    if (i18n.language === 'ar' && notification.body_ar) {
      return notification.body_ar;
    }
    return notification.body_en;
  };

  // Check if notification is acknowledged
  const isAcknowledged = (notificationId: string) => {
    return acknowledgments?.some(a => a.notification_id === notificationId) ?? false;
  };

  // Check if notification is read
  const isRead = (notificationId: string) => {
    return reads?.some(r => r.notification_id === notificationId) ?? false;
  };

  // Get unread count
  const unreadCount = notifications?.filter(n => !isRead(n.id) && !isAcknowledged(n.id)).length ?? 0;

  // Get mandatory unacknowledged count
  const pendingMandatoryCount = pendingMandatory?.length ?? 0;

  return {
    notifications,
    isLoading,
    pendingMandatory,
    unreadCount,
    pendingMandatoryCount,
    acknowledgeNotification,
    markAsRead,
    isAcknowledged,
    isRead,
    getLocalizedTitle,
    getLocalizedBody,
  };
}

// Hook to get acknowledgment stats for admin
export function useNotificationStats(notificationId: string | null) {
  return useQuery({
    queryKey: ['hsse-notification-stats', notificationId],
    queryFn: async () => {
      if (!notificationId) return null;
      
      const { data, error } = await supabase.rpc('get_notification_acknowledgment_stats', {
        p_notification_id: notificationId,
      });
      
      if (error) throw error;
      return data as { total_target: number; acknowledged: number; pending: number; percentage: number };
    },
    enabled: !!notificationId,
  });
}
