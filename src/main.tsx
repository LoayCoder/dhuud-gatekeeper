// Main entry point - single React instance enforced
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { I18nextProvider } from "react-i18next";
import i18n from "./i18n";
import App from "./App";
import "./index.css";
import { registerServiceWorker } from "./lib/register-sw";
import { cacheAppShell } from "./lib/cache-app-shell";

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
