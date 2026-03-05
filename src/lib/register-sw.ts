import { logger } from '@/lib/logger';

export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    return;
  }

  // In development, unregister custom service workers to avoid caching issues with HMR
  // BUT preserve OneSignal's service worker for push notifications
  if (import.meta.env.DEV) {
    navigator.serviceWorker.getRegistrations().then(registrations => {
      registrations.forEach(registration => {
        // Check if this is OneSignal's service worker - do NOT unregister it
        const swUrl = registration.active?.scriptURL || registration.installing?.scriptURL || registration.waiting?.scriptURL || '';
        if (swUrl.includes('OneSignalSDKWorker')) {
          logger.debug('[SW] Preserving OneSignal service worker in development mode');
          return;
        }
        registration.unregister();
        logger.debug('[SW] Unregistered non-OneSignal service worker in development mode');
      });
    });
    return;
  }

  // Production only: register service worker for push notifications and offline support
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      logger.info('SW registered:', registration.scope);
      
      // Register periodic background sync if supported and enabled
      await registerPeriodicSync(registration);
    } catch (error) {
      logger.warn('SW registration failed:', error);
    }
  });
}

async function registerPeriodicSync(registration: ServiceWorkerRegistration) {
  // Check if periodic sync is supported
  if (!('periodicSync' in registration)) {
    logger.debug('Periodic Background Sync not supported');
    return;
  }

  // Check if we have a valid window context (required for periodic sync)
  if (typeof window === 'undefined' || !window.document) {
    logger.debug('Periodic sync requires a window context');
    return;
  }

  // Check if user has enabled periodic sync
  const periodicSyncEnabled = localStorage.getItem('periodic-sync-enabled') !== 'false';
  if (!periodicSyncEnabled) {
    logger.debug('Periodic sync disabled by user preference');
    return;
  }

  try {
    // Check permission status - wrap in try-catch as this can fail in some contexts
    let permissionGranted = false;
    try {
      // @ts-expect-error - periodicSync permission is not in TypeScript types
      const status = await navigator.permissions.query({ name: 'periodic-background-sync' });
      permissionGranted = status.state === 'granted';
      
      if (!permissionGranted) {
        logger.info('Periodic sync permission not granted:', status.state);
        return;
      }
    } catch (permError) {
      // Permission API may not support periodic-background-sync query
      logger.debug('Could not query periodic sync permission:', permError);
      return;
    }
    
    // Ensure registration is active before attempting to register sync
    if (registration.active) {
      // @ts-expect-error - required by external dependency
      await registration.periodicSync.register('server-updates-sync', {
        minInterval: 4 * 60 * 60 * 1000, // 4 hours in milliseconds
      });
      logger.info('Periodic sync registered for server updates');
    } else {
      logger.debug('Service worker not yet active, skipping periodic sync registration');
    }
  } catch (error) {
    // Silently handle errors - periodic sync is a progressive enhancement
    if (import.meta.env.DEV) {
      logger.debug('Periodic sync registration failed:', error);
    }
  }
}

export async function unregisterPeriodicSync() {
  if (!('serviceWorker' in navigator)) return;
  
  try {
    const registration = await navigator.serviceWorker.ready;
    if ('periodicSync' in registration) {
      // @ts-expect-error - required by external dependency
      await registration.periodicSync.unregister('server-updates-sync');
      logger.info('Periodic sync unregistered');
    }
  } catch (error) {
    logger.warn('Failed to unregister periodic sync:', error);
  }
}