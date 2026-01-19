import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
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
  const { tenantName, activeLogoUrl, activePrimaryColor, isCodeValidated, invitationEmail, clearInvitationData, refreshTenantData } = useTheme();
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

    // Check if already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        // Check MFA status
        checkMFAAndNavigate();
      }
    });

    // Listen for auth changes - but don't auto-navigate if MFA is pending
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session && !showMFADialog) {
        checkMFAAndNavigate();
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, invitationEmail, showMFADialog]);

  const checkMFAAndNavigate = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    
    if (aal?.currentLevel === 'aal1' && aal?.nextLevel === 'aal2') {
      // User needs to complete MFA - but check if device is trusted first
      if (user) {
        const isTrusted = await checkTrustedDevice(user.id);
        if (isTrusted) {
          // Device is trusted, skip MFA
          navigate(returnTo);
          return;
        }
      }
      
      // Device not trusted, show MFA dialog
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const totpFactor = factors?.totp?.find(f => f.status === 'verified');
      
      if (totpFactor) {
        setCurrentUserId(user?.id || null);
        setMfaFactorId(totpFactor.id);
        setShowMFADialog(true);
        return;
      }
    }
    
    // No MFA required or already at AAL2
    if (aal?.currentLevel === 'aal2' || aal?.nextLevel !== 'aal2') {
      navigate(returnTo);
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

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // SECURITY: Validate user access immediately after auth succeeds
      const { data: accessValidation, error: accessError } = await supabase.functions.invoke('validate-user-access');
      
      if (accessError || !accessValidation?.allowed) {
        // User is deleted, inactive, or has no profile - sign out immediately
        console.warn('User access validation failed:', accessValidation?.reason || accessError?.message);
        await supabase.auth.signOut();
        
        // Show appropriate error message based on reason
        const reason = accessValidation?.reason;
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

      // Check if MFA is required
      const { data: { user } } = await supabase.auth.getUser();
      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      
      if (aal?.currentLevel === 'aal1' && aal?.nextLevel === 'aal2') {
        // User has 2FA enabled - check if device is trusted first
        if (user) {
          const isTrusted = await checkTrustedDevice(user.id);
          if (isTrusted) {
            // Device is trusted, skip MFA and proceed with login
            await refreshTenantData();
            startSessionTracking();
            await logUserActivity({ eventType: 'login' });
            
            // Detect suspicious login (non-blocking)
            detectSuspiciousLogin(user.id, true);
            
            clearInvitationData();
            toast({
              title: t('auth.welcomeBack'),
              description: t('auth.loginSuccess'),
            });
            checkPasswordBreach(password);
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

      // No MFA required - proceed with login
      await refreshTenantData();
      startSessionTracking();
      await logUserActivity({ eventType: 'login' });
      
      // Detect suspicious login (non-blocking)
      const { data: { user: loggedInUser } } = await supabase.auth.getUser();
      detectSuspiciousLogin(loggedInUser?.id, true);
      
      // Verify device for invitation bypass on future logins
      if (loggedInUser) {
        // MULTI-TENANT: Use user_id to fetch profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('tenant_id')
          .eq('user_id', loggedInUser.id)
          .eq('is_deleted', false)
          .eq('is_active', true)
          .single();
        
        if (profile?.tenant_id) {
          verifyDevice(loggedInUser.id, profile.tenant_id);
        }
      }
      
      clearInvitationData();

      toast({
        title: t('auth.welcomeBack'),
        description: t('auth.loginSuccess'),
      });

      // Check for breached password after successful login (non-blocking)
      checkPasswordBreach(password);
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
    <div className="flex h-screen flex-col overflow-hidden bg-gradient-to-br from-background via-background to-muted/30">
      {/* Header - compact and shrink-0 */}
      <header className="flex shrink-0 items-center justify-between px-4 py-2 sm:px-6 sm:py-3">
        <div className="flex items-center gap-3">
          <img 
            src={displayLogo} 
            alt={displayName} 
            className="h-7 object-contain sm:h-8"
            onError={(e) => {
              e.currentTarget.src = fallbackLogo;
            }}
          />
        </div>
        <HeaderControls />
      </header>

      {/* Main Content - flex-1 with overflow handling */}
      <main className="flex min-h-0 flex-1 items-center justify-center overflow-auto px-4 py-2">
        <Card className="w-full max-w-sm border-border/50 bg-card/80 shadow-lg backdrop-blur-sm sm:max-w-md">
          <CardHeader className="space-y-2 pb-4 text-center">
            <h1 className="text-lg font-semibold tracking-tight sm:text-xl">{displayName}</h1>
            <p className="text-xs text-muted-foreground sm:text-sm">{t('auth.signInToAccount')}</p>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Login Form */}
            <form onSubmit={handleLogin} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-sm font-medium">
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
                  className="h-10"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-sm font-medium">
                    {t('auth.password')}
                  </Label>
                  <Link 
                    to="/forgot-password" 
                    className="text-xs text-primary hover:text-primary/80 hover:underline"
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
                  className="h-10"
                />
              </div>

              <Button 
                type="submit" 
                className="h-10 w-full font-medium" 
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
              <>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border/50" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">
                      {t('auth.or')}
                    </span>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 w-full"
                  disabled={loading || biometricLoading}
                  onClick={handleBiometricLogin}
                >
                  {biometricLoading ? (
                    <Loader2 className="me-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Fingerprint className="me-2 h-4 w-4" />
                  )}
                  {t('auth.signInWithBiometric')}
                </Button>
              </>
            )}

            {/* Invite Code Link */}
            <div className="rounded-lg border border-dashed border-border/50 bg-muted/30 p-3 text-center">
              <p className="text-xs text-muted-foreground sm:text-sm">
                {t('invite.haveInviteCode', 'Have an invitation code?')}
              </p>
              <Button
                type="button"
                variant="link"
                onClick={() => navigate('/invite?newCode=true')}
                className="h-auto p-0 text-xs font-medium text-primary sm:text-sm"
              >
                {t('invite.enterCodeHere', 'Enter your code here')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Footer - compact and shrink-0 */}
      <footer className="flex shrink-0 flex-col items-center gap-2 px-4 py-3 text-center sm:gap-3 sm:py-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground sm:text-sm">
          <Shield className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          <span>{t('security.protectedByZeroTrust')}</span>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-muted-foreground sm:gap-4">
          <Link to="/terms" className="hover:text-foreground hover:underline">
            {t('legal.termsOfService')}
          </Link>
          <span>•</span>
          <Link to="/privacy" className="hover:text-foreground hover:underline">
            {t('legal.privacyPolicy')}
          </Link>
          <span>•</span>
          <Link to="/cookies" className="hover:text-foreground hover:underline">
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
