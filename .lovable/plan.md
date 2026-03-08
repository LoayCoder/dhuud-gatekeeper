

## Plan: Fix i18n nesting for `/client-site-rep` page

### Root Cause
The `clientSiteRep`, `violations`, and `accessControl` keys were added **inside the wrong parent objects**:
- **EN**: Nested inside a duplicate `"admin"` block (line 10823) → resolved path is `admin.clientSiteRep.*`
- **AR**: Nested inside a duplicate `"ptw"` block (line 10197) → resolved path is `ptw.clientSiteRep.*`

Components call `t("clientSiteRep.dashboard")` — a **top-level** path — so the keys are never found.

### Fix

#### 1. `src/locales/en/translation.json`
- Remove `clientSiteRep`, `violations`, and `accessControl` from inside the second `admin` block (lines 10858–10966)
- Close the `admin` block after `badges` (line 10857)
- Add `clientSiteRep`, `violations`, and `accessControl` as **top-level** siblings (same depth as `"assets"`, `"admin"`, etc.)

#### 2. `src/locales/ar/translation.json`
- Remove `clientSiteRep`, `violations`, and `accessControl` from inside the second `ptw` block (lines 10834–10942)
- Close the `ptw` block after `fields` (line 10833)
- Add `clientSiteRep`, `violations`, and `accessControl` as **top-level** siblings

### No component changes needed
All `t()` calls already use the correct top-level paths.

