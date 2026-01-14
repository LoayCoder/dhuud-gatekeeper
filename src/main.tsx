// Main entry point - single React instance enforced
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { I18nextProvider } from "react-i18next";
import i18n from "./i18n";
import App from "./App";
import "./index.css";
import { registerServiceWorker } from "./lib/register-sw";
import { cacheAppShell } from "./lib/cache-app-shell";
import { initVersionManager } from "./lib/version-manager";

// Global error handler for chunk loading failures - auto-recovery
window.addEventListener('unhandledrejection', async (event) => {
  const message = event.reason?.message || '';
  if (
    message.includes('Failed to fetch dynamically imported module') ||
    message.includes('Loading chunk') ||
    message.includes('Loading CSS chunk')
  ) {
    console.warn('[Cache Recovery] Chunk load failed, clearing caches...');
    try {
      // Clear all service worker caches
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
      
      // Unregister service workers
      const registrations = await navigator.serviceWorker?.getRegistrations();
      await Promise.all(registrations?.map(r => r.unregister()) || []);
      
      console.log('[Cache Recovery] Caches cleared, reloading...');
      window.location.reload();
    } catch (e) {
      console.error('[Cache Recovery] Failed:', e);
      window.location.reload();
    }
  }
});

// Global error handler for debugging blank screens
window.addEventListener('error', (event) => {
  console.error('[App Error]', event.error?.message || event.message, event.error?.stack);
  // Show fallback UI on critical errors
  if (!window.__REACT_MOUNTED__) {
    const fallback = document.getElementById('app-load-fallback');
    if (fallback) fallback.style.display = 'flex';
  }
});

// Declare the global flag type
declare global {
  interface Window {
    __REACT_MOUNTED__?: boolean;
  }
}

/**
 * Mount React application
 * This function ensures React only mounts once
 */
function mountReact() {
  // Prevent double mounting
  if (window.__REACT_MOUNTED__) {
    console.log('[App] Already mounted, skipping');
    return;
  }

  console.log('[App] Mounting React application...');

  // Register service worker for offline caching
  registerServiceWorker();

  // Cache app shell after initial load for offline access
  if (typeof window !== 'undefined') {
    window.addEventListener('load', () => {
      // Delay to allow critical resources to load first
      setTimeout(() => {
        cacheAppShell();
      }, 3000);
    });
  }

  // Mount React app
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <I18nextProvider i18n={i18n}>
        <App />
      </I18nextProvider>
    </StrictMode>
  );

  // Signal that React mounted successfully - hide fallback UI
  window.__REACT_MOUNTED__ = true;
  console.log('[App] React mounted successfully');
  
  const fallbackEl = document.getElementById('app-load-fallback');
  if (fallbackEl) fallbackEl.style.display = 'none';
}

// Initialize app with failsafe timeout
(async () => {
  let hasTimedOut = false;
  
  // FAILSAFE: Ensure React mounts within 3 seconds no matter what
  const mountTimeout = setTimeout(() => {
    if (!window.__REACT_MOUNTED__) {
      console.warn('[App] Version check timed out, mounting React anyway');
      hasTimedOut = true;
      mountReact();
    }
  }, 3000);
  
  try {
    // Initialize version manager - this should NOT block
    await initVersionManager();
  } catch (e) {
    console.warn('[App] Version manager error (non-blocking):', e);
  }
  
  // Clear timeout and mount if not already done
  clearTimeout(mountTimeout);
  
  if (!hasTimedOut && !window.__REACT_MOUNTED__) {
    mountReact();
  }
})();
