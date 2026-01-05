import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

// VAPID public key from environment
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

/**
 * Validate VAPID public key format
 * - Must be non-empty
 * - Must contain only valid URL-safe Base64 characters
 * - Must have minimum length (VAPID public keys are ~87 chars)
 */
function isValidVapidPublicKey(key: string | undefined): key is string {
  if (!key || typeof key !== 'string') {
    return false;
  }
  
  // Check for unresolved env variable patterns
  if (key.includes('${') || key === 'undefined' || key === 'null') {
    return false;
  }
  
  // VAPID public keys are typically 87 characters in URL-safe Base64
  if (key.length < 80 || key.length > 100) {
    return false;
  }
  
  // Check for valid URL-safe Base64 characters only
  const validBase64UrlRegex = /^[A-Za-z0-9_-]+$/;
  return validBase64UrlRegex.test(key);
}

/**
 * Convert a URL-safe base64 string to Uint8Array for VAPID key
 * Returns null if decoding fails or key is invalid
 */
function urlBase64ToUint8Array(base64String: string): ArrayBuffer | null {
  try {
    // Add padding if necessary
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    // Convert URL-safe Base64 to standard Base64
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    
    // Decode Base64 to binary string
    const rawData = window.atob(base64);
    
    // VAPID public key must be exactly 65 bytes (P-256 uncompressed point)
    if (rawData.length !== 65) {
      console.error('[Push] Invalid VAPID key length:', rawData.length, '(expected 65 bytes)');
      return null;
    }
    
    // Convert binary string to Uint8Array
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    
    return outputArray.buffer;
  } catch (error) {
    console.error('[Push] Failed to decode VAPID key:', error instanceof Error ? error.message : error);
    return null;
  }
}

// Log VAPID key info when module loads (for debugging)
if (typeof window !== 'undefined') {
  console.log('[Push] 🔑 VAPID Key Check:');
  console.log('[Push]   - Key loaded:', VAPID_PUBLIC_KEY ? 'Yes' : 'No');
  console.log('[Push]   - Key length:', VAPID_PUBLIC_KEY?.length || 0);
  
  if (VAPID_PUBLIC_KEY) {
    const isValid = isValidVapidPublicKey(VAPID_PUBLIC_KEY);
    console.log('[Push]   - Format valid:', isValid);
    if (isValid) {
      const testDecode = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
      console.log('[Push]   - Decode test:', testDecode ? 'Passed' : 'Failed');
      console.log('[Push]   - Expected key: BGNgPMHETSMk09BaEp4zcplZAuBi3WM_TQIN_uleDqOyxMo_BZsQjLSd0kbeITiNC4SclPMqLEn_jBzoju3eI_Y');
      console.log('[Push]   - Match:', VAPID_PUBLIC_KEY === 'BGNgPMHETSMk09BaEp4zcplZAuBi3WM_TQIN_uleDqOyxMo_BZsQjLSd0kbeITiNC4SclPMqLEn_jBzoju3eI_Y');
    }
  }
}

interface PushSubscriptionState {
  isSubscribed: boolean;
  isSupported: boolean;
  isLoading: boolean;
  error: string | null;
  subscription: PushSubscription | null;
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

  // Enhanced mobile detection
  const isMobile = typeof window !== 'undefined' && (
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
    ('ontouchstart' in window)
  );

  const isStandalone = typeof window !== 'undefined' && (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );

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
      // Wait for service worker with timeout for mobile
      const swPromise = navigator.serviceWorker.ready;
      const timeoutPromise = new Promise<ServiceWorkerRegistration>((_, reject) => 
        setTimeout(() => reject(new Error('Service worker timeout')), isMobile ? 10000 : 5000)
      );
      
      const registration = await Promise.race([swPromise, timeoutPromise]);
      const subscription = await registration.pushManager.getSubscription();

      setState({
        isSubscribed: !!subscription,
        isSupported: true,
        isLoading: false,
        error: null,
        subscription,
      });
      
      // Log mobile PWA status for debugging
      if (isMobile) {
        console.log('[Push] Mobile PWA status:', { isStandalone, hasSubscription: !!subscription });
      }
    } catch (error) {
      console.error('Error checking push subscription:', error);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        isSupported: true, // Still mark as supported, just failed to check
        error: 'Failed to check subscription status',
      }));
    }
  }, [isSupported, isMobile, isStandalone]);

  const subscribe = useCallback(async (): Promise<boolean> => {
    console.log('[Push] Starting subscription process...');
    console.log('[Push] isSupported:', isSupported);
    
    // Validate browser support
    if (!isSupported) {
      const errorMsg = 'Push notifications are not supported in this browser';
      console.error('[Push]', errorMsg);
      setState((prev) => ({ ...prev, error: errorMsg }));
      return false;
    }

    // Validate VAPID key format before attempting to use it
    if (!isValidVapidPublicKey(VAPID_PUBLIC_KEY)) {
      const errorMsg = 'Push notifications unavailable - invalid configuration';
      console.error('[Push]', errorMsg, 'Key:', VAPID_PUBLIC_KEY ? VAPID_PUBLIC_KEY.substring(0, 20) + '...' : 'undefined');
      setState((prev) => ({ ...prev, error: errorMsg }));
      return false;
    }

    // Pre-decode VAPID key to catch errors early
    const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
    if (!applicationServerKey) {
      const errorMsg = 'Push notifications unavailable - failed to process VAPID key';
      console.error('[Push]', errorMsg);
      setState((prev) => ({ ...prev, error: errorMsg }));
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
        applicationServerKey,
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

  // Re-activate subscription in database if browser has one but DB may be stale
  const syncSubscriptionWithDatabase = useCallback(async () => {
    if (!user?.id || !profile?.tenant_id || !state.subscription) return;
    
    const subscriptionJSON = state.subscription.toJSON();
    console.log('[Push] Syncing subscription with database...');
    
    // Re-activate subscription if exists in browser
    const saved = await saveSubscriptionToDatabase(
      user.id,
      profile.tenant_id,
      subscriptionJSON
    );
    
    if (saved) {
      console.log('[Push] Subscription synced/reactivated in database');
    }
  }, [user?.id, profile?.tenant_id, state.subscription]);

  // Initial check on mount
  useEffect(() => {
    checkSubscription();
  }, [checkSubscription]);

  // Sync subscription with database when user is authenticated and subscription exists
  useEffect(() => {
    if (user?.id && profile?.tenant_id && state.subscription && !state.isLoading) {
      syncSubscriptionWithDatabase();
    }
  }, [user?.id, profile?.tenant_id, state.subscription, state.isLoading, syncSubscriptionWithDatabase]);

  return {
    ...state,
    subscribe,
    unsubscribe,
    refresh: checkSubscription,
    isMobile: typeof window !== 'undefined' && (
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
      ('ontouchstart' in window)
    ),
    isStandalone: typeof window !== 'undefined' && (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true
    ),
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
