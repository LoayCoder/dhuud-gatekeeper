

# Fix: Stale cache after publishing

## Problem

The Service Worker is registered at a fixed URL (`/sw.js`), so the browser caches it and keeps serving old `index.html` even after a new build is deployed. The version manager tries to fetch `version.json` with cache-busting headers, but the SW itself can intercept and serve a cached response. Users see the old app until they manually clear site data.

## Root cause

1. **SW URL never changes** — `navigator.serviceWorker.register('/sw.js')` uses the same URL every build. Browsers only re-fetch the SW if the URL or SW content changes; since Workbox only precaches `index.html`, the SW body rarely differs.
2. **`version.json` can be served from cache** — no explicit rule tells the SW to always fetch `version.json` from the network.
3. **No forced reload on SW activation** — when a new SW activates, the page doesn't automatically reload.

## Solution (3 files changed)

### 1. Inject build version into the app at build time

**File: `vite.config.ts`**
- Add `define: { '__APP_VERSION__': JSON.stringify(Date.now().toString()) }` so every build gets a unique version token baked into the JS bundle.

### 2. Version the SW registration URL

**File: `src/lib/register-sw.ts`**
- Change registration from `/sw.js` to `/sw.js?v=${__APP_VERSION__}`. This makes the browser treat each build's SW as new, triggering the update flow.
- Add a `controllerchange` listener that auto-reloads the page when the new SW takes control — no user action needed.

### 3. Exclude `version.json` from SW caching

**File: `vite.config.ts`** (Workbox config)
- Add a `navigateFallbackDenylist` entry or a runtime caching rule for `/version.json` with `NetworkOnly` strategy, so the SW never serves a stale version manifest.

## What changes for users

- After you publish, returning users will automatically get the new version within seconds — the new SW activates, the page reloads, and the latest code loads.
- No manual cache clearing or hard refresh needed.
- The existing update notification banner continues to work as a fallback for edge cases.

## Technical details

```text
Build time:
  vite.config.ts → define __APP_VERSION__ = timestamp

Runtime (register-sw.ts):
  register('/sw.js?v=1711670400000')
      ↓ browser sees new URL
      ↓ fetches fresh sw.js
      ↓ installs → activates (skipWaiting is on)
      ↓ controllerchange fires
      ↓ page.reload() → fresh index.html + fresh chunks
```

No database changes. No new dependencies.

