

# Fix: Invitation Login Blocked by `profile_not_found` Rejection

## Root Cause

The login flow has a fatal ordering issue. When user `l.r.love07@gmail.com` logs in:

1. `validate-user-access` returns `{ allowed: false, reason: 'profile_not_found' }` — because the user has no profile yet
2. Line 351-378 immediately signs the user out and shows "You do not have access to this organization"
3. The invitation profile creation code at line 486-579 **never executes** because the function already returned at step 2

The user exists in auth (confirmed), has an unused invitation with correct metadata, but the login blocks them before the profile can be created.

## Fix

### Change 1: Skip `profile_not_found` rejection during invitation flow

**File:** `src/pages/Login.tsx` (lines 351-379)

When `isCodeValidated` is true (invitation flow active) and the rejection reason is `profile_not_found`, skip the sign-out block and let execution continue to the invitation profile creation code at line 486.

```text
Before:
  if (accessValidation && accessValidation.allowed === false) {
    // signs out and returns for ALL reasons

After:
  if (accessValidation && accessValidation.allowed === false) {
    if (isCodeValidated && accessValidation.reason === 'profile_not_found') {
      // Skip — profile will be created below from invitation data
    } else {
      // existing sign-out and error logic
    }
  }
```

### Change 2: Add navigation after profile creation

**File:** `src/pages/Login.tsx` (after line 572)

After the profile and roles are successfully created, navigate to the appropriate destination (contractor portal for contractor reps, or the default return route). Currently the code creates the profile but doesn't navigate, leaving the user stuck.

```typescript
// After profile creation succeeds:
hasNavigated.current = true;
if (isContractorRep) {
  navigate('/contractor-portal');
} else {
  navigate(returnTo);
}
```

### Change 3: Fetch phone number from representative record

**File:** `src/pages/Login.tsx` (around line 510-520)

When the invitation metadata lacks `phone_number`, fetch it from the `contractor_representatives` table using `metadata.representative_id`. This ensures the profile has the correct phone number.

## Summary

| File | Change |
|------|--------|
| `src/pages/Login.tsx` | Bypass `profile_not_found` block when invitation flow is active; add post-creation navigation; fetch missing phone from representative |

This fix is structural and applies to **all** future invitation-based logins, not just this specific user.

