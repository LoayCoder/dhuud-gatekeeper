import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useTheme } from '@/contexts/ThemeContext';
import { usePasswordBreachCheck } from '@/hooks/use-password-breach-check';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import industrialImage from '@/assets/industrial-safety.jpg';
import { z } from 'zod';

export default function Signup() {
  const { t } = useTranslation();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [breachWarning, setBreachWarning] = useState<string | null>(null);
  const navigate = useNavigate();
  const { tenantName, logoUrl, invitationEmail, invitationCode, isCodeValidated, clearInvitationData } = useTheme();
  const { checkPassword, isChecking } = usePasswordBreachCheck();

  const signupSchema = z.object({
    email: z.string().email(t('auth.invalidEmail')),
    password: z.string().min(8, t('auth.passwordMinLength')),
    confirmPassword: z.string(),
  }).refine((data) => data.password === data.confirmPassword, {
    message: t('auth.passwordsDoNotMatch'),
    path: ['confirmPassword'],
  });

  useEffect(() => {
    // Redirect to invite if code not validated
    if (!isCodeValidated || !invitationEmail || !invitationCode) {
      navigate('/invite');
      return;
    }

    // Check if already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate('/');
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        navigate('/');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, isCodeValidated, invitationEmail, invitationCode]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!invitationEmail || !invitationCode) {
      toast({
        title: t('auth.error'),
        description: t('signup.invalidInvitationData'),
        variant: 'destructive',
      });
      navigate('/invite');
      return;
    }

    try {
      signupSchema.parse({ email: invitationEmail, password, confirmPassword });
      setLoading(true);
      setBreachWarning(null);

      // Check for breached password
      const breachResult = await checkPassword(password);
      if (breachResult.isBreached) {
        const breachMessage = t('security.passwordBreached').replace('{{count}}', breachResult.count.toLocaleString());
        setBreachWarning(breachMessage);
        setLoading(false);
        return;
      }

      // 1. Get Tenant ID from Invitation using secure function
      const { data: inviteResult, error: inviteFetchError } = await supabase
        .rpc('lookup_invitation', { lookup_code: invitationCode });

      if (inviteFetchError || !inviteResult) {
        throw new Error("Invalid or expired invitation code.");
      }

      const inviteData = inviteResult as { email: string; tenant_id: string; role: string };

      // 2. Sign up user
      const redirectUrl = `${window.location.origin}/`;
      const { data: authData, error: signupError } = await supabase.auth.signUp({
        email: invitationEmail,
        password,
        options: { emailRedirectTo: redirectUrl },
      });

      if (signupError) throw signupError;

      if (authData.user) {
        // 3. CRITICAL: Create the Profile Link (roles are in user_roles table, not profiles)
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: authData.user.id,
            tenant_id: inviteData.tenant_id,
          });

        if (profileError) {
          console.error('Profile creation failed:', profileError);
          throw new Error('Failed to create user profile. Please try again.');
        }

        // 4. Mark invitation as used
        await supabase
          .from('invitations')
          .update({ used: true })
          .eq('code', invitationCode);
          
        // 5. Clear local storage
        clearInvitationData();

        toast({
          title: t('signup.accountCreated'),
          description: t('signup.setupMfaMessage'),
        });

        // Auto-login the user and redirect to MFA setup
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: invitationEmail,
          password,
        });

        if (signInError) {
          // If auto-login fails, redirect to login
          navigate('/login');
        } else {
          // Redirect to mandatory MFA setup
          navigate('/mfa-setup');
        }
      }
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast({
          title: t('auth.validationError'),
          description: err.errors[0].message,
          variant: 'destructive',
        });
      } else {
        toast({
          title: t('auth.error'),
          description: err instanceof Error ? err.message : t('signup.failedToCreateAccount'),
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
      <div className="relative hidden w-1/2 lg:block">
        <img
          src={industrialImage}
          alt="Industrial Safety"
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-black/40" />
        <div className="absolute bottom-8 left-8 right-8 text-white">
          <h1 className="mb-2 text-4xl font-bold">{t('branding.title')}</h1>
          <p className="text-lg text-white/90">
            {t('branding.subtitle')}
          </p>
        </div>
      </div>

      {/* Right Side - Signup Form */}
      <div className="flex w-full items-center justify-center bg-background p-8 lg:w-1/2">
        <div className="w-full max-w-md space-y-8">
          {/* Logo and Header */}
          <div className="text-center">
            {logoUrl ? (
              <img src={logoUrl} alt={tenantName} className="mx-auto mb-4 h-16" />
            ) : (
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <Shield className="h-8 w-8 text-primary" />
              </div>
            )}
            <h2 className="text-3xl font-bold">{tenantName}</h2>
            <p className="mt-2 text-muted-foreground">{t('auth.createYourAccount')}</p>
          </div>

          {/* Signup Form */}
          <form onSubmit={handleSignup} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">{t('auth.email')}</Label>
                <Input
                  id="email"
                  type="email"
                  value={invitationEmail || ''}
                  disabled
                  className="h-12 bg-muted"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">{t('auth.password')}</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder={t('auth.passwordMinLength')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  className="h-12"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">{t('auth.confirmPassword')}</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder={t('auth.confirmPassword')}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={loading}
                  className="h-12"
                />
              </div>

              {breachWarning && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{breachWarning}</AlertDescription>
                </Alert>
              )}
            </div>

            <Button type="submit" className="h-12 w-full text-lg" disabled={loading || isChecking}>
              {isChecking && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
              {loading ? t('auth.creatingAccount') : t('auth.signUp')}
            </Button>

            <div className="text-center">
              <Button
                type="button"
                variant="link"
                onClick={() => {
                  clearInvitationData();
                  navigate('/invite');
                }}
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
    </div>
  );
}
