

# Fix Playwright Tests — Ready to Run

## Issues Found

1. **`playwright.config.ts` has duplicate lines** (lines 33-36 repeat lines 29-32) — causes syntax error
2. **`global-setup.ts` uses wrong email** — `luay.dhuud.com` (missing `@`) vs test file uses `luay@dhuud.com`
3. **`global-setup.ts` uses wrong selectors** — `input[type="email"]` but login page uses `#email` (id-based)
4. **`hsse-complete.spec.ts` uses wrong selectors** — `input[name="email"]` but login page has no `name` attribute, only `id="email"`
5. **No `.auth` directory created** — global setup saves to `tests/.auth/` which may not exist
6. **`global-teardown.ts` uses test import incorrectly** — imports `test as teardown` from `@playwright/test` but teardown files should export a function, not use test()

## Plan

### Step 1: Fix `playwright.config.ts`
Remove duplicate lines 33-36. The valid config ends at line 32.

### Step 2: Fix `tests/global-setup.ts`
- Fix email: `luay.dhuud.com` → `luay@dhuud.com`
- Fix selectors: use `#email` and `#password` instead of `input[type="email"]` and `input[type="password"]`
- Ensure `tests/.auth/` directory is created before saving state

### Step 3: Fix `tests/global-teardown.ts`
Convert to a simple export default function (standard Playwright global teardown pattern).

### Step 4: Fix `tests/hsse-complete.spec.ts` login helper
Change selectors from `input[name="email"]` / `input[name="password"]` to `#email` / `#password` to match actual login page.

### Step 5: Create `tests/.auth/.gitkeep`
Ensure the auth directory exists for storage state files.

## Summary
5 files fixed, all selector mismatches resolved, config syntax error removed. After this, `npx playwright test` will be runnable.

