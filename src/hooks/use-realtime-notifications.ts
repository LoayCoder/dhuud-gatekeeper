import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { playNotificationSound } from '@/lib/notification-history';
import { useTranslation } from 'react-i18next';

interface RealtimeNotification {
  id: string;
  user_id: string;
  title: string;
  body?: string;
  title_ar?: string;
  body_ar?: string;
  type: string;
  entity_type?: string;
  entity_id?: string;
  is_read: boolean;
  created_at: string;
}

/**
 * Hook that subscribes to real-time notification updates
 * Provides instant in-app notifications when push fails or app is in foreground
 */
export function useRealtimeNotifications() {
  const { user } = useAuth();
  const { i18n } = useTranslation();
  const queryClient = useQueryClient();
  const isArabic = i18n.language === 'ar';

  const showInAppNotification = useCallback((notification: RealtimeNotification) => {
    const title = isArabic && notification.title_ar 
      ? notification.title_ar 
      : notification.title;
    const body = isArabic && notification.body_ar 
      ? notification.body_ar 
      : notification.body;

    // Play sound based on notification type
    const soundType = notification.type === 'sla_overdue' || notification.type === 'error'
      ? 'urgent'
      : notification.type === 'incidents_new' || notification.type === 'approvals_requested'
      ? 'error'
      : 'info';
    
    playNotificationSound(soundType);

    // Show toast notification
    toast({
      title,
      description: body,
      variant: notification.type === 'error' || notification.type === 'sla_overdue' 
        ? 'destructive' 
        : 'default',
    });

    // Invalidate notification queries to update badge count
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
    queryClient.invalidateQueries({ queryKey: ['unread-notification-count'] });
  }, [isArabic, queryClient]);

  useEffect(() => {
    if (!user?.id) return;

    console.log('[Realtime] Subscribing to notifications for user:', user.id);

    // Subscribe to INSERT events on user_notifications table
    const channel = supabase
      .channel(`user-notifications-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('[Realtime] New notification received:', payload.new);
          showInAppNotification(payload.new as RealtimeNotification);
        }
      )
      .subscribe((status) => {
        console.log('[Realtime] Subscription status:', status);
      });

    return () => {
      console.log('[Realtime] Unsubscribing from notifications');
      supabase.removeChannel(channel);
    };
  }, [user?.id, showInAppNotification]);
}
