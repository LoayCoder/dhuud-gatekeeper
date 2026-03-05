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
    include_workers_on_site: boolean;
    include_visitors_on_site: boolean;
    worker_whatsapp_sent_at: string | null;
    visitor_whatsapp_sent_at: string | null;
    worker_messages_sent: number;
    visitor_messages_sent: number;
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
    include_workers_on_site?: boolean;
    include_visitors_on_site?: boolean;
}
