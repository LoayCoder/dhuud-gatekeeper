const CACHE_NAME = 'dhuud-cache-v3';
const API_CACHE_NAME = 'dhuud-api-cache-v1';
const STATIC_CACHE_NAME = 'dhuud-static-cache-v1';
const OFFLINE_URL = '/offline.html';
const SYNC_TAG = 'offline-mutations-sync';
const PERIODIC_SYNC_TAG = 'server-updates-sync';
const MUTATION_STORE_KEY = 'offline-mutation-queue';

// Maximum entries for API cache
const API_CACHE_MAX_ENTRIES = 100;

const STATIC_ASSETS = [
  '/',
  '/offline.html',
  '/fonts/Rubik-Arabic.woff2',
  '/fonts/Rubik-Hebrew.woff2',
  '/fonts/Rubik-Latin.woff2',
  '/fonts/Rubik-LatinExt.woff2',
  '/images/industrial-safety.jpg',
  // Gate Guard Dashboard - precache for offline access
  '/security/gate-dashboard',
];

// Gate-specific API endpoints for enhanced caching
const GATE_API_PATTERNS = [
  '/rest/v1/gate_entry_logs',
  '/rest/v1/security_blacklist',
  '/rest/v1/contractor_access_logs',
  '/rest/v1/geofence_alerts',
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
  const currentCaches = [CACHE_NAME, API_CACHE_NAME, STATIC_CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => !currentCaches.includes(name))
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// NOTE: Main message handler is defined after showUrgentSLANotification function (line ~187)

// Store notification in history by sending to clients
function storeNotificationInHistory(title, body, type) {
  self.clients.matchAll().then(clients => {
    clients.forEach(client => {
      client.postMessage({
        type: 'STORE_NOTIFICATION',
        notification: { title, body, type }
      });
    });
  });
}

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
  const icon = 'https://xdlowvfzhvjzbtgvurzj.supabase.co/storage/v1/object/public/branding/9290e913-c735-405c-91c6-141e966011ae/favicon/1764707368310.png';
  const tag = 'sync-notification';
  const notificationType = failed > 0 ? 'error' : 'sync';

  try {
    await self.registration.showNotification(title, {
      body,
      icon,
      tag,
      badge: 'https://xdlowvfzhvjzbtgvurzj.supabase.co/storage/v1/object/public/branding/9290e913-c735-405c-91c6-141e966011ae/favicon/1764707368310.png',
      vibrate: [100, 50, 100],
      data: { success, failed },
      actions: failed > 0 ? [
        { action: 'retry', title: 'Retry' },
        { action: 'dismiss', title: 'Dismiss' }
      ] : []
    });
    
    // Store in notification history
    storeNotificationInHistory(title, body, notificationType);
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
  } else if (notificationData.type === 'sla_escalation') {
    // Navigate to SLA dashboard for urgent SLA escalation notifications
    event.waitUntil(
      self.clients.matchAll({ type: 'window' }).then((clients) => {
        const url = '/admin/sla-dashboard';
        if (clients.length > 0) {
          return clients[0].navigate(url).then(client => client.focus());
        }
        return self.clients.openWindow(url);
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

// Show urgent SLA escalation notification
async function showUrgentSLANotification(data) {
  if (self.Notification?.permission !== 'granted') {
    return;
  }

  const { title, body, level } = data;
  const notificationTitle = title || '🚨 Critical SLA Escalation';
  const notificationBody = body || 'An action has been escalated and requires immediate attention';

  try {
    await self.registration.showNotification(notificationTitle, {
      body: notificationBody,
      icon: 'https://xdlowvfzhvjzbtgvurzj.supabase.co/storage/v1/object/public/branding/9290e913-c735-405c-91c6-141e966011ae/favicon/1764707368310.png',
      tag: `sla-escalation-${Date.now()}`,
      badge: 'https://xdlowvfzhvjzbtgvurzj.supabase.co/storage/v1/object/public/branding/9290e913-c735-405c-91c6-141e966011ae/favicon/1764707368310.png',
      vibrate: [200, 100, 200, 100, 200],
      requireInteraction: true,
      data: { type: 'sla_escalation', level },
      actions: [
        { action: 'view', title: 'View Dashboard' },
        { action: 'dismiss', title: 'Dismiss' }
      ]
    });
    
    storeNotificationInHistory(notificationTitle, notificationBody, 'error');
  } catch (error) {
    console.error('Failed to show urgent SLA notification:', error);
  }
}

// Handle messages from clients including urgent SLA escalation broadcasts
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
  
  // Handle urgent SLA escalation push from client
  if (event.data && event.data.type === 'SLA_ESCALATION_URGENT') {
    showUrgentSLANotification(event.data);
  }
});

// Push event handler - receive and display server push notifications
self.addEventListener('push', (event) => {
  if (!event.data) {
    console.log('[SW] Push received but no data');
    return;
  }

  let payload;
  try {
    payload = event.data.json();
  } catch (e) {
    payload = {
      title: 'New Notification',
      body: event.data.text(),
      type: 'info'
    };
  }

  const {
    title = 'DHUUD Platform',
    body = 'You have a new notification',
    icon = 'https://xdlowvfzhvjzbtgvurzj.supabase.co/storage/v1/object/public/branding/9290e913-c735-405c-91c6-141e966011ae/favicon/1764707368310.png',
    badge = 'https://xdlowvfzhvjzbtgvurzj.supabase.co/storage/v1/object/public/branding/9290e913-c735-405c-91c6-141e966011ae/favicon/1764707368310.png',
    tag,
    data = {},
    actions = [],
    requireInteraction = false,
    vibrate = [100, 50, 100],
  } = payload;

  const notificationOptions = {
    body,
    icon,
    badge,
    tag: tag || `push-${Date.now()}`,
    data: { ...data, timestamp: Date.now() },
    actions,
    requireInteraction,
    vibrate,
  };

  event.waitUntil(
    self.registration.showNotification(title, notificationOptions).then(() => {
      // Store in notification history via client
      storeNotificationInHistory(title, body, data.type || 'info');
    })
  );
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

  const title = 'Update Available';
  const body = 'A new version of the app is available. Tap to update.';

  try {
    await self.registration.showNotification(title, {
      body,
      icon: 'https://xdlowvfzhvjzbtgvurzj.supabase.co/storage/v1/object/public/branding/9290e913-c735-405c-91c6-141e966011ae/favicon/1764707368310.png',
      tag: 'update-notification',
      badge: 'https://xdlowvfzhvjzbtgvurzj.supabase.co/storage/v1/object/public/branding/9290e913-c735-405c-91c6-141e966011ae/favicon/1764707368310.png',
      vibrate: [100, 50, 100],
      data: { type: 'update' },
      actions: [
        { action: 'update', title: 'Update Now' },
        { action: 'dismiss', title: 'Later' }
      ]
    });
    
    // Store in notification history
    storeNotificationInHistory(title, body, 'update');
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

// Trim cache to max entries (LRU-style)
async function trimCache(cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > maxEntries) {
    // Delete oldest entries (first in cache)
    const keysToDelete = keys.slice(0, keys.length - maxEntries);
    await Promise.all(keysToDelete.map(key => cache.delete(key)));
  }
}

// Fetch event - serve from cache with different strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // STRATEGY 1: Network First with cache fallback for API responses
  // Enhanced caching for gate-specific endpoints with longer retention
  const isGateEndpoint = GATE_API_PATTERNS.some(pattern => url.pathname.includes(pattern));
  
  if (url.pathname.startsWith('/rest/') || url.pathname.includes('/functions/')) {
    event.respondWith(
      fetch(request)
        .then(async (response) => {
          if (response.ok) {
            const clone = response.clone();
            const cache = await caches.open(API_CACHE_NAME);
            await cache.put(request, clone);
            // Keep more entries for gate endpoints
            const maxEntries = isGateEndpoint ? API_CACHE_MAX_ENTRIES * 2 : API_CACHE_MAX_ENTRIES;
            trimCache(API_CACHE_NAME, maxEntries);
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) {
            console.log('[SW] Serving API from cache:', url.pathname, isGateEndpoint ? '(gate)' : '');
            // Add offline header to indicate cached response
            const headers = new Headers(cached.headers);
            headers.set('X-Served-From', 'sw-cache');
            return new Response(cached.body, {
              status: cached.status,
              statusText: cached.statusText,
              headers
            });
          }
          return new Response(JSON.stringify({ error: 'Offline', cached: false }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
          });
        })
    );
    return;
  }

  // STRATEGY 2: Cache First for static assets (fonts, images, icons)
  // These rarely change and benefit from instant loading
  if (
    url.pathname.startsWith('/fonts/') ||
    url.pathname.startsWith('/images/') ||
    url.pathname.startsWith('/assets/') ||
    url.pathname.endsWith('.woff2') ||
    url.pathname.endsWith('.woff') ||
    url.pathname.endsWith('.ttf') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.jpeg') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.webp') ||
    url.pathname.endsWith('.ico')
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(STATIC_CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // STRATEGY 3: Stale-While-Revalidate for JS/CSS bundles
  // Instant load from cache, update in background for next visit
  if (url.pathname.endsWith('.js') || url.pathname.endsWith('.css')) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const fetchPromise = fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        });
        // Return cached immediately, update cache in background
        return cached || fetchPromise;
      })
    );
    return;
  }

  // STRATEGY 4: Stale-While-Revalidate for HTML pages
  // Fast initial load, background refresh for SPA navigation
  event.respondWith(
    caches.match(request).then((cached) => {
      const fetchPromise = fetch(request)
        .then((response) => {
          if (response.ok && url.origin === self.location.origin) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => {
          // Network failed, return cached or offline page
          return cached || caches.match(OFFLINE_URL);
        });
      
      // Return cached immediately if available, otherwise wait for network
      return cached || fetchPromise;
    })
  );
});
