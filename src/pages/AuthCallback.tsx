import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useTheme } from '@/contexts/ThemeContext';
import { useTrustedDevice } from '@/hooks/use-trusted-device';
import { getDeviceFingerprint } from '@/hooks/use-device-fingerprint';
import { logUserActivity, startSessionTracking } from '@/lib/activity-logger';
import { toast } from '@/hooks/use-toast';
import { PageLoader } from '@/components/ui/page-loader';
import { Shield, AlertTriangle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MFAVerificationDialog } from '@/components/auth/MFAVerificationDialog';

type CallbackState = 'loading' | 'invitation_required' | 'account_inactive' | 'error' | 'mfa_required';

export default function AuthCallback() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get('returnTo') || '/';
  const { refreshTenantData } = useTheme();
  const { checkTrustedDevice } = useTrustedDevice();
  
  const [state, setState] = useState<CallbackState>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [showMFADialog, setShowMFADialog] = useState(false);
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    handleOAuthCallback();
  }, []);

  const detectSuspiciousLogin = async (userId: string | undefined, success: boolean, failureReason?: string) => {
    try {
      const deviceInfo = getDeviceFingerprint();
      
      const { data: { user } } = await supabase.auth.getUser();
      
      const response = await supabase.functions.invoke('detect-suspicious-login', {
        body: {
          user_id: userId,
          email: user?.email,
          success,
          device_fingerprint: deviceInfo.fingerprint,
          user_agent: deviceInfo.userAgent,
          platform: deviceInfo.platform,
          browser: deviceInfo.browser,
          failure_reason: failureReason,
        },
      });

      if (response.data?.is_suspicious && success) {
        toast({
          title: t('security.suspiciousLoginDetected', 'Suspicious Login Detected'),
          description: t('security.suspiciousLoginDescription', 'This login was flagged as unusual.'),
          variant: 'destructive',
          duration: 10000,
        });
      } else if (response.data?.is_new_device && success) {
        toast({
          title: t('security.newDeviceDetected', 'New Device Detected'),
          description: t('security.newDeviceDescription', 'You\'re logging in from a new device.'),
        });
      }
    } catch (error) {
      console.error('Failed to detect suspicious login:', error);
    }
  };

  const handleOAuthCallback = async () => {
    try {
      // Get the session from the OAuth callback
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        throw sessionError;
      }

      if (!session) {
        // No session means the OAuth flow was cancelled or failed
        navigate('/login');
        return;
      }

      // Validate user access via edge function
      const { data: accessValidation, error: accessError } = await supabase.functions.invoke('validate-user-access');
      
      if (accessError || !accessValidation?.allowed) {
        console.warn('User access validation failed:', accessValidation?.reason || accessError?.message);
        await supabase.auth.signOut();
        
        const reason = accessValidation?.reason;
        
        if (reason === 'profile_not_found') {
          setState('invitation_required');
          return;
        } else if (reason === 'user_deleted') {
          setState('account_inactive');
          setErrorMessage(t('auth.accountDeletedDesc', 'Your account has been deactivated.'));
          return;
        } else if (reason === 'user_inactive') {
          setState('account_inactive');
          setErrorMessage(t('auth.accountInactiveDesc', 'Your account is currently inactive.'));
          return;
        }
        
        setState('error');
        setErrorMessage(t('auth.accessDenied', 'Access denied'));
        return;
      }

      // Check MFA status
      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      
      if (aal?.currentLevel === 'aal1' && aal?.nextLevel === 'aal2') {
        // User has MFA enabled, check if device is trusted
        const isTrusted = await checkTrustedDevice(session.user.id);
        
        if (!isTrusted) {
          // Check if user has a verified TOTP factor
          const { data: factors } = await supabase.auth.mfa.listFactors();
          const totpFactor = factors?.totp?.find(f => f.status === 'verified');
          
          if (totpFactor) {
            setCurrentUserId(session.user.id);
            setMfaFactorId(totpFactor.id);
            setShowMFADialog(true);
            setState('mfa_required');
            return;
          }
        }
      } else if (aal?.nextLevel === 'aal2' && aal?.currentLevel !== 'aal2') {
        // User needs to set up MFA
        await refreshTenantData();
        navigate('/mfa-setup');
        return;
      }

      // Proceed with successful login
      await completeLogin(session.user.id);
      
    } catch (err) {
      console.error('OAuth callback error:', err);
      setState('error');
      setErrorMessage(err instanceof Error ? err.message : t('auth.oauthError', 'Authentication failed'));
    }
  };

  const completeLogin = async (userId: string) => {
    // Fetch tenant branding
    await refreshTenantData();
    
    // Start session tracking and log login
    startSessionTracking();
    await logUserActivity({ eventType: 'login' });
    
    // Detect suspicious login (non-blocking)
    detectSuspiciousLogin(userId, true);

    toast({
      title: t('auth.welcomeBack'),
      description: t('auth.loginSuccess'),
    });

    navigate(returnTo);
  };

  const handleMFASuccess = async () => {
    setShowMFADialog(false);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await completeLogin(user.id);
    }
  };

  const handleMFACancel = async () => {
    setShowMFADialog(false);
    await supabase.auth.signOut();
    navigate('/login');
  };

  const handleBackToLogin = () => {
    navigate('/login');
  };

  const handleGoToInvite = () => {
    navigate('/invite');
  };

  if (state === 'loading') {
    return <PageLoader />;
  }

  if (state === 'mfa_required') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
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

  if (state === 'invitation_required') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-warning/10">
              <AlertTriangle className="h-8 w-8 text-warning" />
            </div>
            <CardTitle>{t('auth.invitationRequired', 'Invitation Required')}</CardTitle>
            <CardDescription>
              {t('auth.invitationRequiredDesc', 'You need an invitation to access this platform. Please contact your administrator for an invitation code.')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button className="w-full" onClick={handleGoToInvite}>
              {t('auth.enterInvitationCode', 'Enter Invitation Code')}
            </Button>
            <Button variant="outline" className="w-full" onClick={handleBackToLogin}>
              <ArrowLeft className="h-4 w-4 me-2" />
              {t('auth.backToLogin', 'Back to Login')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (state === 'account_inactive' || state === 'error') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
              <Shield className="h-8 w-8 text-destructive" />
            </div>
            <CardTitle>
              {state === 'account_inactive' 
                ? t('auth.accountInactive', 'Account Inactive')
                : t('auth.oauthError', 'Authentication Error')
              }
            </CardTitle>
            <CardDescription>
              {errorMessage || t('auth.oauthErrorDesc', 'There was a problem signing in. Please try again.')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full" onClick={handleBackToLogin}>
              <ArrowLeft className="h-4 w-4 me-2" />
              {t('auth.backToLogin', 'Back to Login')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <PageLoader />;
}
