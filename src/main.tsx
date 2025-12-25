// Main entry point - triggers dev server rebuild
import React from "react";
import { createRoot } from "react-dom/client";
import { I18nextProvider } from "react-i18next";
import i18n from "./i18n"; // Initialize i18n before App
import App from "./App.tsx";
import "./index.css";
import { registerServiceWorker } from "./lib/register-sw";

// Register service worker for offline caching
registerServiceWorker();

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <I18nextProvider i18n={i18n}>
      <App />
    </I18nextProvider>
  </React.StrictMode>
);
