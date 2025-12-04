const CACHE_NAME = 'dhuud-cache-v2';
const OFFLINE_URL = '/offline.html';
const SYNC_TAG = 'offline-mutations-sync';
const PERIODIC_SYNC_TAG = 'server-updates-sync';
const MUTATION_STORE_KEY = 'offline-mutation-queue';

const STATIC_ASSETS = [
  '/',
  '/offline.html',
  '/fonts/Rubik-Arabic.woff2',
  '/fonts/Rubik-Hebrew.woff2',
  '/fonts/Rubik-Latin.woff2',
  '/fonts/Rubik-LatinExt.woff2',
  '/images/industrial-safety.jpg',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Handle skip waiting message for updates
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  // Handle manual sync trigger from the app
  if (event.data && event.data.type === 'TRIGGER_SYNC') {
    processMutationQueue().then((result) => {
      // Notify all clients about sync result
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({
            type: 'SYNC_COMPLETE',
            success: result.success,
            failed: result.failed,
          });
        });
      });
      
      // Show notification if permission granted
      showSyncNotification(result);
    });
  }
});

// Show notification for sync results
async function showSyncNotification(result) {
  // Check if we have notification permission
  if (self.Notification?.permission !== 'granted') {
    return;
  }

  const { success, failed } = result;
  
  // Don't show notification if nothing happened
  if (success === 0 && failed === 0) {
    return;
  }

  const title = failed > 0 ? 'Sync Partially Failed' : 'Sync Complete';
  const body = failed > 0
    ? `${success} change(s) synced, ${failed} failed`
    : `${success} change(s) synced successfully`;
  const icon = '/pwa-192x192.png';
  const tag = 'sync-notification';

  try {
    await self.registration.showNotification(title, {
      body,
      icon,
      tag,
      badge: '/pwa-192x192.png',
      vibrate: [100, 50, 100],
      data: { success, failed },
      actions: failed > 0 ? [
        { action: 'retry', title: 'Retry' },
        { action: 'dismiss', title: 'Dismiss' }
      ] : []
    });
  } catch (error) {
    console.error('Failed to show notification:', error);
  }
}

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const notificationData = event.notification.data || {};

  if (event.action === 'retry') {
    event.waitUntil(processMutationQueue());
  } else if (event.action === 'update' || notificationData.type === 'update') {
    // Handle update notification - activate new service worker
    event.waitUntil(
      self.registration.waiting?.postMessage({ type: 'SKIP_WAITING' })
    );
    // Reload all clients
    event.waitUntil(
      self.clients.matchAll({ type: 'window' }).then((clients) => {
        clients.forEach(client => client.navigate(client.url));
      })
    );
  } else {
    // Open or focus the app
    event.waitUntil(
      self.clients.matchAll({ type: 'window' }).then((clients) => {
        if (clients.length > 0) {
          return clients[0].focus();
        }
        return self.clients.openWindow('/');
      })
    );
  }
});

// Background Sync event handler
self.addEventListener('sync', (event) => {
  if (event.tag === SYNC_TAG) {
    event.waitUntil(
      processMutationQueue().then((result) => {
        showSyncNotification(result);
        return result;
      })
    );
  }
});

// Periodic Background Sync event handler - checks for server updates
self.addEventListener('periodicsync', (event) => {
  if (event.tag === PERIODIC_SYNC_TAG) {
    event.waitUntil(checkForServerUpdates());
  }
});

// Check for server updates and notify user
async function checkForServerUpdates() {
  try {
    // Fetch latest app version or check for updates
    const response = await fetch('/?_=' + Date.now(), { 
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' }
    });
    
    if (!response.ok) {
      console.log('Server update check failed:', response.status);
      return;
    }

    // Check if there's a new service worker available
    const registration = self.registration;
    await registration.update();
    
    // If there's a waiting worker, notify the user
    if (registration.waiting) {
      await showUpdateNotification();
    }

    // Also sync any pending mutations while we're at it
    const mutationResult = await processMutationQueue();
    if (mutationResult.success > 0 || mutationResult.failed > 0) {
      showSyncNotification(mutationResult);
    }

    // Notify clients about the periodic sync completion
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'PERIODIC_SYNC_COMPLETE',
        timestamp: Date.now(),
        hasUpdate: !!registration.waiting,
      });
    });

    console.log('Periodic sync completed at:', new Date().toISOString());
  } catch (error) {
    console.error('Periodic sync failed:', error);
  }
}

// Show notification when updates are available
async function showUpdateNotification() {
  if (self.Notification?.permission !== 'granted') {
    return;
  }

  try {
    await self.registration.showNotification('Update Available', {
      body: 'A new version of the app is available. Tap to update.',
      icon: '/pwa-192x192.png',
      tag: 'update-notification',
      badge: '/pwa-192x192.png',
      vibrate: [100, 50, 100],
      data: { type: 'update' },
      actions: [
        { action: 'update', title: 'Update Now' },
        { action: 'dismiss', title: 'Later' }
      ]
    });
  } catch (error) {
    console.error('Failed to show update notification:', error);
  }
}

// Process queued mutations
async function processMutationQueue() {
  const result = { success: 0, failed: 0 };
  
  try {
    // Get mutations from IndexedDB or localStorage via client
    const clients = await self.clients.matchAll();
    if (clients.length === 0) return result;
    
    // Request mutation queue from the main thread
    const client = clients[0];
    
    return new Promise((resolve) => {
      const messageChannel = new MessageChannel();
      
      messageChannel.port1.onmessage = async (event) => {
        const mutations = event.data.mutations || [];
        
        for (const mutation of mutations) {
          try {
            // Execute the mutation (simplified - actual implementation depends on mutation type)
            const response = await executeMutation(mutation);
            if (response.ok) {
              result.success++;
              // Notify client to remove successful mutation
              client.postMessage({ 
                type: 'MUTATION_SUCCESS', 
                id: mutation.id 
              });
            } else {
              result.failed++;
            }
          } catch (error) {
            result.failed++;
            console.error('Mutation failed:', error);
          }
        }
        
        resolve(result);
      };
      
      client.postMessage(
        { type: 'GET_MUTATIONS' },
        [messageChannel.port2]
      );
      
      // Timeout fallback
      setTimeout(() => resolve(result), 30000);
    });
  } catch (error) {
    console.error('Background sync failed:', error);
    return result;
  }
}

// Execute a single mutation
async function executeMutation(mutation) {
  // This is a placeholder - actual implementation would depend on mutation structure
  // The mutation should contain the endpoint, method, and body
  if (!mutation.endpoint) {
    return { ok: false };
  }
  
  return fetch(mutation.endpoint, {
    method: mutation.method || 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...mutation.headers,
    },
    body: mutation.body ? JSON.stringify(mutation.body) : undefined,
  });
}

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests and API calls
  if (request.method !== 'GET' || url.pathname.startsWith('/api')) {
    return;
  }

  // Cache-first for static assets (fonts, images)
  if (
    url.pathname.startsWith('/fonts/') ||
    url.pathname.startsWith('/images/') ||
    url.pathname.endsWith('.woff2') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.svg')
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        return cached || fetch(request).then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        });
      })
    );
    return;
  }

  // Network-first for JS/CSS bundles (ensures latest code)
  if (url.pathname.endsWith('.js') || url.pathname.endsWith('.css')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Network-first for HTML (SPA navigation)
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok && url.origin === self.location.origin) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => caches.match(request).then((cached) => cached || caches.match(OFFLINE_URL)))
  );
});
