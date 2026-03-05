import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import type { HSSENotification } from "./types";

export function useHSSENotificationsUser() {
    const { t, i18n } = useTranslation();
    const { user, profile } = useAuth();
    const queryClient = useQueryClient();

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
        staleTime: 60 * 1000,
    });

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

    const { data: pendingMandatory } = useQuery({
        queryKey: ['hsse-pending-mandatory', user?.id],
        queryFn: async () => {
            if (!user?.id) return [];

            const { data, error } = await supabase.rpc('get_pending_mandatory_notifications');

            if (error) throw error;
            return data || [];
        },
        enabled: !!user?.id,
        refetchInterval: 60 * 1000,
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

            if (error && !error.message.includes('duplicate')) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['hsse-notification-reads'] });
        },
    });

    const getLocalizedTitle = (notification: HSSENotification) => {
        if (i18n.language === 'ar' && notification.title_ar) {
            return notification.title_ar;
        }
        return notification.title_en;
    };

    const getLocalizedBody = (notification: HSSENotification) => {
        if (i18n.language === 'ar' && notification.body_ar) {
            return notification.body_ar;
        }
        return notification.body_en;
    };

    const isAcknowledged = (notificationId: string) => {
        return acknowledgments?.some(a => a.notification_id === notificationId) ?? false;
    };

    const isRead = (notificationId: string) => {
        return reads?.some(r => r.notification_id === notificationId) ?? false;
    };

    const unreadCount = notifications?.filter(n => !isRead(n.id) && !isAcknowledged(n.id)).length ?? 0;
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
