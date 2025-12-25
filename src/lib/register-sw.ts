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

  // Check if user has enabled periodic sync
  const periodicSyncEnabled = localStorage.getItem('periodic-sync-enabled') !== 'false';
  if (!periodicSyncEnabled) {
    console.log('Periodic sync disabled by user preference');
    return;
  }

  try {
    // Check permission status
    // @ts-ignore - periodicSync permission is not in TypeScript types
    const status = await navigator.permissions.query({ name: 'periodic-background-sync' });
    
    if (status.state === 'granted') {
      // Register for periodic sync every 4 hours
      // @ts-ignore
      await registration.periodicSync.register('server-updates-sync', {
        minInterval: 4 * 60 * 60 * 1000, // 4 hours in milliseconds
      });
      console.log('Periodic sync registered for server updates');
    } else {
      console.log('Periodic sync permission not granted:', status.state);
    }
  } catch (error) {
    console.log('Periodic sync registration failed:', error);
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
