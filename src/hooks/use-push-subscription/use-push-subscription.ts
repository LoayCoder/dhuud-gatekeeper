import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { logger } from '@/lib/logger';
import type { PushSubscriptionState } from './types';
import {
    isValidVapidPublicKey,
    urlBase64ToUint8Array,
    saveSubscriptionToDatabase,
    deactivateSubscriptionInDatabase,
    VAPID_PUBLIC_KEY,
} from './push-subscription-helpers';

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
            const subscription = await (registration as ServiceWorkerRegistration & { pushManager: PushManager }).pushManager.getSubscription();

            setState({
                isSubscribed: !!subscription,
                isSupported: true,
                isLoading: false,
                error: null,
                subscription,
            });

            // Log mobile PWA status for debugging
            if (isMobile) {
                logger.debug('[Push] Mobile PWA status:', { isStandalone, hasSubscription: !!subscription });
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
        logger.debug('[Push] Starting subscription process...');
        logger.debug('[Push] isSupported:', isSupported);

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

        logger.debug('[Push] User ID:', user.id, 'Tenant ID:', profile.tenant_id);
        setState((prev) => ({ ...prev, isLoading: true, error: null }));

        try {
            logger.debug('[Push] Requesting notification permission...');
            const permission = await Notification.requestPermission();
            logger.debug('[Push] Permission result:', permission);

            if (permission !== 'granted') {
                setState((prev) => ({
                    ...prev,
                    isLoading: false,
                    error: 'Notification permission denied',
                }));
                return false;
            }

            logger.debug('[Push] Waiting for service worker...');
            const registration = await navigator.serviceWorker.ready;
            logger.debug('[Push] Service worker ready:', registration.scope);

            logger.debug('[Push] Subscribing to push manager...');
            const subscription = await (registration as ServiceWorkerRegistration & { pushManager: PushManager }).pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey,
            });
            logger.debug('[Push] Push subscription created:', subscription.endpoint);

            const subscriptionJSON = subscription.toJSON();

            // Save to Supabase database for server-side push
            logger.debug('[Push] Saving subscription to database...');
            const saved = await saveSubscriptionToDatabase(
                user.id,
                profile.tenant_id,
                subscriptionJSON
            );

            if (!saved) {
                logger.warn('[Push] Subscription created but failed to save to database');
            } else {
                logger.debug('[Push] Subscription saved to database successfully');
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
        logger.debug('[Push] Syncing subscription with database...');

        // Re-activate subscription if exists in browser
        const saved = await saveSubscriptionToDatabase(
            user.id,
            profile.tenant_id,
            subscriptionJSON
        );

        if (saved) {
            logger.debug('[Push] Subscription synced/reactivated in database');
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

    // Listen for permission changes (e.g., user re-enables after revoking)
    useEffect(() => {
        if ('permissions' in navigator) {
            navigator.permissions.query({ name: 'notifications' as PermissionName })
                .then(permissionStatus => {
                    permissionStatus.onchange = () => {
                        logger.debug('[Push] Permission status changed:', permissionStatus.state);
                        checkSubscription();
                    };
                })
                .catch(console.debug);
        }
    }, [checkSubscription]);

    const isAuthenticated = !!user?.id && !!profile?.tenant_id;

    return {
        ...state,
        subscribe,
        unsubscribe,
        refresh: checkSubscription,
        isAuthenticated,
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
