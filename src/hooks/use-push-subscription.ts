import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

// VAPID public key would be provided by environment
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

interface PushSubscriptionState {
  isSubscribed: boolean;
  isSupported: boolean;
  isLoading: boolean;
  error: string | null;
  subscription: PushSubscription | null;
}

/**
 * Convert a base64 string to Uint8Array for VAPID key
 */
function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray.buffer;
}

/**
 * Hook to manage push notification subscriptions
 */
export function usePushSubscription() {
  const { profile, user } = useAuth();
  const [state, setState] = useState<PushSubscriptionState>({
    isSubscribed: false,
    isSupported: false,
    isLoading: true,
    error: null,
    subscription: null,
  });

  const isSupported =
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window;

  const checkSubscription = useCallback(async () => {
    if (!isSupported) {
      setState((prev) => ({ ...prev, isSupported: false, isLoading: false }));
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      setState({
        isSubscribed: !!subscription,
        isSupported: true,
        isLoading: false,
        error: null,
        subscription,
      });
    } catch (error) {
      console.error('Error checking push subscription:', error);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: 'Failed to check subscription status',
      }));
    }
  }, [isSupported]);

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported || !VAPID_PUBLIC_KEY) {
      setState((prev) => ({
        ...prev,
        error: 'Push notifications are not supported or not configured',
      }));
      return false;
    }

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: 'Notification permission denied',
        }));
        return false;
      }

      const registration = await navigator.serviceWorker.ready;

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      const subscriptionJSON = subscription.toJSON();

      const subscriptionData = {
        user_id: user?.id,
        tenant_id: profile?.tenant_id,
        endpoint: subscriptionJSON.endpoint,
        p256dh_key: subscriptionJSON.keys?.p256dh,
        auth_key: subscriptionJSON.keys?.auth,
        is_active: true,
        created_at: new Date().toISOString(),
      };

      localStorage.setItem('push_subscription', JSON.stringify(subscriptionData));

      setState({
        isSubscribed: true,
        isSupported: true,
        isLoading: false,
        error: null,
        subscription,
      });

      return true;
    } catch (error) {
      console.error('Error subscribing to push:', error);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to subscribe',
      }));
      return false;
    }
  }, [isSupported, user?.id, profile?.tenant_id]);

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!state.subscription) return true;

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      await state.subscription.unsubscribe();
      localStorage.removeItem('push_subscription');

      setState({
        isSubscribed: false,
        isSupported: true,
        isLoading: false,
        error: null,
        subscription: null,
      });

      return true;
    } catch (error) {
      console.error('Error unsubscribing from push:', error);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to unsubscribe',
      }));
      return false;
    }
  }, [state.subscription]);

  useEffect(() => {
    checkSubscription();
  }, [checkSubscription]);

  return {
    ...state,
    subscribe,
    unsubscribe,
    refresh: checkSubscription,
  };
}

/**
 * Hook to check if push notifications are available
 */
export function usePushNotificationStatus() {
  const [status, setStatus] = useState<{
    isSupported: boolean;
    permission: NotificationPermission | null;
    hasServiceWorker: boolean;
  }>({
    isSupported: false,
    permission: null,
    hasServiceWorker: false,
  });

  useEffect(() => {
    const checkStatus = async () => {
      const isSupported =
        typeof window !== 'undefined' &&
        'serviceWorker' in navigator &&
        'PushManager' in window &&
        'Notification' in window;

      if (!isSupported) {
        setStatus({ isSupported: false, permission: null, hasServiceWorker: false });
        return;
      }

      const hasServiceWorker = !!(await navigator.serviceWorker.ready.catch(() => null));

      setStatus({
        isSupported: true,
        permission: Notification.permission,
        hasServiceWorker,
      });
    };

    checkStatus();
  }, []);

  return status;
}
