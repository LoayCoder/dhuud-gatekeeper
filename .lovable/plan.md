

# Fix: Login Page Infinite Refresh Loop

## Root Cause

The Login page has a **cascading re-render loop** caused by three interacting problems:

### Problem 1: `onAuthStateChange` triggers on every token event
The `useEffect` at line 82 subscribes to `onAuthStateChange` and calls `checkMFAAndNavigate()` on **every** auth event (including `TOKEN_REFRESHED`, `INITIAL_SESSION`). Each call to `checkMFAAndNavigate` makes 3 Supabase API calls (`getUser`, `mfa.getAuthenticatorAssuranceLevel`, `mfa.listFactors`). If any of these fail (network timing, race condition), it calls `signOut()` — which triggers **another** `onAuthStateChange` event, creating a loop.

### Problem 2: `useEffect` dependency on `showMFADialog`
The `useEffect` at line 56 depends on `showMFADialog`. When MFA dialog state changes, the entire subscription is torn down and recreated, causing a new `INITIAL_SESSION` event, which calls `checkMFAAndNavigate` again.

### Problem 3: `checkExistingSession` + `onAuthStateChange` race
Both `checkExistingSession()` (line 63) and `onAuthStateChange` (line 85) call `checkMFAAndNavigate()` in parallel when there's an existing session. Two simultaneous `getUser()` + `signOut()` calls race against each other, causing rapid state flips.

**On www.dhuud.com (production):** The user has a valid session cookie. On page load, `checkExistingSession` runs → finds session → calls `checkMFAAndNavigate` → navigates to `/` → ProtectedRoute redirects to `/mfa-setup` or back to login → loop.

## Fix Plan

### Step 1: Add navigation guard to prevent re-triggering (Login.tsx)
- Add a `hasNavigated` ref that is set to `true` once `navigate()` is called
- Skip `checkMFAAndNavigate` if `hasNavigated.current` is true
- This breaks the loop immediately

### Step 2: Filter auth events in `onAuthStateChange` (Login.tsx)
- Only react to `SIGNED_IN` event, not `TOKEN_REFRESHED` or `INITIAL_SESSION`
- The initial session check is already handled by `checkExistingSession`

### Step 3: Remove `showMFADialog` from useEffect deps (Login.tsx)
- Use a ref for `showMFADialog` in the auth change listener instead of depending on it
- This prevents re-subscribing and re-triggering the initial session check

### Step 4: Remove aggressive `signOut()` on MFA check errors (Login.tsx)
- In `checkMFAAndNavigate`, instead of calling `signOut()` on AAL errors, just return without navigating
- Only sign out if the session itself is invalid (getUser fails), not if MFA metadata checks fail

## Files Changed

| File | Change |
|------|--------|
| `src/pages/Login.tsx` | Add `hasNavigated` ref, filter auth events, fix deps, soften error handling |

## Impact
- Login page stops looping immediately
- Existing session detection still works (single check on mount)
- MFA flow preserved (dialog still shows when needed)
- No security regression — invalid sessions still get cleared

