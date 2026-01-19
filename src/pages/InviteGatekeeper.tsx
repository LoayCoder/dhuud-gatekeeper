import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useTheme, TenantBrandingData } from '@/contexts/ThemeContext';
import { useTheme as useNextTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Shield, Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { z } from 'zod';
import { DHUUD_LOGO_LIGHT, DHUUD_LOGO_DARK, DHUUD_TENANT_NAME } from '@/constants/branding';
import { HeaderControls } from '@/components/home/HeaderControls';

export default function InviteGatekeeper() {
  const { t } = useTranslation();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [validationSuccess, setValidationSuccess] = useState(false);
  const navigate = useNavigate();
  const {
    applyTenantBranding,
    setInvitationData,
    tenantName,
    activeLogoUrl,
    isLoading: themeLoading
  } = useTheme();
  const { resolvedTheme } = useNextTheme();
  const [searchParams] = useSearchParams();
  const wantsNewCode = searchParams.get('newCode') === 'true';

  // Determine the logo to display with fallback
  const fallbackLogo = resolvedTheme === 'dark' ? DHUUD_LOGO_DARK : DHUUD_LOGO_LIGHT;
  const displayLogo = activeLogoUrl || fallbackLogo;
  const displayName = tenantName || DHUUD_TENANT_NAME;

  const inviteSchema = z.object({
    code: z.string().min(1, t('invite.codeRequired'))
  });

  useEffect(() => {
    // If user explicitly wants to enter a new code, skip the verified device check
    if (wantsNewCode) {
      // Clear the old token so they can re-verify with new code
      localStorage.removeItem('invitation_verified_device_token');
      return;
    }
    
    // Check if device is already verified - redirect to login instead
    const verifiedToken = localStorage.getItem('invitation_verified_device_token');
    if (verifiedToken) {
      navigate('/login');
      return;
    }
    
    // Check if already logged in, redirect to dashboard
    supabase.auth.getSession().then(({
      data: {
        session
      }
    }) => {
      if (session) {
        navigate('/');
      }
    });
  }, [navigate, wantsNewCode]);

  const handleInviteValidation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Validate input
      inviteSchema.parse({
        code
      });
      setLoading(true);

      // Fetch invitation securely via RPC (works for anonymous users)
      const {
        data: result,
        error: inviteError
      } = await supabase.rpc('lookup_invitation', {
        lookup_code: code.trim()
      });
      if (inviteError) {
        throw new Error(t('invite.failedToValidate'));
      }
      if (!result) {
        toast({
          title: t('invite.invalidCode'),
          description: t('invite.invalidCodeMessage'),
          variant: 'destructive'
        });
        setLoading(false);
        return;
      }
      const inviteData = result as unknown as TenantBrandingData & {
        email: string;
        tenant_id: string;
      };

      // Apply full tenant branding from the RPC result
      applyTenantBranding(inviteData);

      // Store invitation data in context
      setInvitationData(inviteData.email, code.trim(), inviteData.tenant_id);

      // Check if user already exists - MULTI-TENANT: must include tenant_id
      const {
        data: checkData,
        error: checkError
      } = await supabase.functions.invoke('check-user-exists', {
        body: {
          email: inviteData.email,
          tenant_id: inviteData.tenant_id // Required for multi-tenant check
        }
      });
      if (checkError) {
        console.error('Error checking user existence:', checkError);
        throw new Error(t('invite.failedToVerifyUser'));
      }

      // Show success animation
      setValidationSuccess(true);
      setLoading(false);

      // Delay navigation to show success animation
      setTimeout(() => {
        // Route based on auth existence (not tenant profile existence)
        // If user has auth account: go to LOGIN (they'll get a new profile in this tenant)
        // If user has no auth account: go to SIGNUP (create auth + profile)
        if (checkData.should_login || checkData.exists_in_auth) {
          // Check if user was deleted from this tenant - show different message
          if (checkData.can_be_reactivated) {
            toast({
              title: t('invite.welcomeBack'),
              description: t('invite.reactivatingAccess', 'Your access is being restored.')
            });
            
            // For reactivated users, store flag to trigger MFA reset after login
            // This ensures they can set up MFA fresh without "factor already exists" errors
            sessionStorage.setItem('pending_mfa_reset', JSON.stringify({
              user_id: checkData.user_id,
              tenant_id: inviteData.tenant_id,
              reason: 'user_reactivation'
            }));
          } else if (checkData.exists_in_tenant) {
            toast({
              title: t('invite.welcomeBack'),
              description: t('invite.welcomeBackMessage')
            });
          } else {
            toast({
              title: t('invite.welcome'),
              description: t('invite.newTenantAccess', 'You will be added to this organization.')
            });
          }
          navigate('/login');
        } else {
          toast({
            title: t('invite.welcome'),
            description: t('invite.welcomeMessage')
          });
          navigate('/signup');
        }
      }, 1500);
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast({
          title: t('auth.validationError'),
          description: err.errors[0].message,
          variant: 'destructive'
        });
      } else {
        toast({
          title: t('auth.error'),
          description: err instanceof Error ? err.message : t('invite.failedToValidate'),
          variant: 'destructive'
        });
      }
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-gradient-to-br from-background via-background to-muted/30">
      {/* Header - compact and shrink-0 */}
      <header className="flex shrink-0 items-center justify-between px-4 py-2 sm:px-6 sm:py-3">
        <div className="flex items-center gap-3">
          {themeLoading ? (
            <Skeleton className="h-7 w-24 sm:h-8 sm:w-28" />
          ) : (
            <img 
              src={displayLogo} 
              alt={displayName} 
              className="h-7 object-contain sm:h-8"
              onError={(e) => {
                e.currentTarget.src = fallbackLogo;
              }}
            />
          )}
        </div>
        <HeaderControls />
      </header>

      {/* Main Content - flex-1 with overflow handling */}
      <main className="flex min-h-0 flex-1 items-center justify-center overflow-auto px-4 py-2">
        <Card className="w-full max-w-sm border-border/50 bg-card/80 shadow-lg backdrop-blur-sm sm:max-w-md">
          <CardHeader className="space-y-3 pb-4 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 sm:h-14 sm:w-14">
              {themeLoading ? (
                <Skeleton className="h-8 w-8 rounded-lg sm:h-10 sm:w-10" />
              ) : (
                <img 
                  src={displayLogo} 
                  alt={displayName} 
                  className="h-8 w-8 object-contain sm:h-10 sm:w-10"
                  onError={(e) => {
                    e.currentTarget.src = fallbackLogo;
                  }}
                />
              )}
            </div>
            <div className="space-y-1">
              {themeLoading ? (
                <Skeleton className="mx-auto h-6 w-32 sm:h-7" />
              ) : (
                <h1 className="text-lg font-semibold tracking-tight sm:text-xl">{displayName}</h1>
              )}
              <p className="text-xs text-muted-foreground sm:text-sm">
                {t('invite.enterCodeToContinue')}
              </p>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Success Animation */}
            {validationSuccess && (
              <div className="animate-fade-in space-y-4 py-4 text-center">
                <div className="mx-auto flex h-14 w-14 animate-scale-in items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30 sm:h-16 sm:w-16">
                  <CheckCircle2 className="h-7 w-7 text-green-600 dark:text-green-400 sm:h-8 sm:w-8" />
                </div>
                <div className="space-y-1.5">
                  <h2 className="text-lg font-semibold text-green-700 dark:text-green-400 sm:text-xl">
                    {t('invite.codeVerified', 'Code Verified')}
                  </h2>
                  <p className="text-xs text-muted-foreground sm:text-sm">
                    {t('invite.redirecting', 'Redirecting...')}
                  </p>
                </div>
                <div className="flex justify-center">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground sm:h-5 sm:w-5" />
                </div>
              </div>
            )}

            {/* Loading Skeleton */}
            {loading && !validationSuccess && (
              <div className="animate-fade-in space-y-4">
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-10 w-full" />
                </div>
                <Skeleton className="h-10 w-full" />
              </div>
            )}

            {/* Invitation Code Form */}
            {!loading && !validationSuccess && (
              <form onSubmit={handleInviteValidation} className="animate-fade-in space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="code" className="text-sm font-medium">
                    {t('invite.invitationCode')}
                  </Label>
                  <Input
                    id="code"
                    type="text"
                    placeholder={t('invite.enterYourCode')}
                    value={code}
                    onChange={e => setCode(e.target.value)}
                    required
                    className="h-10"
                  />
                </div>

                <Button type="submit" className="h-10 w-full font-medium">
                  {t('invite.continue')}
                </Button>

                {/* Login Link */}
                <div className="rounded-lg border border-dashed border-border/50 bg-muted/30 p-3 text-center">
                  <p className="text-xs text-muted-foreground sm:text-sm">
                    {t('invite.alreadyHaveAccount')}
                  </p>
                  <Button
                    type="button"
                    variant="link"
                    onClick={() => navigate('/login')}
                    className="h-auto p-0 text-xs font-medium text-primary sm:text-sm"
                  >
                    {t('auth.signIn')}
                  </Button>
                </div>
              </form>
            )}
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
    </div>
  );
}
