

# Fix: "User Already Registered" Error on Invitation Signup

## Root Cause

The user `l.r.love07@gmail.com` exists in the authentication system (`auth.users`) but has **no profile record** in any tenant. The `check-user-exists` function relies on finding a profile to detect auth existence, and its fallback `listUsers` call doesn't actually filter by email — it just fetches page 1 with 1 result, which is a random user. So the function incorrectly returns `exists_in_auth: false`, routing the user to `/signup`. Signup then fails because the email is already taken in auth.

## Fix

**File:** `supabase/functions/check-user-exists/index.ts`

Replace the broken fallback logic (lines 140-165) with a direct approach: use `supabase.auth.admin.getUserById()` is not possible without an ID, so instead use a raw REST call to the GoTrue admin API to look up the user by email. Alternatively, the simplest fix is to use the `listUsers` endpoint properly or query `auth.users` via a service-role SQL RPC.

The most reliable fix: after the profile lookup fails, query `auth.users` directly using the admin client's `listUsers` and filter the result by email, OR better yet, use the admin `getUserByEmail` pattern (not natively supported by the JS SDK, but achievable via a direct REST call to `/auth/v1/admin/users?email=...`).

### Concrete Change

In the fallback section (lines 138-166), replace the broken `listUsers` logic with a direct GoTrue admin API call:

```typescript
// Fallback: check auth.users directly via GoTrue admin API
const response = await fetch(
  `${supabaseUrl}/auth/v1/admin/users?page=1&per_page=1&filter=${encodeURIComponent(email.toLowerCase())}`,
  {
    headers: {
      'Authorization': `Bearer ${serviceRoleKey}`,
      'apikey': serviceRoleKey,
    }
  }
);
if (response.ok) {
  const userData = await response.json();
  const matchedUser = userData.users?.find(
    (u: any) => u.email?.toLowerCase() === email.toLowerCase()
  );
  if (matchedUser) {
    existsInAuth = true;
    authUserId = matchedUser.id;
  }
}
```

This ensures that even when a user has no profile but exists in auth, the function correctly returns `should_login: true` instead of `should_signup: true`.

## Also Needed: Handle Login for Profile-less Users

Since this user has no profile in the tenant, after login the system needs to create their profile and link them to the contractor representative record. The Signup page already has this logic, so we should ensure the Login flow also handles "existing auth user, new tenant profile" by checking if a profile exists post-login and creating one if needed (using the invitation metadata).

**File:** `src/pages/Login.tsx` (or the post-login hook)
- After successful login, check if the user has a profile in the invitation's tenant
- If not, create one using the stored invitation metadata (company_id, representative_id)
- Assign the `contractor_site_rep` role

## Summary

| File | Change |
|------|--------|
| `supabase/functions/check-user-exists/index.ts` | Fix auth lookup to use GoTrue admin API filter instead of broken `listUsers` |
| Post-login flow | Ensure profile + role creation for auth-existing users entering a new tenant via invitation |

