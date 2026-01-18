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
          // Aggressive chunking to reduce total file count for deployment
          manualChunks(id) {
            // Vendor chunks - consolidate heavy libraries
            if (id.includes('node_modules')) {
              if (id.includes('react-dom') || id.includes('react-router') || id.includes('/react/')) {
                return 'vendor-react';
              }
              if (id.includes('@radix-ui')) {
                return 'vendor-ui';
              }
              if (id.includes('xlsx') || id.includes('exceljs') || id.includes('jspdf') || id.includes('docx')) {
                return 'vendor-export';
              }
              if (id.includes('recharts')) {
                return 'vendor-charts';
              }
              if (id.includes('leaflet')) {
                return 'vendor-maps';
              }
              if (id.includes('i18next')) {
                return 'vendor-i18n';
              }
              if (id.includes('@tanstack')) {
                return 'vendor-query';
              }
              if (id.includes('react-hook-form') || id.includes('@hookform') || id.includes('zod')) {
                return 'vendor-forms';
              }
              if (id.includes('date-fns')) {
                return 'vendor-dates';
              }
              if (id.includes('@supabase')) {
                return 'vendor-supabase';
              }
              // All other node_modules in one chunk
              return 'vendor-misc';
            }
            
            // Group app code by feature area to reduce chunk count
            if (id.includes('/src/')) {
              if (id.includes('/pages/incidents/') || id.includes('/components/incidents/')) {
                return 'feature-incidents';
              }
              if (id.includes('/pages/inspections/') || id.includes('/components/inspections/')) {
                return 'feature-inspections';
              }
              if (id.includes('/pages/assets/') || id.includes('/components/assets/')) {
                return 'feature-assets';
              }
              if (id.includes('/pages/visitors/') || id.includes('/components/visitors/')) {
                return 'feature-visitors';
              }
              if (id.includes('/pages/security/') || id.includes('/components/security/')) {
                return 'feature-security';
              }
              if (id.includes('/pages/ptw/') || id.includes('/components/ptw/')) {
                return 'feature-ptw';
              }
              if (id.includes('/pages/contractors/') || id.includes('/components/contractors/')) {
                return 'feature-contractors';
              }
              if (id.includes('/pages/admin/') || id.includes('/components/admin/')) {
                return 'feature-admin';
              }
              if (id.includes('/pages/reports/') || id.includes('/components/reports/')) {
                return 'feature-reports';
              }
              if (id.includes('/hooks/')) {
                return 'app-hooks';
              }
              if (id.includes('/lib/') || id.includes('/utils/')) {
                return 'app-utils';
              }
              if (id.includes('/components/ui/')) {
                return 'app-ui';
              }
            }
          },
          chunkFileNames: 'assets/[name]-[hash]-v7.js',
          entryFileNames: 'assets/[name]-[hash]-v7.js',
          assetFileNames: 'assets/[name]-[hash]-v7.[ext]',
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
