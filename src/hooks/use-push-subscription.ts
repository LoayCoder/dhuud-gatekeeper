import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

// VAPID public key from environment
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

// Debug log for VAPID key availability
if (!VAPID_PUBLIC_KEY) {
  console.warn('[Push] VAPID public key not configured - push notifications will not work');
} else {
  console.log('[Push] VAPID public key available');
}

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
 * Save subscription to Supabase database
 */
async function saveSubscriptionToDatabase(
  userId: string,
  tenantId: string,
  subscription: PushSubscriptionJSON
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('push_subscriptions')
      .upsert({
        user_id: userId,
        tenant_id: tenantId,
        endpoint: subscription.endpoint,
        p256dh_key: subscription.keys?.p256dh,
        auth_key: subscription.keys?.auth,
        is_active: true,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,endpoint',
      });

    if (error) {
      console.error('Failed to save subscription to database:', error);
      return false;
    }
    return true;
  } catch (error) {
    console.error('Error saving subscription:', error);
    return false;
  }
}

/**
 * Mark subscription as inactive in database
 */
async function deactivateSubscriptionInDatabase(endpoint: string): Promise<void> {
  try {
    await supabase
      .from('push_subscriptions')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('endpoint', endpoint);
  } catch (error) {
    console.error('Error deactivating subscription:', error);
  }
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
    console.log('[Push] Starting subscription process...');
    console.log('[Push] isSupported:', isSupported);
    console.log('[Push] VAPID_PUBLIC_KEY available:', !!VAPID_PUBLIC_KEY);
    
    if (!isSupported || !VAPID_PUBLIC_KEY) {
      const errorMsg = !isSupported 
        ? 'Push notifications are not supported in this browser'
        : 'VAPID key not configured - contact administrator';
      console.error('[Push]', errorMsg);
      setState((prev) => ({
        ...prev,
        error: errorMsg,
      }));
      return false;
    }

    if (!user?.id || !profile?.tenant_id) {
      console.error('[Push] User not authenticated or missing tenant_id');
      setState((prev) => ({
        ...prev,
        error: 'User must be logged in to subscribe',
      }));
      return false;
    }

    console.log('[Push] User ID:', user.id, 'Tenant ID:', profile.tenant_id);
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      console.log('[Push] Requesting notification permission...');
      const permission = await Notification.requestPermission();
      console.log('[Push] Permission result:', permission);
      
      if (permission !== 'granted') {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: 'Notification permission denied',
        }));
        return false;
      }

      console.log('[Push] Waiting for service worker...');
      const registration = await navigator.serviceWorker.ready;
      console.log('[Push] Service worker ready:', registration.scope);

      console.log('[Push] Subscribing to push manager...');
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
      console.log('[Push] Push subscription created:', subscription.endpoint);

      const subscriptionJSON = subscription.toJSON();

      // Save to Supabase database for server-side push
      console.log('[Push] Saving subscription to database...');
      const saved = await saveSubscriptionToDatabase(
        user.id,
        profile.tenant_id,
        subscriptionJSON
      );

      if (!saved) {
        console.warn('[Push] Subscription created but failed to save to database');
      } else {
        console.log('[Push] Subscription saved to database successfully');
      }

      // Also keep in localStorage as backup
      localStorage.setItem('push_subscription', JSON.stringify({
        endpoint: subscriptionJSON.endpoint,
        created_at: new Date().toISOString(),
      }));

      setState({
        isSubscribed: true,
        isSupported: true,
        isLoading: false,
        error: null,
        subscription,
      });

      return true;
    } catch (error) {
      console.error('[Push] Error subscribing to push:', error);
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
      const endpoint = state.subscription.endpoint;
      await state.subscription.unsubscribe();
      
      // Mark as inactive in database
      await deactivateSubscriptionInDatabase(endpoint);
      
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
