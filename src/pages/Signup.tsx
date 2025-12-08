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
import { AuthHeroImage } from '@/components/ui/optimized-image';
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

      // 1. Get Tenant ID and metadata from Invitation using secure function
      const { data: inviteResult, error: inviteFetchError } = await supabase
        .rpc('lookup_invitation', { lookup_code: invitationCode });

      if (inviteFetchError || !inviteResult) {
        throw new Error("Invalid or expired invitation code.");
      }

      interface InviteMetadata {
        full_name?: string;
        phone_number?: string;
        user_type?: string;
        has_login?: boolean;
        is_active?: boolean;
        employee_id?: string;
        job_title?: string;
        contractor_company_name?: string;
        contractor_type?: string;
        contract_start?: string;
        contract_end?: string;
        membership_id?: string;
        membership_start?: string;
        membership_end?: string;
        has_full_branch_access?: boolean;
        assigned_branch_id?: string;
        assigned_division_id?: string;
        assigned_department_id?: string;
        assigned_section_id?: string;
        role_ids?: string[];
      }
      
      const inviteData = inviteResult as unknown as { 
        email: string; 
        tenant_id: string; 
        role: string;
        metadata?: InviteMetadata;
      };
      const metadata = inviteData.metadata || {};

      // 2. Sign up user
      const redirectUrl = `${window.location.origin}/`;
      const { data: authData, error: signupError } = await supabase.auth.signUp({
        email: invitationEmail,
        password,
        options: { emailRedirectTo: redirectUrl },
      });

      if (signupError) throw signupError;

      if (authData.user) {
        // 3. Create the Profile with pre-filled metadata from invitation
        const profileData = {
          id: authData.user.id,
          tenant_id: inviteData.tenant_id,
          has_login: true,
          is_active: true,
          full_name: metadata.full_name || null,
          phone_number: metadata.phone_number || null,
          user_type: metadata.user_type as 'employee' | 'contractor_longterm' | 'contractor_shortterm' | 'member' | 'visitor' | null || null,
          employee_id: metadata.employee_id || null,
          job_title: metadata.job_title || null,
          contractor_company_name: metadata.contractor_company_name || null,
          contractor_type: (metadata.contractor_type as 'long_term' | 'short_term') || null,
          contract_start: metadata.contract_start || null,
          contract_end: metadata.contract_end || null,
          membership_id: metadata.membership_id || null,
          membership_start: metadata.membership_start || null,
          membership_end: metadata.membership_end || null,
          has_full_branch_access: metadata.has_full_branch_access ?? false,
          assigned_branch_id: metadata.assigned_branch_id || null,
          assigned_division_id: metadata.assigned_division_id || null,
          assigned_department_id: metadata.assigned_department_id || null,
          assigned_section_id: metadata.assigned_section_id || null,
        };

        const { error: profileError } = await supabase
          .from('profiles')
          .insert([profileData]);

        if (profileError) {
          console.error('Profile creation failed:', profileError);
          throw new Error('Failed to create user profile. Please try again.');
        }
        
        // 4. Assign roles if present in metadata
        if (metadata.role_ids && metadata.role_ids.length > 0) {
          const roleAssignments = metadata.role_ids.map((roleId: string) => ({
            user_id: authData.user!.id,
            role_id: roleId,
            tenant_id: inviteData.tenant_id,
          }));
          
          await supabase.from('user_role_assignments').insert(roleAssignments);
        }

        // 5. Mark invitation as used
        await supabase
          .from('invitations')
          .update({ used: true })
          .eq('code', invitationCode);
          
        // 6. Clear local storage
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
      <AuthHeroImage title={t('branding.title')} subtitle={t('branding.subtitle')} />

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
