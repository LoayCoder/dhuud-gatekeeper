import { useEffect, useState } from 'react';

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
