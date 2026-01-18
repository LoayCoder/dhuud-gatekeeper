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
      injectManifest: {
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB limit
      },
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
          // Aggressive chunking to reduce total file count for deployment
          manualChunks(id) {
            // ONLY handle vendor (node_modules) chunking
            // App code chunking is REMOVED to prevent React.forwardRef loading order issues
            if (id.includes('node_modules')) {
              // CRITICAL: React + ALL React-dependent libraries MUST be in the same chunk
              // This prevents circular dependency / loading order issues (forwardRef errors)
              if (
                id.includes('/react/') ||
                id.includes('react-dom') ||
                id.includes('react-router') ||
                id.includes('@tanstack/react-query') ||
                id.includes('react-i18next') ||
                id.includes('@radix-ui') ||
                id.includes('react-hook-form') ||
                id.includes('@hookform') ||
                id.includes('next-themes') ||
                id.includes('sonner') ||
                id.includes('cmdk') ||
                id.includes('vaul') ||
                id.includes('embla-carousel-react') ||
                id.includes('react-day-picker') ||
                id.includes('react-dropzone') ||
                id.includes('react-resizable-panels') ||
                id.includes('input-otp') ||
                id.includes('recharts')
              ) {
                return 'vendor-react-ecosystem';
              }
              // Heavy non-React dependencies can be split safely
              if (id.includes('xlsx') || id.includes('exceljs') || id.includes('jspdf') || id.includes('docx')) {
                return 'vendor-export';
              }
              if (id.includes('leaflet')) {
                return 'vendor-maps';
              }
              // Pure i18next core (no React deps)
              if (id.includes('i18next') && !id.includes('react-i18next')) {
                return 'vendor-i18n';
              }
              if (id.includes('date-fns')) {
                return 'vendor-dates';
              }
              if (id.includes('@supabase')) {
                return 'vendor-supabase';
              }
              if (id.includes('zod')) {
                return 'vendor-validation';
              }
              // All other node_modules
              return 'vendor-misc';
            }
            // DO NOT manually chunk app code - let Vite handle it automatically
            // This prevents circular dependency issues with React.forwardRef
          },
          chunkFileNames: 'assets/[name]-[hash]-v14.js',
          entryFileNames: 'assets/[name]-[hash]-v14.js',
          assetFileNames: 'assets/[name]-[hash]-v14.[ext]',
        },
      },
      chunkSizeWarningLimit: 2000,
    // Ensure consistent module deduplication
    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsModules: true,
    },
  },
}));
