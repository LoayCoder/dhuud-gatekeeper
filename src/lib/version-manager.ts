/**
 * PWA Version Manager
 * Automatically detects version mismatches and triggers cache invalidation
 */

const VERSION_STORAGE_KEY = 'app-version';
const VERSION_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes

interface VersionInfo {
  version: string;
  buildTime: string;
}

/**
 * Fetch the current deployed version from the server
 */
async function fetchServerVersion(): Promise<VersionInfo | null> {
  try {
    const response = await fetch('/version.json', { 
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' }
    });
    if (!response.ok) return null;
    return await response.json();
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
 * Returns true if a forced reload is happening
 */
export async function initVersionManager(): Promise<boolean> {
  // Check version on startup
  const { hasUpdate, newVersion } = await checkForVersionUpdate();
  
  if (hasUpdate) {
    console.log('[Version Manager] New version detected:', newVersion);
    
    // Clear caches automatically on version mismatch
    await clearAllCaches();
    
    // Notify the service worker to skip waiting if there's one
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready.catch(() => null);
      if (registration?.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
    }
    
    // Reload to get fresh assets
    window.location.reload();
    return true;
  }
  
  // Set up periodic version checking
  if (import.meta.env.PROD) {
    setInterval(async () => {
      const result = await checkForVersionUpdate();
      if (result.hasUpdate) {
        // Dispatch event for UI to show update notification
        window.dispatchEvent(new CustomEvent('app-version-update', {
          detail: { version: result.newVersion }
        }));
      }
    }, VERSION_CHECK_INTERVAL);
  }
  
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
