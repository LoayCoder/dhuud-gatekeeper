

## Problem Analysis

The build has been failing since Feb 24 (last successful publish). The actual build **error message is truncated** — the log shows 6,118 modules transforming successfully, chunks rendering, gzip computation starting, and then the output is cut off before the error is visible.

Since I cannot see the actual error, here are the most likely causes and a plan to address each:

### Likely Cause: Build Output Size / Memory Limit

With 6,118 modules and heavy dependencies (ExcelJS, jsPDF, docx, Leaflet, Recharts, html2canvas, html5-qrcode, etc.), the build may be exceeding the deployment platform's memory or output size limit.

## Plan

### Step 1: Reduce Build Size with Code Splitting

Add `manualChunks` back to `vite.config.ts` to split heavy vendor libraries into separate smaller chunks. This reduces peak memory during chunk rendering:

```text
vendor-excel  → exceljs
vendor-pdf    → jspdf, docx
vendor-maps   → leaflet, react-leaflet
vendor-charts → recharts
vendor-ui     → radix-ui packages
```

### Step 2: Disable PWA Precaching for Build

The Workbox PWA plugin runs after chunk rendering and tries to precache all `**/*.{js,css,html,ico,png,svg}` — with 6,118 modules this creates a massive service worker. Temporarily disable the `globPatterns` to see if the build passes.

### Step 3: Remove Unused Heavy Dependencies

Check if `@playwright/test` and `rollup-plugin-visualizer` are actually needed in production dependencies (they shouldn't be). Moving them to devDependencies reduces the install/build footprint.

### Files to Modify

1. `vite.config.ts` — Add manualChunks for code splitting, reduce workbox globPatterns
2. `package.json` — Move `@playwright/test`, `@testing-library/react`, `rollup-plugin-visualizer` to devDependencies

This is a systematic approach: if Step 1 fixes the build, we know it was a size/memory issue. If not, we progressively eliminate other causes.

