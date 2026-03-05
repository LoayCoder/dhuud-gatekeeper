// Barrel file — re-exports all HSSE notification hooks and types
export type {
    HSSENotification,
    NotificationAcknowledgment,
    NotificationRead,
    CreateNotificationData,
} from './types';

export { useHSSENotificationsAdmin } from './use-hsse-notifications-admin';

export {
    useHSSENotificationsUser,
    useNotificationStats,
} from './use-hsse-notifications-user';
