// Main entry point - SYNC React mount, no async blocking
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { I18nextProvider } from "react-i18next";
import i18n from "./i18n";
import App from "./App";
import "./index.css";
import { registerServiceWorker } from "./lib/register-sw";
import { cacheAppShell } from "./lib/cache-app-shell";
import { initVersionManager } from "./lib/version-manager";

// Log boot progress
const logBoot = (msg: string) => {
  if (typeof window !== 'undefined' && (window as any).__logBoot__) {
    (window as any).__logBoot__(msg);
  } else {
    console.log('[Boot]', msg);
  }
};

logBoot('main.tsx loaded');

// Declare global flag type
declare global {
  interface Window {
    __REACT_MOUNTED__?: boolean;
  }
}

/**
 * SYNC React mount - no awaits, no promises in critical path
 * This runs IMMEDIATELY when the module loads
 */
function mountReact(): boolean {
  // Prevent double mounting
  if (window.__REACT_MOUNTED__) {
    logBoot('Already mounted, skipping');
    return true;
  }

  logBoot('Mounting React...');

  try {
    const rootElement = document.getElementById("root");
    if (!rootElement) {
      throw new Error("Root element not found");
    }

    // SYNC: Create and render React app
    createRoot(rootElement).render(
      <StrictMode>
        <I18nextProvider i18n={i18n}>
          <App />
        </I18nextProvider>
      </StrictMode>
    );

    // Mark as mounted
    window.__REACT_MOUNTED__ = true;
    logBoot('React mounted successfully');

    // Hide fallback UI
    const fallbackEl = document.getElementById('app-load-fallback');
    if (fallbackEl) {
      fallbackEl.style.display = 'none';
    }

    return true;
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error('[App] Failed to mount React:', errMsg);
    logBoot('MOUNT FAILED: ' + errMsg);

    // Show fallback with error details
    const fallback = document.getElementById('app-load-fallback');
    if (fallback) {
      fallback.style.display = 'flex';
      const hint = fallback.querySelector('.fallback-hint');
      if (hint) {
        hint.innerHTML = '<strong>Mount Error:</strong> ' + errMsg;
      }
    }

    return false;
  }
}

// ============================================
// CRITICAL: Mount React IMMEDIATELY (sync)
// ============================================
const mounted = mountReact();

// ============================================
// ASYNC: Background tasks AFTER React is mounted
// ============================================
if (mounted) {
  // Delay all async operations to not interfere with rendering
  setTimeout(() => {
    logBoot('Starting background tasks');
    
    // Register service worker
    try {
      registerServiceWorker();
    } catch (e) {
      console.warn('[App] Service worker registration failed:', e);
    }

    // Cache app shell after load
    if (typeof window !== 'undefined') {
      window.addEventListener('load', () => {
        setTimeout(() => {
          try {
            cacheAppShell();
          } catch (e) {
            console.warn('[App] App shell caching failed:', e);
          }
        }, 3000);
      });
    }

    // Initialize version manager (non-blocking)
    initVersionManager().catch((e) => {
      console.warn('[App] Version manager failed:', e);
    });
  }, 100); // Small delay to let React render first
}

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
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
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
