

# Fix: "Skip for now" Button Does Nothing on MFA Setup Page

## Root Cause

React state race condition. The "Skip for now" button:
1. Upserts a grace period record to the database (works fine)
2. Calls `await refreshProfile()` which internally calls `setMfaGraceUntil(...)` (a React setState)
3. Immediately calls `navigate('/')`

But React state updates from `refreshProfile` haven't propagated yet when navigation happens. The `ProtectedRoute` on `/` still sees `mfaGraceActive = false` and redirects right back to `/mfa-setup` — making it appear as if nothing happened.

## Fix

**File:** `src/pages/MFASetup.tsx` (lines 361-396)

Instead of relying on `refreshProfile` to update React state before navigation, update the `mfaGraceUntil` state directly in the AuthContext before navigating. Two changes:

1. **Expose `setMfaGraceUntil` from AuthContext** (or add a helper `setGracePeriod` method) so MFASetup can set the grace state synchronously before navigating.

2. **In the "Skip for now" handler**, after the database upsert, call the new setter directly, then navigate. This ensures `ProtectedRoute` sees the updated state immediately.

**File:** `src/contexts/AuthContext.tsx`
- Add `setMfaGracePeriod: (until: Date) => void` to the context type and value
- This function sets `mfaGraceUntil` state directly

**File:** `src/pages/MFASetup.tsx`
- Import and use `setMfaGracePeriod(graceUntilDate)` before `navigate('/')`
- Remove reliance on `refreshProfile` for the grace period state update

## Summary

| File | Change |
|------|--------|
| `src/contexts/AuthContext.tsx` | Expose `setMfaGracePeriod` helper in context |
| `src/pages/MFASetup.tsx` | Use direct state setter before navigating after skip |

