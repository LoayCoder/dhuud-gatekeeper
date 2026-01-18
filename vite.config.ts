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
