import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session, AuthError } from '@supabase/supabase-js';
import { useTheme } from '@/contexts/ThemeContext';
import { useTheme as useNextTheme } from 'next-themes';
import { usePasswordBreachCheck } from '@/hooks/use-password-breach-check';
import { useTrustedDevice } from '@/hooks/use-trusted-device';
import { useVerifiedDevice } from '@/hooks/use-verified-device';
import { getDeviceFingerprint } from '@/hooks/use-device-fingerprint';
import { useWebAuthn } from '@/hooks/use-webauthn';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Shield, Fingerprint, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { z } from 'zod';
import { logUserActivity, startSessionTracking } from '@/lib/activity-logger';
import { MFAVerificationDialog } from '@/components/auth/MFAVerificationDialog';
import { DHUUD_LOGO_LIGHT, DHUUD_LOGO_DARK, DHUUD_TENANT_NAME } from '@/constants/branding';
import { logger } from '@/lib/logger';
import { HeaderControls } from '@/components/home/HeaderControls';

export default function Login() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showMFADialog, setShowMFADialog] = useState(false);
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const passwordRef = useRef<string>('');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get('returnTo') || '/';
  const { tenantName, activeLogoUrl, activePrimaryColor, isCodeValidated, invitationEmail, clearInvitationData, refreshTenantData, isRememberedTenant, clearRememberedTenant } = useTheme();
  const { resolvedTheme } = useNextTheme();
  const { checkPassword } = usePasswordBreachCheck();
  const { checkTrustedDevice } = useTrustedDevice();
  const { verifyDevice } = useVerifiedDevice();
  const { isSupported: isBiometricSupported, authenticateDiscoverable: biometricAuthDiscoverable } = useWebAuthn();
  const [biometricLoading, setBiometricLoading] = useState(false);

  // Determine the logo to display with fallback
  const fallbackLogo = resolvedTheme === 'dark' ? DHUUD_LOGO_DARK : DHUUD_LOGO_LIGHT;
  const displayLogo = activeLogoUrl || fallbackLogo;
  const displayName = tenantName || DHUUD_TENANT_NAME;

  const loginSchema = z.object({
    email: z.string().email(t('auth.invalidEmail')),
    password: z.string().min(1, t('auth.passwordRequired')),
  });

  useEffect(() => {
    // Pre-fill email if coming from invitation
    if (invitationEmail) {
      setEmail(invitationEmail);
    }

    // Check if already logged in - but VALIDATE the session first
    const checkExistingSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // CRITICAL: Validate the session is actually valid server-side before MFA check
        // This prevents "missing sub claim" errors from stale local sessions
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error || !user) {
          // Session is stale/invalid - clear it silently and stay on login page
          logger.debug('Stale session detected, clearing...');
          await supabase.auth.signOut({ scope: 'local' });
          return;
        }
        // Session is valid, check MFA status
        checkMFAAndNavigate();
      }
    };

    checkExistingSession();

    // Listen for auth changes - but don't auto-navigate if MFA is pending
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session && !showMFADialog) {
        // Validate session before MFA check
        const { data: { user }, error } = await supabase.auth.getUser();
        if (!error && user) {
          checkMFAAndNavigate();
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, invitationEmail, showMFADialog]);

  const checkMFAAndNavigate = async () => {
    try {
      // CRITICAL: Validate session is still valid before any MFA operations
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        // Session is invalid - clear and stay on login page
        logger.debug('Invalid session in checkMFAAndNavigate, clearing...');
        await supabase.auth.signOut({ scope: 'local' });
        return;
      }

      const { data: aal, error: aalError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

      if (aalError) {
        // MFA check failed - likely invalid session
        logger.warn('AAL check failed:', aalError.message);
        await supabase.auth.signOut({ scope: 'local' });
        return;
      }

      if (aal?.currentLevel === 'aal1' && aal?.nextLevel === 'aal2') {
        // User needs to complete MFA - but check if device is trusted first
        const isTrusted = await checkTrustedDevice(user.id);
        if (isTrusted) {
          // Device is trusted, skip MFA
          navigate(returnTo);
          return;
        }

        // Device not trusted, show MFA dialog
        const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();

        if (factorsError) {
          logger.warn('Failed to list MFA factors:', factorsError.message);
          await supabase.auth.signOut({ scope: 'local' });
          return;
        }

        const totpFactor = factors?.totp?.find(f => f.status === 'verified');

        if (totpFactor) {
          setCurrentUserId(user.id);
          setMfaFactorId(totpFactor.id);
          setShowMFADialog(true);
          return;
        }
      }

      // No MFA required or already at AAL2
      if (aal?.currentLevel === 'aal2' || aal?.nextLevel !== 'aal2') {
        navigate(returnTo);
      }
    } catch (err) {
      logger.error('Error in checkMFAAndNavigate:', err);
      // Clear session on any error to prevent stuck state
      await supabase.auth.signOut({ scope: 'local' });
    }
  };

  const checkPasswordBreach = async (pwd: string) => {
    const breachResult = await checkPassword(pwd);
    if (breachResult.isBreached) {
      const breachMessage = t('security.passwordBreachedWarning').replace('{{count}}', breachResult.count.toLocaleString());
      toast({
        title: t('security.passwordCompromised'),
        description: breachMessage,
        variant: 'destructive',
        duration: 10000,
      });
    }
  };

  // Detect suspicious login and log to security system
  const detectSuspiciousLogin = async (userId: string | undefined, success: boolean, failureReason?: string) => {
    try {
      const deviceInfo = getDeviceFingerprint();

      const response = await supabase.functions.invoke('detect-suspicious-login', {
        body: {
          user_id: userId,
          email,
          success,
          device_fingerprint: deviceInfo.fingerprint,
          user_agent: deviceInfo.userAgent,
          platform: deviceInfo.platform,
          browser: deviceInfo.browser,
          failure_reason: failureReason,
        },
      });

      if (response.data?.is_suspicious && success) {
        // Show warning toast for suspicious successful login
        toast({
          title: t('security.suspiciousLoginDetected', 'Suspicious Login Detected'),
          description: t('security.suspiciousLoginDescription', 'This login was flagged as unusual. If this wasn\'t you, please change your password immediately.'),
          variant: 'destructive',
          duration: 10000,
        });
      } else if (response.data?.is_new_device && success) {
        // Informational toast for new device
        toast({
          title: t('security.newDeviceDetected', 'New Device Detected'),
          description: t('security.newDeviceDescription', 'You\'re logging in from a new device.'),
        });
      }

      return response.data;
    } catch (error) {
      logger.error('Failed to detect suspicious login:', error);
      return null;
    }
  };

  const handleMFASuccess = async () => {
    setShowMFADialog(false);

    // Fetch tenant branding after successful MFA
    await refreshTenantData();

    // Start session tracking and log login event
    startSessionTracking();
    await logUserActivity({ eventType: 'login' });

    // Verify device for invitation bypass on future logins
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      // MULTI-TENANT: Use user_id to fetch profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('user_id', user.id)
        .eq('is_deleted', false)
        .eq('is_active', true)
        .single();

      if (profile?.tenant_id) {
        verifyDevice(user.id, profile.tenant_id);
      }
    }

    // Clear invitation data
    clearInvitationData();

    toast({
      title: t('auth.welcomeBack'),
      description: t('auth.loginSuccess'),
    });

    // Check for breached password after successful login (non-blocking)
    checkPasswordBreach(passwordRef.current);
    passwordRef.current = '';

    navigate(returnTo);
  };

  const handleMFACancel = () => {
    setShowMFADialog(false);
    setMfaFactorId(null);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Validate input
      loginSchema.parse({ email, password });

      setLoading(true);
      passwordRef.current = password;

      // Create a timeout for the initial sign in
      const signInTimeoutPromise = new Promise<{ data: { user: User | null; session: Session | null }; error: AuthError | null }>((_, reject) => {
        setTimeout(() => reject(new Error('Sign in request timed out')), 10000);
      });

      const signInPromise = supabase.auth.signInWithPassword({
        email,
        password,
      });

      const { data: { user: signInUser, session }, error } = await Promise.race([
        signInPromise,
        signInTimeoutPromise
      ]);

      if (error) throw error;

      // PARALLEL GROUP A: Run access validation, getUser, and AAL check concurrently
      // These are all needed before we can make MFA/routing decisions
      let accessValidation: { allowed?: boolean; reason?: string; user_id?: string; tenant_id?: string } | null = null;
      let accessError: Error | null = null;

      const accessValidationPromise = supabase.functions.invoke('validate-user-access')
        .then(result => {
          accessValidation = result.data;
          accessError = result.error;
        })
        .catch((networkErr) => {
          logger.warn('validate-user-access edge function network error (allowing login):', networkErr);
          accessValidation = { allowed: true };
        });

      // Create a timeout promise
      const authChecksTimeoutPromise = new Promise<{ timeout: true }>((resolve) => {
        setTimeout(() => resolve({ timeout: true }), 8000);
      });

      const authChecksPromise = Promise.all([
        accessValidationPromise,
        supabase.auth.getUser(),
        supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
      ]).then((results) => ({ timeout: false, results }));

      // Race against the clock
      const raceResult = await Promise.race([authChecksPromise, authChecksTimeoutPromise]);

      let authUser = signInUser;
      let aal = null;

      if (raceResult.timeout) {
        logger.warn('Auth checks timed out - proceeding with initial signin user');
        // We stick with signInUser and default AAL (null)
        // We also assume access allowed if validation timed out
        if (!accessValidation) accessValidation = { allowed: true };
      } else {
        // Success
        type AuthChecksTuple = [
          { allowed?: boolean; reason?: string; user_id?: string; tenant_id?: string } | null,
          { data: { user: User | null }, error: AuthError | null },
          { data: unknown, error: AuthError | null }
        ];
        const { results } = raceResult as unknown as { timeout: false, results: AuthChecksTuple };
        const [, { data: { user: fetchedUser } }, { data: fetchedAal }] = results;
        if (fetchedUser) authUser = fetchedUser;
        aal = fetchedAal;
      }


      // Only block if we got a definitive "not allowed" response
      if (accessValidation && accessValidation.allowed === false) {
        console.warn('User access validation failed:', accessValidation.reason || accessError?.message);
        await supabase.auth.signOut();

        const reason = accessValidation.reason;
        let errorTitle = t('auth.error');
        let errorDesc = t('auth.accessDenied', 'Access denied');

        if (reason === 'user_deleted') {
          errorTitle = t('auth.accountDeleted', 'Account Deactivated');
          errorDesc = t('auth.accountDeletedDesc', 'Your account has been deactivated. Please contact your administrator.');
        } else if (reason === 'user_inactive') {
          errorTitle = t('auth.accountInactive', 'Account Inactive');
          errorDesc = t('auth.accountInactiveDesc', 'Your account is currently inactive. Please contact your administrator.');
        } else if (reason === 'profile_not_found') {
          errorTitle = t('auth.noProfile', 'No Access');
          errorDesc = t('auth.noProfileDesc', 'You do not have access to this organization.');
        }

        toast({
          title: errorTitle,
          description: errorDesc,
          variant: 'destructive',
          duration: 10000,
        });

        setLoading(false);
        return;
      }

      if (accessError) {
        logger.warn('validate-user-access edge function error (proceeding with login):', accessError.message);
      }

      // Check if there's a pending MFA reset (for reactivated users)
      const pendingMfaReset = sessionStorage.getItem('pending_mfa_reset');
      if (pendingMfaReset) {
        try {
          const resetData = JSON.parse(pendingMfaReset);
          logger.debug('Pending MFA reset detected for reactivated user:', resetData);

          // Call the reset-user-mfa edge function to clear any old MFA data
          const { error: resetError } = await supabase.functions.invoke('reset-user-mfa', {
            body: {
              user_id: accessValidation.user_id || resetData.user_id,
              tenant_id: accessValidation.tenant_id || resetData.tenant_id,
              reason: resetData.reason || 'user_reactivation'
            }
          });

          if (resetError) {
            logger.warn('MFA reset for reactivated user failed (non-blocking):', resetError);
          } else {
            logger.debug('MFA reset successful for reactivated user');
          }

          // Clear the pending reset flag
          sessionStorage.removeItem('pending_mfa_reset');
        } catch (parseError) {
          console.error('Failed to parse pending MFA reset data:', parseError);
          sessionStorage.removeItem('pending_mfa_reset');
        }
      }

      // Check if MFA is required (user and aal already fetched in Group A)
      const user = authUser;

      if (aal?.currentLevel === 'aal1' && aal?.nextLevel === 'aal2') {
        // User has 2FA enabled - check if device is trusted first
        if (user) {
          const isTrusted = await checkTrustedDevice(user.id);
          if (isTrusted) {
            // Device is trusted, skip MFA - PARALLEL GROUP B
            await Promise.all([
              refreshTenantData(),
              logUserActivity({ eventType: 'login' }),
            ]);
            startSessionTracking();

            // Non-blocking fire-and-forget
            detectSuspiciousLogin(user.id, true);
            checkPasswordBreach(password);

            clearInvitationData();
            toast({
              title: t('auth.welcomeBack'),
              description: t('auth.loginSuccess'),
            });
            navigate(returnTo);
            return;
          }
        }

        // Device not trusted - show verification dialog
        const { data: factors } = await supabase.auth.mfa.listFactors();
        const totpFactor = factors?.totp?.find(f => f.status === 'verified');

        if (totpFactor) {
          setCurrentUserId(user?.id || null);
          setMfaFactorId(totpFactor.id);
          setShowMFADialog(true);
          setLoading(false);
          return;
        }
      }

      // No MFA required - PARALLEL GROUP B: session setup
      await Promise.all([
        refreshTenantData(),
        logUserActivity({ eventType: 'login' }),
      ]);
      startSessionTracking();

      // FIRE-AND-FORGET GROUP C: non-blocking telemetry
      detectSuspiciousLogin(user?.id, true);
      checkPasswordBreach(password);

      // Verify device (non-blocking)
      if (user) {
        supabase
          .from('profiles')
          .select('tenant_id')
          .eq('user_id', user.id)
          .eq('is_deleted', false)
          .eq('is_active', true)
          .single()
          .then(({ data: profile }) => {
            if (profile?.tenant_id) {
              verifyDevice(user.id, profile.tenant_id);
            }
          });
      }

      clearInvitationData();

      toast({
        title: t('auth.welcomeBack'),
        description: t('auth.loginSuccess'),
      });

      // Check for breached password after successful login (non-blocking) - already fired above
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t('auth.failedToLogin');

      // Log failed login attempt (non-blocking)
      if (!(err instanceof z.ZodError)) {
        detectSuspiciousLogin(undefined, false, errorMessage);
      }

      if (err instanceof z.ZodError) {
        toast({
          title: t('auth.validationError'),
          description: err.errors[0].message,
          variant: 'destructive',
        });
      } else {
        toast({
          title: t('auth.error'),
          description: errorMessage,
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricLogin = async () => {
    setBiometricLoading(true);
    try {
      const success = await biometricAuthDiscoverable();
      if (success) {
        toast({
          title: t('auth.welcomeBack'),
          description: t('auth.biometricSuccess'),
        });
        navigate(returnTo);
      }
    } catch (error) {
      toast({
        title: t('auth.error'),
        description: t('auth.biometricFailed'),
        variant: 'destructive',
      });
    } finally {
      setBiometricLoading(false);
    }
  };

  return (
    <div className="relative flex h-screen flex-col overflow-hidden bg-background">
      {/* Premium Background */}
      <div className="mesh-gradient" />

      {/* Header - compact and shrink-0 */}
      <header className="animate-in fade-in z-10 flex shrink-0 items-center justify-between px-4 py-4 sm:px-8 sm:py-6">
        <div className="flex items-center gap-3 transition-transform duration-300 hover:scale-105">
          <img
            src={displayLogo}
            alt={displayName}
            className="h-8 object-contain sm:h-10"
            onError={(e) => {
              e.currentTarget.src = fallbackLogo;
            }}
          />
        </div>
        <HeaderControls />
      </header>

      {/* Main Content - flex-1 with overflow handling */}
      <main className="z-10 flex min-h-0 flex-1 items-center justify-center overflow-auto px-4 py-6">
        <Card className="glass-card animate-in slide-up w-full max-w-[420px] overflow-hidden border-white/20 shadow-2xl">
          <CardHeader className="space-y-3 pb-6 pt-8 text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Shield className="h-6 w-6" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {displayName}
            </h1>
            {isRememberedTenant ? (
              <p className="text-sm text-muted-foreground">
                {t('auth.welcomeBackTo', { org: displayName })}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">{t('auth.signInToAccount')}</p>
            )}
          </CardHeader>

          <CardContent className="space-y-6 pb-8">
            {/* Login Form */}
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-semibold tracking-wide">
                  {t('auth.email')}
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder={t('auth.emailPlaceholder')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  className="premium-input bg-background/50 backdrop-blur-sm"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-sm font-semibold tracking-wide">
                    {t('auth.password')}
                  </Label>
                  <Link
                    to="/forgot-password"
                    className="text-xs font-medium text-primary transition-colors hover:text-primary/70 hover:underline"
                  >
                    {t('auth.forgotPassword')}
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder={t('auth.passwordPlaceholder')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  className="premium-input bg-background/50 backdrop-blur-sm"
                />
              </div>

              <Button
                type="submit"
                className="premium-button hover-scale w-full rounded-xl bg-primary text-primary-foreground"
                disabled={loading || biometricLoading}
              >
                {loading ? (
                  <>
                    <Loader2 className="me-2 h-4 w-4 animate-spin" />
                    {t('auth.signingIn')}
                  </>
                ) : (
                  t('auth.signIn')
                )}
              </Button>
            </form>

            {/* Biometric Login */}
            {isBiometricSupported && (
              <div className="space-y-4">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border/50" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card/0 px-2 text-muted-foreground backdrop-blur-none">
                      {t('auth.or')}
                    </span>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="hover-scale h-11 w-full rounded-xl border-border/50 bg-background/30 font-medium backdrop-blur-sm transition-all hover:bg-background/50"
                  disabled={loading || biometricLoading}
                  onClick={handleBiometricLogin}
                >
                  {biometricLoading ? (
                    <Loader2 className="me-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Fingerprint className="me-2 h-5 w-5 text-primary" />
                  )}
                  {t('auth.signInWithBiometric')}
                </Button>
              </div>
            )}

            {/* Not your organization link - only shown when remembering a tenant */}
            {isRememberedTenant && (
              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={clearRememberedTenant}
                  className="text-xs font-medium text-muted-foreground transition-colors hover:text-primary hover:underline"
                >
                  {t('auth.notYourOrganization')}
                </button>
              </div>
            )}

            {/* Invite Code Link */}
            <div className="mt-4 rounded-xl border border-dashed border-primary/20 bg-primary/5 p-4 text-center transition-colors hover:bg-primary/10">
              <p className="mb-1 text-xs text-muted-foreground">
                {t('invite.haveInviteCode', 'Have an invitation code?')}
              </p>
              <Button
                type="button"
                variant="link"
                onClick={() => navigate('/invite?newCode=true')}
                className="h-auto p-0 text-sm font-bold text-primary"
              >
                {t('invite.enterCodeHere', 'Enter your code here')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Footer - compact and shrink-0 */}
      <footer className="animate-in fade-in z-10 flex shrink-0 flex-col items-center gap-3 px-4 py-6 text-center sm:py-8">
        <div className="flex items-center gap-2 rounded-full bg-primary/5 px-4 py-1.5 text-xs font-medium text-primary sm:text-sm">
          <Shield className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          <span>{t('security.protectedByZeroTrust')}</span>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground sm:gap-6">
          <Link to="/terms" className="transition-colors hover:text-primary hover:underline">
            {t('legal.termsOfService')}
          </Link>
          <span className="opacity-20">•</span>
          <Link to="/privacy" className="transition-colors hover:text-primary hover:underline">
            {t('legal.privacyPolicy')}
          </Link>
          <span className="opacity-20">•</span>
          <Link to="/cookies" className="transition-colors hover:text-primary hover:underline">
            {t('legal.cookiePolicy')}
          </Link>
        </div>
      </footer>

      {/* MFA Verification Dialog */}
      {showMFADialog && mfaFactorId && (
        <MFAVerificationDialog
          open={showMFADialog}
          onOpenChange={setShowMFADialog}
          factorId={mfaFactorId}
          userId={currentUserId}
          onSuccess={handleMFASuccess}
          onCancel={handleMFACancel}
        />
      )}
    </div>
  );
}
