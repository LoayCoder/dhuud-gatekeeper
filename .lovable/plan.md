

# Fix: PWA Update Pipeline — 4 Critical Issues

## Issues Found

### 1. Dual Service Worker registration (HIGH)
`vite.config.ts` has `injectRegister: 'auto'`, which makes VitePWA inject its own SW registration script. But `src/lib/register-sw.ts` also manually registers `/sw.js?v=${appVersion}`. This means TWO registration attempts happen — the auto-injected one at a fixed URL (`/sw.js`) and the manual one with cache-busting (`/sw.js?v=...`). The auto-injected one wins first and defeats the cache-busting.

**Fix:** Change `injectRegister: 'auto'` → `injectRegister: false` in `vite.config.ts`. The manual registration in `register-sw.ts` already handles everything correctly.

### 2. Two different localStorage keys for version tracking (MEDIUM)
- `version-manager.ts` uses key `'app-version'`
- `use-app-update-check.ts` uses key `'app-current-version'`

They track the same thing but never see each other's writes. When version-manager detects an update and stores the new version in `'app-version'`, the update-check hook still reads `'app-current-version'` and may show a stale state (or vice versa).

**Fix:** Unify both to use `'app-current-version'` (the one the UI hook reads). Update `version-manager.ts` constant from `'app-version'` to `'app-current-version'`.

### 3. devOptions enabled in development (LOW-MEDIUM)
`devOptions: { enabled: mode === 'development' }` activates a dev service worker inside the Lovable preview iframe, which can cause stale content and caching issues during development. Per Lovable's own PWA guidelines, this must be `false`.

**Fix:** Change to `devOptions: { enabled: false }`.

### 4. clearAllCaches nukes OneSignal (LOW)
`version-manager.ts` line 93 unregisters ALL service workers including OneSignal's `OneSignalSDKWorker.js`. Push notifications break after any version update.

**Fix:** Add the same OneSignal guard used in `register-sw.ts` — skip unregistration if the SW URL contains `'OneSignalSDKWorker'`.

## Files Changed

### `vite.config.ts` (2 changes)
- Line 25: `injectRegister: 'auto'` → `injectRegister: false`
- Line 79: `enabled: mode === 'development'` → `enabled: false`

### `src/lib/version-manager.ts` (2 changes)
- Line 7: `VERSION_STORAGE_KEY` from `'app-version'` → `'app-current-version'`
- Lines 91-93: Add OneSignal guard before unregistering service workers

## What this fixes for users

After publishing, the versioned SW URL (`/sw.js?v=timestamp`) will actually take effect because VitePWA's auto-injected registration no longer races against it. The browser fetches the new SW, `skipWaiting` activates it, `controllerchange` fires, and the page auto-reloads with fresh content. No more stale cached builds.

