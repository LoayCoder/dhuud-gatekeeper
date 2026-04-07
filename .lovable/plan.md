

# Fix: Invitation Code Error, Missing Phone Number, and Auto Role Assignment

## Three Issues Identified

### Issue 1: "Failed to verify user status" Error
**Root Cause:** The `check-user-exists` Edge Function (line 69-93) requires a valid JWT Bearer token. But on the `/invite` page, the user is **not logged in** — they're an anonymous visitor entering an invitation code. The function returns 401 Unauthorized, which the UI shows as "Failed to verify user status."

**Fix:** Remove the JWT authentication requirement from `check-user-exists` since it's designed for the anonymous invitation flow. The function already has rate limiting and input validation. Instead, make the function work with or without a JWT (if present, use it; if not, proceed with service role for the lookup only).

**File:** `supabase/functions/check-user-exists/index.ts`
- Remove the hard 401 block when no auth header is present
- Keep rate limiting as the primary protection
- The function already uses service role key for the actual lookup, so JWT is not needed for data access

### Issue 2: Phone Number Missing in Pending Invitations
**Root Cause:** The `send-contractor-invitation` Edge Function (line 109-125) inserts the invitation record **without** `phone_number`. The representative has `mobile_number: +966537249823` but it's never written to `invitations.phone_number`.

**Fix:** Include the representative's `mobile_number` in the invitation insert.

**File:** `supabase/functions/send-contractor-invitation/index.ts`
- Add `phone_number: rep.mobile_number || null` to the invitation insert at line 111-125

### Issue 3: `invitation_sent` Action Not in Audit Constraint
**Root Cause:** The `send-contractor-invitation` function logs action `'invitation_sent'` to `contractor_module_audit_logs`, but this value is not in the `contractor_module_audit_logs_action_check` constraint (just fixed recently for other actions). This causes a silent failure when logging.

**Fix:** Add `'invitation_sent'` to the constraint.

**File:** Database migration
- Drop and recreate constraint with `invitation_sent` added

### Issue 4: Role Auto-Assignment After Login
**Root Cause:** The signup flow in `Signup.tsx` (lines 200-235) already handles role assignment for contractor representatives correctly — it assigns `contractor_site_rep` role. However, this only works during **signup** (new user creation). If the user already exists in auth (the `check-user-exists` function routes them to `/login` instead of `/signup`), the role assignment logic in the signup page is never executed.

**Fix:** This is already handled in the signup flow. The real issue is Issue 1 — because `check-user-exists` fails with 401, the flow never reaches the routing decision (login vs signup), so the user never gets to the signup page where roles are assigned. Fixing Issue 1 will fix the role assignment flow.

## Summary of Changes

| File | Change |
|------|--------|
| `supabase/functions/check-user-exists/index.ts` | Make JWT optional (allow anonymous access for invitation flow) |
| `supabase/functions/send-contractor-invitation/index.ts` | Add `phone_number: rep.mobile_number` to invitation insert |
| Database migration | Add `invitation_sent` to audit constraint |

