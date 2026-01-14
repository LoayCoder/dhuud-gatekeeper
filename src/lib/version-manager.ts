/**
 * PWA Version Manager
 * Automatically detects version mismatches and triggers cache invalidation
 * RESILIENT: Never blocks React from mounting
 */

const VERSION_STORAGE_KEY = 'app-version';
const VERSION_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes

interface VersionInfo {
  version: string;
  buildTime: string;
}

/**
 * Fetch the current deployed version from the server
 * RESILIENT: Returns null on any error, never throws
 */
async function fetchServerVersion(): Promise<VersionInfo | null> {
  try {
    const response = await fetch('/version.json?_=' + Date.now(), { 
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' }
    });
    
    if (!response.ok) {
      console.warn('[Version Manager] version.json not found:', response.status);
      return null;
    }
    
    // Check if response is actually JSON before parsing
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      console.warn('[Version Manager] version.json returned non-JSON content:', contentType);
      return null;
    }
    
    // Try parsing with error handling
    const text = await response.text();
    try {
      return JSON.parse(text);
    } catch (parseError) {
      console.warn('[Version Manager] Failed to parse version.json:', parseError);
      return null;
    }
  } catch (error) {
    console.warn('[Version Manager] Failed to fetch version:', error);
    return null;
  }
}

/**
 * Get the locally stored version
 */
function getLocalVersion(): string | null {
  try {
    return localStorage.getItem(VERSION_STORAGE_KEY);
  } catch {
    return null;
  }
}

/**
 * Store the current version locally
 */
function setLocalVersion(version: string): void {
  try {
    localStorage.setItem(VERSION_STORAGE_KEY, version);
  } catch {
    // Ignore storage errors
  }
}

/**
 * Clear all caches and service workers
 */
export async function clearAllCaches(): Promise<void> {
  console.log('[Version Manager] Clearing all caches...');
  
  try {
    // Clear all service worker caches
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => {
        console.log('[Version Manager] Deleting cache:', name);
        return caches.delete(name);
      }));
    }
    
    // Unregister service workers
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map(r => r.unregister()));
    }
    
    console.log('[Version Manager] All caches cleared');
  } catch (error) {
    console.error('[Version Manager] Cache clear failed:', error);
  }
}

/**
 * Check for version updates and handle cache invalidation
 */
export async function checkForVersionUpdate(): Promise<{ hasUpdate: boolean; newVersion?: string }> {
  const serverVersion = await fetchServerVersion();
  if (!serverVersion) {
    return { hasUpdate: false };
  }
  
  const localVersion = getLocalVersion();
  
  // First visit - store the version
  if (!localVersion) {
    setLocalVersion(serverVersion.version);
    return { hasUpdate: false };
  }
  
  // Version mismatch detected
  if (localVersion !== serverVersion.version) {
    console.log('[Version Manager] Version mismatch detected:', {
      local: localVersion,
      server: serverVersion.version
    });
    
    // Update stored version
    setLocalVersion(serverVersion.version);
    
    return { hasUpdate: true, newVersion: serverVersion.version };
  }
  
  return { hasUpdate: false };
}

/**
 * Handle version update - clear caches and reload
 */
export async function handleVersionUpdate(): Promise<void> {
  await clearAllCaches();
  window.location.reload();
}

/**
 * Initialize version manager - runs on app start
 * CRITICAL: This function NEVER blocks React from mounting
 * Returns false always to ensure React mounts
 */
export async function initVersionManager(): Promise<boolean> {
  try {
    const { hasUpdate, newVersion } = await checkForVersionUpdate();
    
    if (hasUpdate) {
      console.log('[Version Manager] New version available:', newVersion);
      
      // Clear caches in background - don't block
      clearAllCaches().catch(e => console.warn('[Version Manager] Cache clear failed:', e));
      
      // Notify service worker to skip waiting
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready
          .then(registration => {
            if (registration?.waiting) {
              registration.waiting.postMessage({ type: 'SKIP_WAITING' });
            }
          })
          .catch(() => {});
      }
      
      // Dispatch event for UI notification (after React mounts)
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('app-version-update', {
          detail: { version: newVersion }
        }));
      }, 2000);
    }
  } catch (e) {
    console.warn('[Version Manager] Init failed:', e);
  }
  
  // Set up periodic version checking (production only)
  if (import.meta.env.PROD) {
    setInterval(async () => {
      try {
        const result = await checkForVersionUpdate();
        if (result.hasUpdate) {
          window.dispatchEvent(new CustomEvent('app-version-update', {
            detail: { version: result.newVersion }
          }));
        }
      } catch {
        // Silently ignore periodic check failures
      }
    }, VERSION_CHECK_INTERVAL);
  }
  
  // ALWAYS return false - never block React from mounting
  return false;
}

/**
 * Force version update - used by update notification UI
 */
export async function forceVersionUpdate(): Promise<void> {
  // Clear the stored version to force recheck
  try {
    localStorage.removeItem(VERSION_STORAGE_KEY);
  } catch {
    // Ignore
  }
  
  await handleVersionUpdate();
}
