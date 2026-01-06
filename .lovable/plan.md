# Fix: Tenant MFA Verification for Existing MFA Users

## Problem
When a user already has MFA enrolled globally (in `auth.mfa_factors`) but needs tenant-specific verification, the MFA setup page incorrectly tries to enroll a NEW factor, which fails with:
> "A factor with the friendly name 'Authenticator App' for this user already exists"

## Root Cause
1. `ProtectedRoute.tsx` correctly detects `mfaEnabled && !tenantMfaVerified` and redirects to `/mfa-setup` with `tenantVerification: true`
2. But `MFASetup.tsx` doesn't distinguish between:
   - **New enrollment** (user has NO MFA factors) - needs QR code scan
   - **Tenant verification** (user HAS MFA factors) - just needs to verify with existing authenticator

## Solution
Modify `MFASetup.tsx` to handle two different flows:

### Flow 1: New Enrollment (current behavior)
- User has NO verified MFA factors
- Show QR code, scan, verify, save

### Flow 2: Tenant Verification (NEW)
- User HAS verified MFA factors (`isEnabled = true`)
- AND `isTenantVerification = true`
- Skip QR code enrollment entirely
- Go directly to code verification step
- Use existing factor to challenge/verify
- On success, mark `tenant_user_mfa_status` as verified

## Files to Modify

### 1. `src/pages/MFASetup.tsx`

**Changes:**
1. Add new state `existingFactorId` to track if user has existing MFA
2. Modify `useEffect` to detect if user has existing factors AND needs tenant verification
3. Add new step type `'tenant-verify'` for the tenant verification flow
4. Create `handleTenantVerification` function that:
   - Uses existing factor ID from `useMFA().factors[0].id`
   - Calls `challenge(factorId)`
   - Verifies with user's OTP code
   - Marks tenant MFA as verified
5. Show different UI for tenant verification (no QR code needed)

**Key Logic:**
```typescript
useEffect(() => {
  if (!checkingAuth && isEnabled && isTenantVerification) {
    // User has MFA but needs tenant verification
    // Skip to verification step using existing factor
    setExistingFactorId(factors[0]?.id);
    setStep('tenant-verify'); // New step type
  }
}, [isEnabled, checkingAuth, isTenantVerification, factors]);
```

### 2. UI Changes for Tenant Verification Step

Show a simpler UI that:
- Explains "Please verify your identity with your authenticator app"
- Shows only the OTP input (no QR code)
- Has verify button
- On success, marks tenant MFA verified and redirects to dashboard

## Implementation Details

### New Step Type
```typescript
type Step = 'intro' | 'qrcode' | 'verify' | 'tenant-verify' | 'success';
```

### New State
```typescript
const [existingFactorId, setExistingFactorId] = useState<string | null>(null);
```

### New Handler
```typescript
const handleTenantVerify = async () => {
  if (!existingFactorId || code.length !== 6) return;
  
  setLoading(true);
  
  // Challenge the existing factor
  const challengeId = await challenge(existingFactorId);
  if (!challengeId) {
    setLoading(false);
    return;
  }
  
  // Verify the code
  const success = await verify(existingFactorId, challengeId, code);
  setLoading(false);
  
  if (success) {
    await markTenantMfaVerified();
    setStep('success');
    toast({
      title: t('mfaSetup.verificationComplete'),
      description: t('mfaSetup.tenantVerificationCompleteMessage'),
    });
  }
};
```

### New UI Section
```tsx
{step === 'tenant-verify' && (
  <>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <Shield className="h-5 w-5 text-primary" />
        {t('mfaSetup.verifyIdentity')}
      </CardTitle>
      <CardDescription>
        {t('mfaSetup.tenantVerifyDescription')}
      </CardDescription>
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="rounded-lg bg-muted p-4 text-sm text-center">
        <Smartphone className="h-8 w-8 mx-auto mb-2 text-primary" />
        <p>{t('mfaSetup.openAuthenticatorApp')}</p>
      </div>
      
      <div className="flex justify-center">
        <InputOTP maxLength={6} value={code} onChange={setCode}>
          <InputOTPGroup>
            <InputOTPSlot index={0} />
            <InputOTPSlot index={1} />
            <InputOTPSlot index={2} />
            <InputOTPSlot index={3} />
            <InputOTPSlot index={4} />
            <InputOTPSlot index={5} />
          </InputOTPGroup>
        </InputOTP>
      </div>
      
      <Button
        onClick={handleTenantVerify}
        disabled={code.length !== 6 || loading}
        className="w-full"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin me-2" /> : null}
        {t('common.verify')}
      </Button>
    </CardContent>
  </>
)}
```

## Translation Keys to Add

**English:**
```json
{
  "mfaSetup.verifyIdentity": "Verify Your Identity",
  "mfaSetup.tenantVerifyDescription": "Enter the 6-digit code from your authenticator app to confirm your identity for this organization.",
  "mfaSetup.openAuthenticatorApp": "Open your authenticator app and enter the code for this account",
  "mfaSetup.verificationComplete": "Verification Complete",
  "mfaSetup.tenantVerificationCompleteMessage": "Your identity has been verified for this organization."
}
```

**Arabic:**
```json
{
  "mfaSetup.verifyIdentity": "تحقق من هويتك",
  "mfaSetup.tenantVerifyDescription": "أدخل الرمز المكون من 6 أرقام من تطبيق المصادقة لتأكيد هويتك لهذه المنظمة.",
  "mfaSetup.openAuthenticatorApp": "افتح تطبيق المصادقة وأدخل الرمز لهذا الحساب",
  "mfaSetup.verificationComplete": "اكتمل التحقق",
  "mfaSetup.tenantVerificationCompleteMessage": "تم التحقق من هويتك لهذه المنظمة."
}
```

## Testing Checklist

1. **New user with no MFA**: Should see full QR code enrollment flow
2. **User with MFA, same tenant**: Should access dashboard directly (already verified)
3. **User with MFA, new tenant**: Should see simplified verification (just OTP input)
4. **Wrong OTP code**: Should show error, allow retry
5. **Successful verification**: Should mark tenant MFA as verified and redirect to dashboard
