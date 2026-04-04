

# Fix: Contractor Invitation Must Use the Same Invitation Code Flow as Employees

## Problem

Currently, the `send-contractor-invitation` edge function sends a generic email with a direct link to `/contractor-portal`. It does NOT:
1. Create a record in the `invitations` table (with a unique code)
2. Include an invitation code in the email
3. Route the contractor to the `/invite` → `/signup` flow

This means the contractor representative has no way to set up their account. Employees use the `invitations` table + `lookup_invitation` RPC + InviteGatekeeper page + Signup page — contractors should follow the same process.

## Solution

### Step 1: Update `send-contractor-invitation` edge function

Modify the edge function to:
- Generate a unique invitation code (e.g., 8-char alphanumeric)
- Insert a record into the `invitations` table with: `code`, `email`, `full_name`, `tenant_id`, `expires_at` (e.g., 7 days), `metadata` containing `{ type: 'contractor_representative', company_id, representative_id }`
- Change the email CTA button URL from `/contractor-portal` to `/invite?code={CODE}` so the recipient lands on the InviteGatekeeper page
- Include the invitation code visibly in the email body (so the user can also enter it manually)

### Step 2: Update `lookup_invitation` RPC handling (if needed)

Check that `lookup_invitation` returns the invitation data correctly for contractor invitations. The existing RPC should work since contractor invitations will use the same `invitations` table. The `metadata.type = 'contractor_representative'` field will distinguish them from employee invitations.

### Step 3: Update Signup flow to handle contractor role assignment

In the Signup page (`src/pages/Signup.tsx`), after account creation:
- Check `invitation.metadata.type === 'contractor_representative'`
- If so, link the new user to the `contractor_representatives` record by setting `user_id` on the matching `contractor_representatives` row
- Assign the appropriate role (e.g., `contractor_representative` or similar)

### Step 4: Update post-login routing

After a contractor representative logs in, they should be redirected to `/contractor-portal` instead of `/dashboard`. This may require checking if the user has a `contractor_representatives` link and routing accordingly.

## Files Changed

| File | Change |
|------|--------|
| `supabase/functions/send-contractor-invitation/index.ts` | Create `invitations` record with code; update email to include code and link to `/invite?code={CODE}` |
| `src/pages/Signup.tsx` | After signup, check invitation metadata for contractor type and link user to `contractor_representatives` |
| `src/pages/Login.tsx` or routing logic | Add post-login redirect to `/contractor-portal` for contractor reps |

## End-to-End Flow After Fix

1. Admin clicks "Send Portal Invitation" for GBR
2. Edge function creates an `invitations` record with code `ABC12345`, email `islam@gbrksa.com`, metadata `{ type: 'contractor_representative', company_id: '...' }`
3. Islam receives email with code `ABC12345` and a button linking to `/invite?code=ABC12345`
4. Islam clicks the link → lands on InviteGatekeeper → code is validated → redirected to Signup
5. Islam creates account (email pre-filled, sets password)
6. On signup, system links Islam's user to `contractor_representatives` table
7. Islam logs in → routed to `/contractor-portal`

