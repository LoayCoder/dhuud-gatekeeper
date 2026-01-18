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
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['favicon.ico', 'placeholder.svg', 'sw-version.js'],
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
          // Consolidate heavy vendor libraries to reduce total chunk count
          manualChunks: {
            'vendor-react': ['react', 'react-dom', 'react-router-dom'],
            'vendor-ui': [
              '@radix-ui/react-dialog',
              '@radix-ui/react-dropdown-menu', 
              '@radix-ui/react-select',
              '@radix-ui/react-popover',
              '@radix-ui/react-tooltip',
              '@radix-ui/react-tabs',
              '@radix-ui/react-accordion',
              '@radix-ui/react-checkbox',
              '@radix-ui/react-switch',
            ],
            'vendor-export': ['xlsx', 'exceljs', 'jspdf', 'docx'],
            'vendor-charts': ['recharts'],
            'vendor-maps': ['leaflet', 'react-leaflet'],
            'vendor-i18n': ['i18next', 'react-i18next', 'i18next-browser-languagedetector'],
            'vendor-query': ['@tanstack/react-query'],
            'vendor-forms': ['react-hook-form', '@hookform/resolvers', 'zod'],
            'vendor-dates': ['date-fns'],
          },
          chunkFileNames: 'assets/[name]-[hash]-v6.js',
          entryFileNames: 'assets/[name]-[hash]-v6.js',
          assetFileNames: 'assets/[name]-[hash]-v6.[ext]',
        },
      },
      chunkSizeWarningLimit: 1000,
    // Ensure consistent module deduplication
    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsModules: true,
    },
  },
}));
