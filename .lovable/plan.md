
# Admin Password Reset with WhatsApp Notification

## Overview
Implement a feature that allows administrators to reset a user's password and automatically send the new temporary password to the user via WhatsApp.

---

## User Flow

1. Admin navigates to **User Management** page
2. Admin clicks a new **"Reset Password"** action button on a user row
3. System generates a secure temporary password
4. System updates the user's password in the authentication system
5. System sends a bilingual WhatsApp message to the user with the new password
6. System logs the password reset action in audit logs
7. Admin sees success/failure toast notification

---

## Components to Create/Modify

### 1. New Edge Function: `admin-reset-password`

**Location:** `supabase/functions/admin-reset-password/index.ts`

**Purpose:** Securely reset a user's password and send WhatsApp notification

**Security Features:**
- Requires authenticated admin caller
- Validates caller is admin via `is_admin` RPC
- Enforces tenant isolation (admin can only reset passwords for users in same tenant)
- Generates cryptographically secure temporary password
- Logs action to audit trail

**Request Payload:**
```text
{
  user_id: string (UUID of target user)
}
```

**Process:**
1. Validate admin authorization
2. Verify target user belongs to same tenant
3. Get user's phone number from profile
4. Generate secure temporary password (12 chars: uppercase, lowercase, digits, special)
5. Call `supabase.auth.admin.updateUserById()` with new password
6. Send WhatsApp message via existing `sendWhatsAppText()` utility
7. Log action to `admin_audit_logs` table
8. Return success/failure response

---

### 2. Update User Management UI

**File:** `src/pages/admin/UserManagement.tsx`

**Changes:**
- Add `resetPasswordLoading` state (tracks which user is being reset)
- Add `handleResetPassword(userId, userName, phoneNumber)` function
- Add "Reset Password" button/icon in user actions column
- Add confirmation dialog before reset
- Show toast on success/failure

**UI Element:** Key icon (🔑) button next to edit/sync buttons

---

### 3. Update Edge Function Config

**File:** `supabase/config.toml`

Add:
```toml
[functions.admin-reset-password]
verify_jwt = true
```

---

### 4. Add Translation Keys

**Files:** All 5 locale files (en, ar, hi, ur, fil)

**New Keys:**
```text
userManagement.resetPassword - "Reset Password"
userManagement.resetPasswordConfirm - "Reset password for {{name}}?"
userManagement.resetPasswordDescription - "A new temporary password will be generated and sent to the user via WhatsApp."
userManagement.passwordResetSuccess - "Password reset successfully"
userManagement.passwordSentViaWhatsApp - "Temporary password sent via WhatsApp to {{phone}}"
userManagement.noPhoneNumber - "User has no phone number configured"
userManagement.resetPasswordFailed - "Failed to reset password"
```

---

## Edge Function Implementation Details

### Password Generation
```text
function generateSecurePassword(length = 12): string {
  const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lowercase = 'abcdefghjkmnpqrstuvwxyz';
  const digits = '23456789';
  const special = '!@#$%';
  
  // Ensure at least one of each type
  let password = '';
  password += uppercase[random] + lowercase[random] + digits[random] + special[random];
  
  // Fill remaining with random from all sets
  const allChars = uppercase + lowercase + digits + special;
  for (let i = 4; i < length; i++) {
    password += allChars[random];
  }
  
  return shuffle(password);
}
```

### WhatsApp Message Template (Bilingual)
```text
🔐 تم إعادة تعيين كلمة المرور

مرحباً {{userName}},

تم إعادة تعيين كلمة المرور الخاصة بحسابك على منصة ضود.

كلمة المرور المؤقتة: *{{password}}*

يرجى تسجيل الدخول وتغيير كلمة المرور فوراً.

---

🔐 Password Reset

Hello {{userName}},

Your password for Dhuud HSSE Platform has been reset.

Temporary Password: *{{password}}*

Please login and change your password immediately.
```

---

## Technical Diagram

```text
┌─────────────────┐     ┌──────────────────────┐     ┌─────────────────┐
│   Admin UI      │     │  Edge Function       │     │   WhatsApp      │
│  (UserMgmt)     │     │ (admin-reset-pwd)    │     │   (WaSender)    │
└────────┬────────┘     └──────────┬───────────┘     └────────┬────────┘
         │                         │                          │
         │  1. Reset Password      │                          │
         │─────────────────────────>│                          │
         │                         │                          │
         │                         │ 2. Validate Admin        │
         │                         │    Check Tenant          │
         │                         │    Get User Phone        │
         │                         │                          │
         │                         │ 3. Generate Password     │
         │                         │                          │
         │                         │ 4. Update Auth           │
         │                         │    (admin.updateUserById)│
         │                         │                          │
         │                         │ 5. Send WhatsApp         │
         │                         │─────────────────────────>│
         │                         │                          │
         │                         │    WhatsApp Delivered    │
         │                         │<─────────────────────────│
         │                         │                          │
         │                         │ 6. Log to Audit          │
         │                         │                          │
         │  7. Success Response    │                          │
         │<─────────────────────────│                          │
         │                         │                          │
```

---

## Files to Create/Modify

| File | Action | Description |
|:-----|:-------|:------------|
| `supabase/functions/admin-reset-password/index.ts` | Create | New edge function for password reset |
| `supabase/config.toml` | Modify | Add function config with `verify_jwt = true` |
| `src/pages/admin/UserManagement.tsx` | Modify | Add reset password button and handler |
| `src/locales/en/translation.json` | Modify | Add English translation keys |
| `src/locales/ar/translation.json` | Modify | Add Arabic translation keys |
| `src/locales/hi/translation.json` | Modify | Add Hindi translation keys |
| `src/locales/ur/translation.json` | Modify | Add Urdu translation keys |
| `src/locales/fil/translation.json` | Modify | Add Filipino translation keys |

---

## Security Considerations

1. **Admin-only access** - Function validates caller is admin before proceeding
2. **Tenant isolation** - Admin can only reset passwords for users in their tenant
3. **Secure password generation** - Uses crypto.getRandomValues() for randomness
4. **Audit logging** - All password resets logged with admin ID, target user, timestamp, IP
5. **No password exposure in logs** - Password is never logged, only sent via WhatsApp
6. **Phone number required** - Function returns error if user has no phone number

---

## Validation Requirements

Before reset:
- Target user must exist
- Target user must be in same tenant as admin
- Target user must have a phone number configured
- Target user must have an auth account (`has_login = true`)

---

## Error Handling

| Scenario | Response |
|:---------|:---------|
| No phone number | Return error with message "User has no phone number" |
| User not found | Return 404 error |
| Cross-tenant attempt | Return 403 error |
| Non-admin caller | Return 403 error |
| WhatsApp send fails | Return partial success, password was changed but notification failed |
| Auth update fails | Return 500 error, password not changed |
