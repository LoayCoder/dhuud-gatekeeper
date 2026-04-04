

# Fix: "Failed to Load Application" — Stale Vite Cache

## Root Cause

The Vite dependency pre-bundle cache (`node_modules/.vite/deps/`) has a stale browser hash. The browser is requesting modules with hash `?v=336c510b` but the current Vite cache has hash `57d0ed94`. This mismatch causes every ES module import to fail silently, triggering the `onerror` handler on the main `<script>` tag ("Main module failed to load").

This is NOT a code bug — it's a stale dev cache. The build succeeds and all files serve correctly from the dev server, but the hash mismatch breaks module resolution.

## Fix

### Step 1: Clear Vite dep cache and force rebuild
- Delete `node_modules/.vite/deps/` directory
- Make a trivial comment change in `src/App.tsx` (line 1: change `v3` → `v4`) to force the dev server to restart and regenerate the dep cache with fresh hashes

That single change will trigger a dev server restart, which regenerates the Vite dependency cache with matching hashes, and the app will load normally.

## Technical Detail
- File changed: `src/App.tsx` line 1 (comment only)
- Cache cleared: `node_modules/.vite/deps/` (auto-regenerated on restart)
- No functional code changes needed

