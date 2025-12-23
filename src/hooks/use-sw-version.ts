import { useEffect, useState, useCallback } from 'react';

interface SWVersionInfo {
  version: string | null;
  timestamp: number | null;
  isLoading: boolean;
  hasUpdate: boolean;
  checkForUpdates: () => Promise<boolean>;
  applyUpdate: () => void;
}

/**
 * Hook to track Service Worker version and handle updates
 */
export function useSWVersion(): SWVersionInfo {
  const [version, setVersion] = useState<string | null>(null);
  const [timestamp, setTimestamp] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasUpdate, setHasUpdate] = useState(false);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) {
      setIsLoading(false);
      return;
    }

    // Listen for version messages from Service Worker
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'SW_VERSION') {
        setVersion(event.data.version);
        setTimestamp(event.data.timestamp);
        setIsLoading(false);
      }
      
      if (event.data?.type === 'SW_UPDATE_AVAILABLE') {
        setHasUpdate(true);
      }
    };

    navigator.serviceWorker.addEventListener('message', handleMessage);

    // Check for existing controller and request version
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'GET_VERSION' });
    }

    // Also listen for controller changes (new SW activated)
    const handleControllerChange = () => {
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: 'GET_VERSION' });
      }
    };

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

    // Check registration for waiting worker (update available)
    navigator.serviceWorker.ready.then((registration) => {
      if (registration.waiting) {
        setHasUpdate(true);
      }
      
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              setHasUpdate(true);
            }
          });
        }
      });
    });

    // Initial load timeout
    const timeout = setTimeout(() => {
      setIsLoading(false);
    }, 3000);

    return () => {
      navigator.serviceWorker.removeEventListener('message', handleMessage);
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
      clearTimeout(timeout);
    };
  }, []);

  const checkForUpdates = useCallback(async (): Promise<boolean> => {
    if (!('serviceWorker' in navigator)) return false;

    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.update();
      
      if (registration.waiting) {
        setHasUpdate(true);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('[SW Version] Update check failed:', error);
      return false;
    }
  }, []);

  const applyUpdate = useCallback(() => {
    if (!('serviceWorker' in navigator)) return;

    navigator.serviceWorker.ready.then((registration) => {
      if (registration.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
    });

    // Reload to activate new SW
    window.location.reload();
  }, []);

  return {
    version,
    timestamp,
    isLoading,
    hasUpdate,
    checkForUpdates,
    applyUpdate,
  };
}
