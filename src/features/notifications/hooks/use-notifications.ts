import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { logger } from '@/lib/logger';
import { supabase } from '@/integrations/supabase/client';
export interface Notification {
  id: string;
  title: string;
  body?: string;
  type?: string;
  read: boolean;
  created_at: string;
  [key: string]: any;
}

export function useNotifications(limit = 20) {
  const { user } = useAuth();
  const { i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';

  return useQuery({
    queryKey: ['notifications', user?.id, limit],
    queryFn: async () => {
      if (!user?.id) return [];

      const { getNotifications } = await import('@/services/notifications/notificationService');

      try {
        const data = await getNotifications(user.id, limit);

        return (data || []).map(n => ({
          ...n,
          displayTitle: isArabic && n.title_ar ? n.title_ar : n.title,
          displayBody: isArabic && n.body_ar ? n.body_ar : n.body,
        })) as (Notification & { displayTitle: string; displayBody?: string })[];
      } catch (error) {
        logger.error('Error fetching notifications:', error);
        throw error;
      }
    },
    enabled: !!user?.id,
    staleTime: 30_000,
  });
}

export function useUnreadNotificationCount() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['notifications-unread-count', user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;

      try {
        const { getUnreadNotificationCount } = await import('@/services/notifications/notificationService');
        return await getUnreadNotificationCount(user.id);
      } catch (error) {
        logger.error('Error fetching unread count:', error);
        return 0;
      }
    },
    enabled: !!user?.id,
    staleTime: 10_000,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      if (!user?.id) throw new Error("Not authenticated");
      const { markNotificationRead } = await import('@/services/notifications/notificationService');
      return markNotificationRead(notificationId, user.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Not authenticated");
      const { markAllNotificationsRead } = await import('@/services/notifications/notificationService');
      return markAllNotificationsRead(user.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
    },
  });
}

export function useNotificationSubscription(onNewNotification?: (notification: Notification) => void) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('user-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          logger.debug('New notification received:', payload);
          const newNotification = payload.new as Notification;

          queryClient.invalidateQueries({ queryKey: ['notifications'] });
          queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });

          if (onNewNotification) {
            onNewNotification(newNotification);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient, onNewNotification]);
}

export function useCreateNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notification: Omit<Notification, 'id' | 'created_at' | 'is_read' | 'read_at'>) => {
      const { createNotification } = await import('@/services/notifications/notificationService');
      return createNotification(notification);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
    },
  });
}

