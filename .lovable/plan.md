

# Login Flow Optimization, Session Timeout, and Config Bug Fix

## Problem Summary

1. **Slow login**: The `handleLogin` function in `Login.tsx` runs 7+ network calls sequentially, causing 2-5 second delays
2. **Frequent logouts**: Tenant session timeout is set to 15 minutes, which is too short for active users
3. **Config bug**: `use-tenant-session-config.ts` queries `.eq('id', user.id)` instead of `.eq('user_id', user.id)`, causing the tenant config to never load (always falls back to 15-minute default)

---

## Fix 1: Tenant Session Config Bug

**File:** `src/hooks/use-tenant-session-config.ts`

Change line 32 from `.eq('id', user.id)` to `.eq('user_id', user.id)` so the profile lookup actually finds the user's record and loads the correct tenant timeout.

---

## Fix 2: Increase Default Session Timeout

**File:** `src/hooks/use-tenant-session-config.ts`

- Change `DEFAULT_TIMEOUT_MINUTES` from `15` to `60` (1 hour)
- Change `DEFAULT_WARNING_THRESHOLD_MINUTES` from `2` to `5`

Additionally, update the tenant records in the database:

**Database Migration:**
```sql
UPDATE tenants SET session_timeout_minutes = 60 WHERE session_timeout_minutes = 15;
```

This gives users a 1-hour inactivity window with a 5-minute warning, which is standard for enterprise apps.

---

## Fix 3: Parallelize Login Flow

**File:** `src/pages/Login.tsx`

The current `handleLogin` function (lines 258-457) executes these calls sequentially:

1. `signInWithPassword` (must be first)
2. `validate-user-access` edge function
3. `getUser`
4. `mfa.getAuthenticatorAssuranceLevel`
5. `checkTrustedDevice`
6. `refreshTenantData`
7. `logUserActivity`
8. `detectSuspiciousLogin`
9. `verifyDevice` (profile query + device verify)

**Optimization strategy:**

After `signInWithPassword` succeeds (step 1 must remain first), parallelize the remaining calls into groups:

- **Group A (blocking -- needed for flow decisions):** Run `validate-user-access` and `getUser` + `mfa.getAuthenticatorAssuranceLevel` in parallel using `Promise.all`
- **Group B (after MFA decision):** Run `refreshTenantData`, `startSessionTracking`, and `logUserActivity` in parallel using `Promise.all`
- **Group C (non-blocking -- fire and forget):** `detectSuspiciousLogin`, `checkPasswordBreach`, and `verifyDevice` run after navigation without awaiting

This reduces the login time from ~7 sequential round trips to ~3 sequential groups.

### Before (simplified):
```
signIn -> validate-access -> getUser -> getAAL -> checkTrusted -> refreshTenant -> logActivity -> detectSuspicious
(7 sequential calls = ~2-5s)
```

### After:
```
signIn -> [validate-access + getUser + getAAL] -> [refreshTenant + logActivity] -> navigate (fire-and-forget: detect + verify)
(3 sequential steps = ~1-2s)
```

---

## Files Summary

| # | File | Change |
|---|------|--------|
| 1 | `src/hooks/use-tenant-session-config.ts` | Fix `.eq('id')` to `.eq('user_id')`, increase defaults to 60min/5min |
| 2 | `src/pages/Login.tsx` | Parallelize post-auth network calls in `handleLogin` |
| 3 | Database migration | Update existing tenant timeout from 15 to 60 minutes |

## Risk Assessment

- **Config fix**: Zero risk -- corrects a clear bug
- **Timeout increase**: Low risk -- improves UX, tenant admins can still customize via settings
- **Login parallelization**: Low risk -- same calls, just concurrent. Auth flow logic (MFA gating) preserved

