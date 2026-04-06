

# Fix All Links to Use dhuud.com Instead of Lovable Domain

## Problem

1. **Invitation links use Lovable URL**: `window.location.origin` sends `8feca61a-...lovableproject.com` as the invite URL in WhatsApp/email messages instead of `https://www.dhuud.com`
2. **Hardcoded Lovable fallbacks**: Several edge functions fall back to `lovableproject.com` URLs
3. **Tenant-branded links**: You want Golf Saudi users to see their tenant name in links (e.g., `dhuud.com/golf-saudi/invite?code=...`) — this is partially possible for public pages but not practical for auth pages (login/signup must be shared)

## What Changes

### Step 1: Create a shared `getAppUrl()` utility on the frontend

Create a helper that always returns `https://www.dhuud.com` regardless of where the app is accessed from (preview, lovable, etc.):

```typescript
// src/lib/app-url.ts
export function getAppUrl(): string {
  return "https://www.dhuud.com";
}
```

### Step 2: Replace all `window.location.origin` in invitation/link-sharing code

Update these 7 files to use `getAppUrl()` instead of `window.location.origin` for outgoing links:

| File | Lines affected |
|------|---------------|
| `src/features/users/components/InvitationManagementPanel.tsx` | Lines 116, 136, 193 |
| `src/features/users/components/EditInvitationDialog.tsx` | Line 116 |
| `src/features/users/components/BulkInvitationImportDialog.tsx` | Lines 299, 321 |
| `src/components/tenants/InvitationManagement.tsx` | Lines 108, 205 |
| `src/pages/admin/UserManagement/hooks/useUserManagementSaveActions.ts` | Lines 117, 125 |

Note: `ForgotPassword.tsx` and `Signup.tsx` use `window.location.origin` for Supabase auth redirects — these must stay as-is since the redirect must go back to the current browser.

### Step 3: Fix all hardcoded Lovable fallbacks in Edge Functions

Replace `lovableproject.com` fallbacks with `https://www.dhuud.com`:

| File | Current fallback | Fix to |
|------|-----------------|--------|
| `onboard-worker/index.ts` (line 158) | `lovableproject.com` | `https://www.dhuud.com` |
| `send-bulk-induction/index.ts` (line 368) | `lovableproject.com` | `https://www.dhuud.com` |
| `send-induction-video/index.ts` (line 233) | `lovableproject.com` | `https://www.dhuud.com` |
| `send-gate-whatsapp/index.ts` (line 420) | `.lovable.app` fallback | `https://www.dhuud.com` |
| `add-security-headers/index.ts` (line 19) | `lovableproject.com` constant | Add `dhuud.com` |

### Step 4: Deploy affected edge functions

Deploy all modified edge functions.

## About Tenant-Branded Links

For **public-facing pages** (gate pass request/tracking), the system already supports tenant slugs: `dhuud.com/golf-saudi/request`. These work today.

For **auth pages** (signup, login, invite), tenant-branded URLs like `dhuud.com/golf-saudi/invite?code=X` would require significant routing changes. The simpler and more reliable approach is to keep `dhuud.com/invite?code=X` — the invitation itself already contains the tenant name (e.g., "Golf Saudi") in the message body, so the user knows which organization they're joining.

## Summary

| Step | Scope | Description |
|------|-------|-------------|
| 1 | Frontend utility | Create `getAppUrl()` returning `https://www.dhuud.com` |
| 2 | 5 frontend files | Replace `window.location.origin` with `getAppUrl()` for outgoing links |
| 3 | 5 edge functions | Fix Lovable domain fallbacks to `dhuud.com` |
| 4 | Deploy | Redeploy affected edge functions |

