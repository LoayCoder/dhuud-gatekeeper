/**
 * Push Subscription Hook Stubs
 */

export function usePushSubscription() {
  return {
    isSubscribed: false,
    isSupported: typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window,
    subscribe: async () => false,
    unsubscribe: async () => false,
  };
}

export function usePushNotificationStatus() {
  return {
    permission: typeof window !== 'undefined' && 'Notification' in window
      ? Notification.permission
      : 'default' as NotificationPermission,
  };
}
