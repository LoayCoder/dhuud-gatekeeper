// Main entry point - single React instance enforced
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { I18nextProvider } from "react-i18next";
import i18n from "./i18n";
import App from "./App";
import "./index.css";
import { registerServiceWorker } from "./lib/register-sw";
import { cacheAppShell } from "./lib/cache-app-shell";

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
});

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

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <I18nextProvider i18n={i18n}>
      <App />
    </I18nextProvider>
  </StrictMode>
);
