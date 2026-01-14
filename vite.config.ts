// Vite configuration - Optimized for fast builds and reduced chunks
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    // PWA Plugin with Workbox - simplified config
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['favicon.ico', 'placeholder.svg', 'sw-version.js'],
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/xdlowvfzhvjzbtgvurzj\.supabase\.co\/rest\/v1\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-api-cache',
              expiration: { maxEntries: 200, maxAgeSeconds: 86400 },
              cacheableResponse: { statuses: [0, 200] },
              networkTimeoutSeconds: 10,
            },
          },
          {
            urlPattern: /^https:\/\/xdlowvfzhvjzbtgvurzj\.supabase\.co\/storage\/v1\/object\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'supabase-storage-cache',
              expiration: { maxEntries: 100, maxAgeSeconds: 604800 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'google-fonts-stylesheets' },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: { maxEntries: 30, maxAgeSeconds: 31536000 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      manifest: false,
      devOptions: {
        enabled: mode === 'development',
        type: 'module',
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ['react', 'react-dom', 'react-i18next', 'i18next', '@tanstack/react-query'],
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-i18next', 'i18next', '@tanstack/react-query'],
  },
  build: {
    rollupOptions: {
      output: {
        // Consolidated chunks - reduces 150+ chunks to ~15
        manualChunks: (id) => {
          // Vendor chunks by category
          if (id.includes('node_modules')) {
            // CRITICAL: All React packages MUST be in the same chunk to prevent duplicate runtime
            if (id.includes('node_modules/react')) return 'vendor-react';
            if (id.includes('@radix-ui')) return 'vendor-ui';
            if (id.includes('@tanstack')) return 'vendor-query';
            if (id.includes('@supabase')) return 'vendor-supabase';
            if (id.includes('i18next')) return 'vendor-i18n';
            if (id.includes('recharts')) return 'vendor-charts';
            if (id.includes('date-fns')) return 'vendor-date';
            if (id.includes('lucide')) return 'vendor-icons';
            if (id.includes('zod') || id.includes('react-hook-form')) return 'vendor-forms';
            return 'vendor-common';
          }
          // Group pages by domain - major reduction in chunk count
          if (id.includes('/pages/admin/')) return 'pages-admin';
          if (id.includes('/pages/security/')) return 'pages-security';
          if (id.includes('/pages/inspections/')) return 'pages-inspections';
          if (id.includes('/pages/incidents/')) return 'pages-incidents';
          if (id.includes('/pages/visitors/')) return 'pages-visitors';
          if (id.includes('/pages/contractors/')) return 'pages-contractors';
          if (id.includes('/pages/assets/')) return 'pages-assets';
          if (id.includes('/pages/ptw/')) return 'pages-ptw';
          if (id.includes('/pages/settings/')) return 'pages-settings';
          if (id.includes('/pages/')) return 'pages-common';
          // Group app utilities
          if (id.includes('/hooks/')) return 'app-hooks';
          if (id.includes('/components/ui/')) return 'app-ui';
          if (id.includes('/components/')) return 'app-components';
          if (id.includes('/lib/')) return 'app-lib';
        },
        chunkFileNames: 'assets/[name]-[hash]-v3.js',
        entryFileNames: 'assets/[name]-[hash]-v3.js',
        assetFileNames: 'assets/[name]-[hash]-v3.[ext]',
      },
    },
  },
}));
