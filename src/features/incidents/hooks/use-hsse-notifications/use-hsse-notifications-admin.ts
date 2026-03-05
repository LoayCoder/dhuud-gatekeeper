import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { logger } from "@/lib/logger";
import type { HSSENotification, CreateNotificationData } from "./types";

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
                    include_workers_on_site: data.include_workers_on_site ?? false,
                    include_visitors_on_site: data.include_visitors_on_site ?? false,
                })
                .select()
                .single();

            if (error) throw error;

            if (data.publish_immediately && (
                data.send_push_notification ||
                data.send_email_notification ||
                data.include_workers_on_site ||
                data.include_visitors_on_site
            )) {
                try {
                    logger.debug('[HSSE] Triggering send-hsse-notification for:', newNotification.id);
                    const { error: sendError } = await supabase.functions.invoke('send-hsse-notification', {
                        body: {
                            notification_id: newNotification.id,
                            tenant_id: profile.tenant_id,
                        },
                    });
                    if (sendError) {
                        logger.error('[HSSE] Send function error:', sendError);
                    } else {
                        logger.debug('[HSSE] Send function triggered successfully');
                    }
                } catch (sendError) {
                    console.error('[HSSE] Failed to trigger send function:', sendError);
                }
            }

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
            const { data: notification, error } = await supabase
                .from('hsse_notifications')
                .update({ published_at: new Date().toISOString() })
                .eq('id', notificationId)
                .select()
                .single();

            if (error) throw error;

            if (notification && (
                notification.send_push_notification ||
                notification.send_email_notification ||
                notification.include_workers_on_site ||
                notification.include_visitors_on_site
            )) {
                try {
                    logger.debug('[HSSE] Triggering send on publish for:', notificationId);
                    const { error: sendError } = await supabase.functions.invoke('send-hsse-notification', {
                        body: {
                            notification_id: notificationId,
                            tenant_id: profile?.tenant_id,
                        },
                    });
                    if (sendError) {
                        logger.error('[HSSE] Send function error:', sendError);
                    }
                } catch (sendError) {
                    console.error('[HSSE] Failed to trigger send:', sendError);
                }
            }

            return notification;
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
