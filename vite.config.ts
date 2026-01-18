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
              if (id.includes('node_modules')) {
                return 'vendor-misc';
              }
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
              // Additional feature chunks
              if (id.includes('/pages/reception/') || id.includes('/components/reception/')) {
                return 'feature-reception';
              }
              if (id.includes('/pages/parts/') || id.includes('/components/parts/')) {
                return 'feature-parts';
              }
              if (id.includes('/pages/legal/') || id.includes('/components/legal/')) {
                return 'feature-legal';
              }
              if (id.includes('/pages/settings/') || id.includes('/components/settings/')) {
                return 'feature-settings';
              }
              if (id.includes('/pages/client-site-rep/') || id.includes('/components/client-site-rep/')) {
                return 'feature-client-rep';
              }
              // Split hooks by category to avoid mega-chunk
              if (id.includes('/hooks/')) {
                // Incident-related (expanded)
                if (id.includes('use-incident') || id.includes('use-observation') || id.includes('use-event') ||
                    id.includes('use-rca') || id.includes('use-investigation') || id.includes('use-witness') ||
                    id.includes('use-clinic') || id.includes('use-legal') || id.includes('use-escalation')) {
                  return 'hooks-incidents';
                }
                // Inspection-related (expanded)
                if (id.includes('use-inspection') || id.includes('use-audit') || id.includes('use-finding') ||
                    id.includes('use-area-')) {
                  return 'hooks-inspections';
                }
                // Asset-related (expanded)
                if (id.includes('use-asset') || id.includes('use-maintenance') || id.includes('use-equipment') ||
                    id.includes('use-depreciation') || id.includes('use-warranty') || id.includes('use-parts')) {
                  return 'hooks-assets';
                }
                // Visitor-related (expanded)
                if (id.includes('use-visitor') || id.includes('use-gate') || id.includes('use-reception') ||
                    id.includes('use-visit-') || id.includes('use-host-') || id.includes('use-bulk-import-visitor')) {
                  return 'hooks-visitors';
                }
                // Security-related (expanded)
                if (id.includes('use-security') || id.includes('use-patrol') || id.includes('use-guard') ||
                    id.includes('use-cctv') || id.includes('use-emergency') || id.includes('use-shift') ||
                    id.includes('use-geofence') || id.includes('use-anpr') || id.includes('use-blacklist')) {
                  return 'hooks-security';
                }
                // Contractor-related (expanded)
                if (id.includes('use-contractor') || id.includes('use-worker') || id.includes('use-induction') ||
                    id.includes('use-personnel')) {
                  return 'hooks-contractors';
                }
                // PTW hooks
                if (id.includes('use-ptw') || id.includes('use-permit')) {
                  return 'hooks-ptw';
                }
                // Admin/Organization hooks
                if (id.includes('use-admin') || id.includes('use-org') || id.includes('use-tenant') ||
                    id.includes('use-branch') || id.includes('use-department') || id.includes('use-site') ||
                    id.includes('use-user') || id.includes('use-role') || id.includes('use-menu')) {
                  return 'hooks-admin';
                }
                // Notification hooks
                if (id.includes('use-notification') || id.includes('use-push') || id.includes('use-realtime')) {
                  return 'hooks-notifications';
                }
                return 'hooks-common';
              }
              if (id.includes('/lib/') || id.includes('/utils/')) {
                return 'app-utils';
              }
              if (id.includes('/components/ui/')) {
                return 'app-ui';
              }
            }
          },
          chunkFileNames: 'assets/[name]-[hash]-v8.js',
          entryFileNames: 'assets/[name]-[hash]-v8.js',
          assetFileNames: 'assets/[name]-[hash]-v8.[ext]',
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
