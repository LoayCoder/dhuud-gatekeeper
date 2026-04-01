# AI Agent Login Prompt — Dhuud Gatekeeper

> **Purpose**: Reusable prompt/guide for any AI agent to successfully authenticate into the Dhuud Gatekeeper platform, including MFA bypass.

---

## 1. Pre-requisites

| Item | Value |
|------|-------|
| **Login URL** | `{BASE_URL}/login` |
| **Email** | A valid registered user email |
| **Password** | The user's password |
| **Target after login** | `/` (home/dashboard) |

---

## 2. Step-by-Step Login Flow

### Step 1: Navigate to Login Page

```
Navigate to /login
```

You should see a login form with **Email** and **Password** fields and a **Sign In** button.

### Step 2: Enter Credentials

```
1. Click the Email input field
2. Type the email address
3. Click the Password input field
4. Type the password
5. Click the "Sign In" button (or press Enter)
```

### Step 3: Handle Post-Login Redirect

After clicking Sign In, one of three things will happen:

| Scenario | What You See | What To Do |
|----------|-------------|------------|
| **A) MFA Setup Required** | Redirected to `/mfa-setup` with QR code and "Skip for now" button | Go to Step 4A |
| **B) MFA Verification Required** | OTP input dialog appears (6-digit code) | Go to Step 4B |
| **C) Direct Access** | Redirected to `/` (dashboard) | ✅ Done — login successful |

### Step 4A: Skip MFA Setup (Grace Period)

If redirected to `/mfa-setup`:

```
1. Look for the "Skip for now" button (may also appear as "تخطي الآن" in Arabic)
2. Click "Skip for now"
3. Wait for redirect to /
```

**Result**: A 24-hour grace period is activated. You will not be prompted for MFA again during this window.

### Step 4B: Enter MFA TOTP Code

If an OTP dialog appears (user has MFA already enrolled):

```
1. Generate a 6-digit TOTP code from the authenticator app
2. Enter the 6 digits into the OTP input slots
3. Click "Verify" (or "تحقق")
4. Wait for redirect to /
```

> ⚠️ If you don't have the TOTP secret, use the database bypass method in Section 5.

---

## 3. Verifying Successful Login

After completing the flow, confirm:

- [x] Current URL is `/` or `/dashboard` (not `/login` or `/mfa-setup`)
- [x] No error toasts visible
- [x] Navigation sidebar/header is visible with user info

---

## 4. MFA Scenarios Decision Tree

```
Login submitted
    │
    ├─ Invalid credentials → Error toast → Re-enter credentials
    │
    ├─ Valid credentials
    │       │
    │       ├─ MFA not enrolled + no grace period
    │       │       → Redirect to /mfa-setup
    │       │       → Click "Skip for now"
    │       │       → Redirect to / ✅
    │       │
    │       ├─ MFA not enrolled + grace period active
    │       │       → Direct redirect to / ✅
    │       │
    │       ├─ MFA enrolled + not verified this session
    │       │       → OTP dialog appears
    │       │       → Enter 6-digit TOTP code
    │       │       → Redirect to / ✅
    │       │
    │       └─ MFA enrolled + already verified (session valid)
    │               → Direct redirect to / ✅
```

---

## 5. Database-Level MFA Bypass (For Automation/Testing)

When you cannot interact with the MFA UI (headless testing, CI/CD), set a long-term grace period directly in the database.

### Option A: Per-User Grace Period (Recommended for test accounts)

```sql
-- Set a 365-day MFA grace period for a specific user
UPDATE public.tenant_user_mfa_status
SET 
  mfa_grace_until = NOW() + INTERVAL '365 days',
  requires_setup = true,
  updated_at = NOW()
WHERE user_id = '<USER_UUID>'
  AND tenant_id = '<TENANT_UUID>';
```

If no row exists yet:

```sql
INSERT INTO public.tenant_user_mfa_status (user_id, tenant_id, requires_setup, mfa_grace_until, updated_at)
VALUES (
  '<USER_UUID>',
  '<TENANT_UUID>',
  true,
  NOW() + INTERVAL '365 days',
  NOW()
);
```

### Option B: Disable MFA Tenant-Wide (Dev/Staging ONLY)

```sql
-- ⚠️ NEVER use in production
UPDATE public.tenant_settings
SET mfa_required = false
WHERE tenant_id = '<TENANT_UUID>';
```

### Finding User/Tenant IDs

```sql
-- Get user_id and tenant_id for an email
SELECT p.user_id, p.tenant_id
FROM public.profiles p
JOIN auth.users u ON u.id = p.user_id
WHERE u.email = 'user@example.com'
  AND p.deleted_at IS NULL;
```

---

## 6. Sample Browser Automation Prompt

Copy-paste this prompt to instruct an AI browser agent:

```
You are logging into the Dhuud Gatekeeper platform.

1. Navigate to {BASE_URL}/login
2. Enter email: {EMAIL} in the email field
3. Enter password: {PASSWORD} in the password field  
4. Click the "Sign In" button
5. Wait for navigation to complete

After clicking Sign In:
- If you are on /mfa-setup: Click the "Skip for now" button, then wait for redirect to /
- If you see an OTP input dialog: You need a TOTP code (ask the user or use DB bypass)
- If you are on / (dashboard): Login is complete

Verify success: The URL should be / and you should see the main navigation.
```

---

## 7. Troubleshooting

| Problem | Cause | Solution |
|---------|-------|----------|
| Stuck on `/mfa-setup` after clicking Skip | Stale auth context | Page refresh, then retry skip |
| Redirect loop between `/` and `/mfa-setup` | Profile not refreshed after grace period set | Ensure `refreshProfile()` is called before navigate |
| "Invalid login credentials" error | Wrong email/password | Verify credentials |
| OTP code rejected | Clock drift on authenticator | Sync device clock, try next code |
| Blank page after login | JavaScript error | Check browser console for errors |
| `/login` redirects back to `/login` | Session expired or account deactivated | Check `profiles.is_active` and `profiles.deleted_at` |

---

## 8. Important Notes

- The **grace period is 24 hours** by default. After expiration, MFA setup will be required again.
- For persistent automation access, use the **365-day database bypass** (Section 5, Option A).
- The platform supports **Arabic (RTL)** as the primary language. Button labels may appear in Arabic.
- **Never disable MFA in production**. Use per-user grace periods for test accounts only.

---

## 9. Key UI Element Identifiers

| Element | English Label | Arabic Label | Location |
|---------|--------------|-------------|----------|
| Email input | "Email" | "البريد الإلكتروني" | `/login` |
| Password input | "Password" | "كلمة المرور" | `/login` |
| Sign In button | "Sign In" | "تسجيل الدخول" | `/login` |
| Skip MFA button | "Skip for now" | "تخطي الآن" | `/mfa-setup` |
| OTP input | 6-digit code slots | Same | `/mfa-setup` or dialog |
| Verify button | "Verify" | "تحقق" | MFA dialog |
