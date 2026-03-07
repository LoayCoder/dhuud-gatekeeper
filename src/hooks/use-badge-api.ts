import { useCallback, useEffect, useState } from 'react';

// Extend Navigator for Badge API (experimental)
interface NavigatorWithBadge {
  setAppBadge?: (count: number) => Promise<void>;
  clearAppBadge?: () => Promise<void>;
}

interface BadgeAPI {
  isSupported: boolean;
  setBadge: (count: number) => Promise<void>;
  clearBadge: () => Promise<void>;
}

/**
 * Hook to manage the Badge API for showing notification counts
 * on the app icon (desktop PWA and some mobile browsers)
 */
export function useBadgeAPI(): BadgeAPI {
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    const supported = 'setAppBadge' in navigator && 'clearAppBadge' in navigator;
    setIsSupported(supported);
  }, []);

  const setBadge = useCallback(async (count: number) => {
    if (!isSupported) return;
    const nav = navigator as NavigatorWithBadge;
    try {
      if (count > 0) {
        await nav.setAppBadge?.(count);
      } else {
        await nav.clearAppBadge?.();
      }
    } catch (error) {
      console.debug('[Badge API] Failed to set badge:', error);
    }
  }, [isSupported]);

  const clearBadge = useCallback(async () => {
    if (!isSupported) return;
    const nav = navigator as NavigatorWithBadge;
    try {
      await nav.clearAppBadge?.();
    } catch (error) {
      console.debug('[Badge API] Failed to clear badge:', error);
    }
  }, [isSupported]);

  return { isSupported, setBadge, clearBadge };
}

/**
 * Hook that automatically syncs unread notification count to the app badge
 */
export function useNotificationBadge(unreadCount: number) {
  const { isSupported, setBadge, clearBadge } = useBadgeAPI();

  useEffect(() => {
    if (!isSupported) return;
    if (unreadCount > 0) {
      setBadge(unreadCount);
    } else {
      clearBadge();
    }
    return () => { clearBadge(); };
  }, [unreadCount, isSupported, setBadge, clearBadge]);

  return { isSupported };
}
