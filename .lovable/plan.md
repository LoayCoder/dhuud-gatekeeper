

# Fix: Login + MFA Skip Flow for Previously-Deleted Contractor Representatives

## Problem Summary

User `l.r.love07@gmail.com` was previously registered and deleted. They now have:
- An auth account (confirmed, can sign in)
- **No profile** in the `profiles` table
- 3 unused invitations (contractor representative) in the Dhuud tenant
- An active `contractor_representatives` record (rep id: `85deed09`) with `user_id = null`
- A soft-deleted legacy representative record linked to a different auth user

The login fails because of **two sequential issues**:

1. **Login.tsx**: The `validate-user-access` bypass for `profile_not_found` (line 354) works correctly now, BUT the invitation profile creation code (line 492) depends on `isCodeValidated` being `true`. This state is stored in React memory (`ThemeContext`) and is lost if the user navigates directly to `/login` without going through `/invite` first, or if the page reloads.

2. **MFASetup.tsx**: Even if the profile IS created successfully, the "Skip for now" button (line 365-370) queries `profiles` to get `tenant_id` for the grace period upsert. If the profile fetch fails or returns nothing (race condition, RLS issue), it silently skips the grace period write, navigates to `/`, and `ProtectedRoute` bounces the user back to `/login` because there's no valid MFA grace period.

## Root Causes

### Root Cause 1: Invitation context not durable
`isCodeValidated`, `invitationEmail`, and `invitationCode` are React state in `ThemeContext`. They vanish on page reload or if the user navigates away from the invitation flow. When the user lands on `/login` directly (e.g., after being redirected from ProtectedRoute), these values are all `null/false`, so the invitation profile creation block at line 492 is skipped entirely.

### Root Cause 2: MFA skip silently fails without a profile
The "Skip for now" handler fetches the profile to get `tenant_id`. If the profile doesn't exist yet or the query fails, no grace period is written. The user gets navigated to `/` but immediately bounces back because ProtectedRoute's MFA check fails.

### Root Cause 3: No fallback invitation lookup
When `isCodeValidated` is false, Login.tsx never attempts to find an unused invitation for the signing-in user's email. This means the system can't self-heal — it only works if the user followed the exact `/invite` → `/login` flow without interruption.

## Fix Plan

### Change 1: Persist invitation context in sessionStorage
**File:** `src/contexts/ThemeContext.tsx`

When `setInvitationData` is called, also write `{ email, code, tenantId }` to `sessionStorage`. On ThemeProvider mount, restore from sessionStorage if React state is empty. On `clearInvitationData`, clear sessionStorage too.

This ensures the invitation context survives page reloads and redirects through MFA setup.

### Change 2: Add fallback invitation lookup in Login.tsx
**File:** `src/pages/Login.tsx` (around line 492)

When `isCodeValidated` is false but a user just signed in and has no profile, attempt to find an unused invitation for their email:

```
if no profile exists AND isCodeValidated is false:
  query invitations table for unused invitations matching this email
  if found, use the most recent one to create the profile
```

This handles the case where invitation context was lost but the data is still in the database.

### Change 3: Fix MFA skip to handle missing profile gracefully
**File:** `src/pages/MFASetup.tsx` (lines 362-395)

When the profile query returns null (no profile yet), try to get the tenant_id from:
1. The user's `raw_user_meta_data.tenant_id` (already set during signup)
2. SessionStorage invitation data
3. A direct invitation lookup

If tenant_id is found, still write the grace period. If not, show an error instead of silently failing.

### Change 4: Ensure ProtectedRoute doesn't loop for new invitation users
**File:** `src/components/auth/ProtectedRoute.tsx`

The current flow: no profile → `validateTenantAccess` returns false → redirect to `/login`. This is correct for unauthorized users, but for users who just completed invitation signup, the profile may exist but AuthContext hasn't refreshed yet. Add a small delay or force a profile refresh before redirecting.

## Technical Details

### SessionStorage keys
- `invitation_context`: `{ email, code, tenantId }` — written on invitation validation, cleared after profile creation

### Fallback invitation query
```sql
SELECT * FROM invitations 
WHERE email ILIKE $1 
  AND used = false 
  AND expires_at > now()
ORDER BY created_at DESC 
LIMIT 1
```

### MFA skip tenant_id resolution order
1. `profiles.tenant_id` (primary)
2. `sessionStorage.invitation_context.tenantId` (fallback)
3. `auth.users.raw_user_meta_data.tenant_id` (last resort)

## Files to Modify
| File | Change |
|------|--------|
| `src/contexts/ThemeContext.tsx` | Persist/restore invitation context in sessionStorage |
| `src/pages/Login.tsx` | Add fallback invitation lookup when `isCodeValidated` is false |
| `src/pages/MFASetup.tsx` | Handle missing profile in skip flow; resolve tenant_id from alternatives |
| `src/components/auth/ProtectedRoute.tsx` | Minor: ensure profile refresh before access rejection redirect |

