

# Fix: Profile Data Not Populated for Invitation-Based Users

## Problem

The user `l.r.love07@gmail.com` logged in successfully, but their profile page shows empty fields (no name, phone, photo, branch). The profile row exists but has `NULL` for all data columns because:

1. When the profile was created during login, `invitationEmail` was null (session context had been lost)
2. The invitation metadata didn't contain `full_name` or branch info — those fields exist on the `contractor_representatives` table, not the invitation
3. The profile creation code at line 574-591 only uses `metadata.full_name` and `invitationEmail`, both of which were empty
4. Now that the profile exists (with nulls), the `!existingProfile` check on line 511 prevents re-running the population logic

## Data Situation

The representative record (`85deed09`) has all the correct data:
- `full_name`: لؤي ابراهيم محمد مدخلي
- `mobile_number`: +966537249823
- `email`: l.r.love07@gmail.com
- `photo_path`: exists (uploaded photo)
- `company.assigned_branch_id`: db84436e

But the profile has all NULLs except `tenant_id`, `user_id`, and `is_active`.

## Fix Plan

### Change 1: Enrich profile creation from representative data
**File:** `src/pages/Login.tsx` (lines 556-591)

When creating a profile for a `contractor_representative` invitation, fetch the full representative record (not just `mobile_number`) and use it to populate profile fields:

```
- full_name → representative.full_name
- email → representative.email or user.email
- phone_number → representative.mobile_number
- avatar_url → signed URL from representative.photo_path
- assigned_branch_id → company.assigned_branch_id
```

This ensures the profile is fully populated even if `invitationEmail` and `metadata.full_name` are null.

### Change 2: Add a repair path for existing empty profiles
**File:** `src/pages/Login.tsx` (around line 511)

Currently: if `existingProfile` exists, skip everything.

Change to: if `existingProfile` exists but has null email/full_name, and the user has an unused or recently-used contractor invitation, update the profile with data from the representative record. This repairs the current broken profile and any future cases where profile creation partially succeeded.

```
if (existingProfile) {
  // Check if profile needs repair (missing critical fields)
  const { data: fullProfile } = await supabase
    .from('profiles')
    .select('email, full_name')
    .eq('user_id', user.id)
    .maybeSingle();
    
  if (!fullProfile?.email && !fullProfile?.full_name) {
    // Find invitation for this user and repair profile from representative data
    // ... repair logic using representative record
  }
}
```

### Change 3: Use user.email as reliable fallback
**File:** `src/pages/Login.tsx` (line 578)

Change `email: invitationEmail` to `email: invitationEmail || user.email` so the email is never null even if invitation context was lost.

## Files to Modify

| File | Change |
|------|--------|
| `src/pages/Login.tsx` | Enrich profile from representative record; add repair path for empty profiles; use user.email fallback |

## Expected Outcome

- The existing profile for `l.r.love07@gmail.com` will be repaired on next login with name, email, phone, photo, and branch from the representative record
- Future contractor representative signups will have fully populated profiles from the start
- The profile page will correctly display all information and photo

