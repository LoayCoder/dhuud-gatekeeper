export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    return;
  }

  // In development, unregister service workers to avoid caching issues with HMR
  if (import.meta.env.DEV) {
    navigator.serviceWorker.getRegistrations().then(registrations => {
      registrations.forEach(registration => {
        registration.unregister();
        console.log('[SW] Unregistered service worker in development mode');
      });
    });
    return;
  }

  // Production only: register service worker for push notifications and offline support
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('SW registered:', registration.scope);
      
      // Register periodic background sync if supported and enabled
      await registerPeriodicSync(registration);
    } catch (error) {
      console.log('SW registration failed:', error);
    }
  });
}

async function registerPeriodicSync(registration: ServiceWorkerRegistration) {
  // Check if periodic sync is supported
  if (!('periodicSync' in registration)) {
    console.log('Periodic Background Sync not supported');
    return;
  }

  // Check if we have a valid window context (required for periodic sync)
  if (typeof window === 'undefined' || !window.document) {
    console.log('Periodic sync requires a window context');
    return;
  }

  // Check if user has enabled periodic sync
  const periodicSyncEnabled = localStorage.getItem('periodic-sync-enabled') !== 'false';
  if (!periodicSyncEnabled) {
    console.log('Periodic sync disabled by user preference');
    return;
  }

  try {
    // Check permission status - wrap in try-catch as this can fail in some contexts
    let permissionGranted = false;
    try {
      // @ts-ignore - periodicSync permission is not in TypeScript types
      const status = await navigator.permissions.query({ name: 'periodic-background-sync' });
      permissionGranted = status.state === 'granted';
      
      if (!permissionGranted) {
        console.log('Periodic sync permission not granted:', status.state);
        return;
      }
    } catch (permError) {
      // Permission API may not support periodic-background-sync query
      console.log('Could not query periodic sync permission:', permError);
      return;
    }
    
    // Ensure registration is active before attempting to register sync
    if (registration.active) {
      // @ts-ignore
      await registration.periodicSync.register('server-updates-sync', {
        minInterval: 4 * 60 * 60 * 1000, // 4 hours in milliseconds
      });
      console.log('Periodic sync registered for server updates');
    } else {
      console.log('Service worker not yet active, skipping periodic sync registration');
    }
  } catch (error) {
    // Silently handle errors - periodic sync is a progressive enhancement
    if (import.meta.env.DEV) {
      console.log('Periodic sync registration failed:', error);
    }
  }
}

export async function unregisterPeriodicSync() {
  if (!('serviceWorker' in navigator)) return;
  
  try {
    const registration = await navigator.serviceWorker.ready;
    // @ts-ignore
    if ('periodicSync' in registration) {
      // @ts-ignore
      await registration.periodicSync.unregister('server-updates-sync');
      console.log('Periodic sync unregistered');
    }
  } catch (error) {
    console.log('Failed to unregister periodic sync:', error);
  }
}
