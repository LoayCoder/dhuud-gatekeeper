// Vite configuration - Optimized for fast builds and reduced chunks
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";
import { versionUpdatePlugin } from "./scripts/update-version";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    versionUpdatePlugin(), // Auto-update version.json on build
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
    dedupe: [
      'react', 
      'react-dom', 
      'react/jsx-runtime',
      'react/jsx-dev-runtime',
      'react-i18next', 
      'i18next', 
      '@tanstack/react-query',
      'react-leaflet',
      '@react-leaflet/core',
      'leaflet',
    ],
  },
  optimizeDeps: {
    include: [
      'react', 
      'react-dom', 
      'react-i18next', 
      'i18next', 
      '@tanstack/react-query',
      'react-leaflet',
      'leaflet',
    ],
  },
  build: {
    rollupOptions: {
      output: {
        // NO manualChunks - let Rollup handle dependency order automatically
        // This prevents ALL chunk loading order issues
        chunkFileNames: 'assets/[name]-[hash]-v5.js',
        entryFileNames: 'assets/[name]-[hash]-v5.js',
        assetFileNames: 'assets/[name]-[hash]-v5.[ext]',
      },
    },
    // Ensure consistent module deduplication
    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsModules: true,
    },
  },
}));
