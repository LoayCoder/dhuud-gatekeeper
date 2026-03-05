/**
 * Notification Hooks
 * 
 * This barrel file exports all hooks related to notifications.
 */

// Core Notifications
export * from './use-notifications';
export * from '@/hooks/use-realtime-notifications';
export * from './use-notification-history';

// Push Notifications
export * from '@/hooks/use-push-notification-preferences';
export * from '@/hooks/use-push-subscription';
export * from '@/hooks/use-push-test';
export * from './use-notification-permission';

// Service Worker Notifications
export * from '@/hooks/use-sw-notification-listener';

// Notification Configuration
export * from './use-notification-matrix';
export * from './use-notification-preview';
export * from './use-notification-delivery-logs';

// Email Notifications
export * from '@/hooks/use-email-notification-preferences';

// Digest
export * from '@/hooks/use-digest-preferences';

// Notification Templates
export * from '@/hooks/useNotificationTemplates';
export * from '@/hooks/useWebpageNotificationSettings';

// HSSE Notifications
export * from '@/features/incidents';
export * from '@/features/incidents';
export * from '@/hooks/use-escalation-alerts';
