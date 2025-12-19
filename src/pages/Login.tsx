import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useTheme } from '@/contexts/ThemeContext';
import { useTheme as useNextTheme } from 'next-themes';
import { usePasswordBreachCheck } from '@/hooks/use-password-breach-check';
import { useTrustedDevice } from '@/hooks/use-trusted-device';
import { getDeviceFingerprint } from '@/hooks/use-device-fingerprint';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Shield, AlertTriangle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { AuthHeroImage } from '@/components/ui/optimized-image';
import { z } from 'zod';
import { logUserActivity, startSessionTracking } from '@/lib/activity-logger';
import { MFAVerificationDialog } from '@/components/auth/MFAVerificationDialog';
import { DHUUD_LOGO_LIGHT, DHUUD_LOGO_DARK, DHUUD_TENANT_NAME } from '@/constants/branding';

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
  const { tenantName, activeLogoUrl, activePrimaryColor, isCodeValidated, invitationEmail, clearInvitationData, refreshTenantData } = useTheme();
  const { resolvedTheme } = useNextTheme();
  const { checkPassword } = usePasswordBreachCheck();
  const { checkTrustedDevice } = useTrustedDevice();

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
          navigate('/');
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
      navigate('/');
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
      console.error('Failed to detect suspicious login:', error);
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

    // Clear invitation data
    clearInvitationData();

    toast({
      title: t('auth.welcomeBack'),
      description: t('auth.loginSuccess'),
    });

    // Check for breached password after successful login (non-blocking)
    checkPasswordBreach(passwordRef.current);
    passwordRef.current = '';

    navigate('/');
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
            navigate('/');
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

  return (
    <div className="flex min-h-screen">
      {/* Left Side - Industrial Image */}
      <AuthHeroImage title={t('branding.title')} subtitle={t('branding.subtitle')} />

      {/* Right Side - Login Form */}
      <div className="flex w-full items-center justify-center bg-background p-8 lg:w-1/2">
        <div className="w-full max-w-md space-y-8">
          {/* Logo and Header */}
          <div className="text-center">
            <img 
              src={displayLogo} 
              alt={displayName} 
              className="mx-auto mb-4 h-16 object-contain"
              onError={(e) => {
                e.currentTarget.src = fallbackLogo;
              }}
            />
            <h2 className="text-3xl font-bold">{displayName}</h2>
            <p className="mt-2 text-muted-foreground">{t('auth.signInToAccount')}</p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">{t('auth.email')}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder={t('auth.emailPlaceholder')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  className="h-12"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">{t('auth.password')}</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder={t('auth.passwordPlaceholder')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  className="h-12"
                />
              </div>
            </div>

            <Button type="submit" className="h-12 w-full text-lg" disabled={loading}>
              {loading ? t('auth.signingIn') : t('auth.signIn')}
            </Button>

            <div className="flex flex-col items-center gap-2">
              <Button
                type="button"
                variant="link"
                onClick={() => navigate('/forgot-password')}
                className="text-sm"
              >
                {t('auth.forgotPassword')}
              </Button>
              <Button
                type="button"
                variant="link"
                onClick={() => navigate('/invite')}
                className="text-sm"
              >
                {t('auth.backToInvite')}
              </Button>
            </div>
          </form>

          {/* Footer */}
          <div className="mt-8 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Shield className="h-4 w-4" />
            <span>{t('security.protectedByZeroTrust')}</span>
          </div>
        </div>
      </div>

      {/* MFA Verification Dialog */}
      {mfaFactorId && (
        <MFAVerificationDialog
          open={showMFADialog}
          onOpenChange={setShowMFADialog}
          factorId={mfaFactorId}
          onSuccess={handleMFASuccess}
          onCancel={handleMFACancel}
          userId={currentUserId || undefined}
        />
      )}
    </div>
  );
}
