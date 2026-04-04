

# Fix: Vite Dependency Cache Not Regenerated

## Root Cause
The previous fix deleted `node_modules/.vite/deps/` but the Vite dev server never completed re-optimization. Only a partial temp folder (`deps_temp_6b86385f`) exists. Every ES module import fails because the pre-bundled deps aren't available, causing "Main module failed to load."

## Fix

### Step 1: Clean up stale temp cache
Delete `node_modules/.vite/` entirely (including the orphaned temp folder).

### Step 2: Force Vite to re-optimize
Bump the comment in `src/App.tsx` line 1 from `v4` → `v5`. This triggers a full dev server restart which will regenerate the dependency cache from scratch.

## Result
Vite will re-run dependency pre-bundling on restart, creating a fresh `deps/` folder with correct hashes, and the app will load normally.

