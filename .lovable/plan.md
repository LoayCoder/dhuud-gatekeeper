

# Temporary MFA Grace Period After Disabling 2FA

## Problem
When a user disables 2FA from their profile settings, `mfaEnabled` becomes `false`, and `ProtectedRoute` (line 153) immediately redirects them to `/mfa-setup` — forcing them to re-enable it. There's no way to temporarily skip the MFA requirement.

## Solution
Add a **grace period** mechanism: when a user disables MFA (or clicks "Skip for now" on setup), they get a temporary window (e.g., 24 hours) before being forced to set it up again.

### Database Change
Add `mfa_grace_until` column to `tenant_user_mfa_status`:
```sql
ALTER TABLE public.tenant_user_mfa_status 
ADD COLUMN mfa_grace_until timestamptz DEFAULT NULL;
```

### Code Changes (4 files)

1. **`src/contexts/AuthContext.tsx`**
   - Add `mfaGraceUntil` state
   - In `checkTenantMfaStatus`, read `mfa_grace_until` from the DB record
   - Expose `mfaGraceActive` (computed: `mfaGraceUntil && new Date() < mfaGraceUntil`) in context

2. **`src/components/auth/ProtectedRoute.tsx`** (line 153)
   - Change MFA redirect logic: skip redirect if `mfaGraceActive` is true
   ```
   if (!mfaEnabled && !mfaGraceActive && path !== '/mfa-setup') → redirect
   ```

3. **`src/components/profile/MFADisableDialog.tsx`**
   - After successfully disabling MFA, set `mfa_grace_until` to `now + 24 hours` in `tenant_user_mfa_status`, so the user isn't immediately bounced back to setup

4. **`src/pages/MFASetup.tsx`**
   - Add a "Skip for now" / "Remind me later" button on the intro step
   - When clicked, set `mfa_grace_until` to `now + 24 hours` in DB, then navigate to `/`
   - Show a subtle note: "You can set this up later from your profile settings"

### Flow
```text
User disables 2FA → grace_until = now+24h → can use app normally
                  → after 24h → redirected to /mfa-setup again

User on /mfa-setup → clicks "Skip for now" → grace_until = now+24h → goes to home
                   → after 24h → forced back to /mfa-setup
```

### Scope
- 1 migration (add column)
- 4 files modified

