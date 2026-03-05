import { supabase } from '@/integrations/supabase/client';

// ==========================================
// Notifications
// ==========================================

export interface Notification {
    id: string;
    tenant_id: string;
    user_id: string;
    title: string;
    title_ar?: string;
    body?: string;
    body_ar?: string;
    type: string;
    related_entity_type?: string;
    related_entity_id?: string;
    is_read: boolean;
    read_at?: string;
    created_at: string;
}

export async function getNotifications(userId: string, limit: number = 20) {
    const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error) throw error;
    return data;
}

export async function getUnreadNotificationCount(userId: string) {
    const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false)
        .is('deleted_at', null);

    if (error) throw error;
    return count || 0;
}

export async function markNotificationRead(notificationId: string, userId: string) {
    const { error } = await supabase
        .from('notifications')
        .update({
            is_read: true,
            read_at: new Date().toISOString(),
        })
        .eq('id', notificationId)
        .eq('user_id', userId);

    if (error) throw error;
    return notificationId;
}

export async function markAllNotificationsRead(userId: string) {
    const { error } = await supabase
        .from('notifications')
        .update({
            is_read: true,
            read_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .eq('is_read', false);

    if (error) throw error;
    return userId;
}

export async function createNotification(notification: Omit<Notification, 'id' | 'created_at' | 'is_read' | 'read_at'>) {
    const { data, error } = await supabase
        .from('notifications')
        .insert({
            ...notification,
            is_read: false,
        })
        .select()
        .single();

    if (error) throw error;
    return data;
}

// ==========================================
// Host Arrival Notification (WhatsApp)
// ==========================================

export interface HostArrivalNotificationParams {
    entryId: string;
    visitorName: string;
    hostPhone: string;
    visitReference: string;
    entryTime: string;
    tenantId: string;
}

export async function sendHostArrivalNotification(params: HostArrivalNotificationParams) {
    const { data, error } = await supabase.functions.invoke('send-gate-whatsapp', {
        body: {
            mobile_number: params.hostPhone,
            tenant_id: params.tenantId,
            notification_type: 'host_arrival',
            visitor_name: params.visitorName,
            visit_reference: params.visitReference,
            entry_time: params.entryTime,
            entry_id: params.entryId,
        },
    });

    if (error) throw error;
    if (!data?.success) throw new Error(data?.error || 'Failed to send notification');

    return data;
}
