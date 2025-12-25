import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { visualizer } from "rollup-plugin-visualizer";
import viteCompression from "vite-plugin-compression";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    // Bundle analyzer - generates stats.html in dist folder
    mode === "production" && visualizer({
      filename: "dist/stats.html",
      open: false,
      gzipSize: true,
      brotliSize: true,
    }),
    // Gzip compression for production
    mode === "production" && viteCompression({
      algorithm: "gzip",
      ext: ".gz",
    }),
    // Brotli compression for production
    mode === "production" && viteCompression({
      algorithm: "brotliCompress",
      ext: ".br",
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // Force single React instance
      'react': path.resolve(__dirname, 'node_modules/react'),
      'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
    },
    dedupe: ['react', 'react-dom', 'react/jsx-runtime', 'react/jsx-dev-runtime', '@tanstack/react-query'],
  },
  optimizeDeps: {
    include: ['react', 'react-dom', '@tanstack/react-query'],
    force: true,
  },
  build: {
    rollupOptions: {
      output: {
        // Named chunks for better caching and debugging
        manualChunks: {
          // Vendor chunks
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-ui': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-tabs', '@radix-ui/react-tooltip'],
          'vendor-query': ['@tanstack/react-query'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-i18n': ['i18next', 'react-i18next', 'i18next-browser-languagedetector'],
          'vendor-charts': ['recharts'],
        },
        // Chunk file naming pattern
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId || '';
          // Named route chunks
          if (facadeModuleId.includes('/pages/admin/')) {
            return 'assets/admin-[name]-[hash].js';
          }
          if (facadeModuleId.includes('/pages/settings/')) {
            return 'assets/settings-[name]-[hash].js';
          }
          if (facadeModuleId.includes('/pages/')) {
            return 'assets/pages-[name]-[hash].js';
          }
          return 'assets/[name]-[hash].js';
        },
      },
    },
  },
}));
