/**
 * Cache App Shell utility
 * Triggers caching of critical JS/CSS assets for offline app access
 */
import { logger } from '@/lib/logger';

const APP_SHELL_CACHE_KEY = 'app-shell-cached';
const APP_SHELL_CACHE_VERSION = '2026.01.22.001';

/**
 * Check if the app shell has already been cached for this version
 */
export function isAppShellCached(): boolean {
  try {
    const cached = localStorage.getItem(APP_SHELL_CACHE_KEY);
    return cached === APP_SHELL_CACHE_VERSION;
  } catch {
    return false;
  }
}

/**
 * Mark the app shell as cached for this version
 */
function markAppShellCached(): void {
  try {
    localStorage.setItem(APP_SHELL_CACHE_KEY, APP_SHELL_CACHE_VERSION);
  } catch {
    // Ignore localStorage errors
  }
}

/**
 * Cache the app shell (critical JS/CSS assets) for offline use
 * This should be called once when the app first loads while online
 */
export async function cacheAppShell(): Promise<void> {
  // Skip if not in browser or service worker not supported
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  // Skip if already cached for this version
  if (isAppShellCached()) {
    logger.info('[App Shell] Already cached for version', APP_SHELL_CACHE_VERSION);
    return;
  }

  // Skip if offline
  if (!navigator.onLine) {
    logger.debug('[App Shell] Skipping cache - offline');
    return;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    
    if (!registration.active) {
      logger.debug('[App Shell] Service worker not active yet');
      return;
    }

    // Collect all JS scripts from the page
    const scripts = Array.from(document.querySelectorAll('script[src]'))
      .map(s => s.getAttribute('src'))
      .filter((src): src is string => !!src && !src.includes('chrome-extension'));

    // Collect all CSS stylesheets
    const stylesheets = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
      .map(l => l.getAttribute('href'))
      .filter((href): href is string => !!href);

    // Collect preloaded modules
    const modulePreloads = Array.from(document.querySelectorAll('link[rel="modulepreload"]'))
      .map(l => l.getAttribute('href'))
      .filter((href): href is string => !!href);

    // Combine all assets
    const assets = [...new Set([...scripts, ...stylesheets, ...modulePreloads])];

    if (assets.length === 0) {
      logger.debug('[App Shell] No assets to cache');
      return;
    }

    logger.info('[App Shell] Caching', assets.length, 'assets for offline use');

    // Send to service worker for caching
    registration.active.postMessage({
      type: 'CACHE_APP_SHELL',
      assets,
      version: APP_SHELL_CACHE_VERSION
    });

    // Mark as cached after a short delay to allow SW to process
    setTimeout(() => {
      markAppShellCached();
      logger.debug('[App Shell] Marked as cached');
      
      // Dispatch event for UI components to react
      window.dispatchEvent(new CustomEvent('app-shell-cached', {
        detail: { version: APP_SHELL_CACHE_VERSION, assetCount: assets.length }
      }));
    }, 2000);

  } catch (error) {
    console.error('[App Shell] Failed to cache:', error);
  }
}

/**
 * Clear the app shell cache marker (for development/testing)
 */
export function clearAppShellCacheMarker(): void {
  try {
    localStorage.removeItem(APP_SHELL_CACHE_KEY);
  } catch {
    // Ignore
  }
}
