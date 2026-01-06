import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useTheme, TenantBrandingData } from '@/contexts/ThemeContext';
import { useTheme as useNextTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Shield, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { z } from 'zod';
import { DHUUD_LOGO_LIGHT, DHUUD_LOGO_DARK, DHUUD_TENANT_NAME } from '@/constants/branding';

export default function InviteGatekeeper() {
  const { t } = useTranslation();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const {
    applyTenantBranding,
    setInvitationData,
    tenantName,
    activeLogoUrl,
    isLoading: themeLoading
  } = useTheme();
  const { resolvedTheme } = useNextTheme();

  // Determine the logo to display with fallback
  const fallbackLogo = resolvedTheme === 'dark' ? DHUUD_LOGO_DARK : DHUUD_LOGO_LIGHT;
  const displayLogo = activeLogoUrl || fallbackLogo;
  const displayName = tenantName || DHUUD_TENANT_NAME;

  const inviteSchema = z.object({
    code: z.string().min(1, t('invite.codeRequired'))
  });

  useEffect(() => {
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
  }, [navigate]);

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

      // Check if user already exists
      const {
        data: checkData,
        error: checkError
      } = await supabase.functions.invoke('check-user-exists', {
        body: {
          email: inviteData.email
        }
      });
      if (checkError) {
        console.error('Error checking user existence:', checkError);
        throw new Error(t('invite.failedToVerifyUser'));
      }

      // Redirect based on user existence
      if (checkData.exists) {
        toast({
          title: t('invite.welcomeBack'),
          description: t('invite.welcomeBackMessage')
        });
        navigate('/login');
      } else {
        toast({
          title: t('invite.welcome'),
          description: t('invite.welcomeMessage')
        });
        navigate('/signup');
      }
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
    <div className="flex min-h-screen items-center justify-center bg-background p-8">
      <div className="w-full max-w-md space-y-8">
        {/* Logo and Header */}
        <div className="text-center animate-fade-in mx-0 my-0">
          <div className="mx-auto mb-6 flex items-center justify-center">
            {themeLoading ? (
              <Skeleton className="h-20 w-48 sm:h-28 sm:w-64 md:h-32 md:w-72" />
            ) : (
              <img
                src={displayLogo}
                alt={displayName}
                className="h-20 w-auto max-w-[280px] sm:h-28 sm:max-w-[360px] md:h-32 md:max-w-[420px] object-contain"
                onError={(e) => {
                  e.currentTarget.src = fallbackLogo;
                }}
              />
            )}
          </div>
          <h1 className="text-4xl font-bold py-[14px]">
            {themeLoading ? <Skeleton className="h-10 w-48 mx-auto" /> : displayName}
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            {t('invite.enterCodeToContinue')}
          </p>
        </div>

        {/* Loading Skeleton */}
        {loading && (
          <div className="space-y-6 animate-fade-in">
            <div className="space-y-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-14 w-full" />
            </div>
            <Skeleton className="h-14 w-full" />
            <div className="space-y-3">
              <Skeleton className="h-4 w-3/4 mx-auto" />
              <Skeleton className="h-4 w-2/3 mx-auto" />
            </div>
          </div>
        )}

        {/* Invitation Code Form */}
        {!loading && (
          <form onSubmit={handleInviteValidation} className="space-y-6 animate-fade-in">
            <div className="space-y-2">
              <Label htmlFor="code" className="text-base">
                {t('invite.invitationCode')}
              </Label>
              <Input
                id="code"
                type="text"
                placeholder={t('invite.enterYourCode')}
                value={code}
                onChange={e => setCode(e.target.value)}
                required
                className="h-14 text-lg"
              />
            </div>

            <Button type="submit" className="h-14 w-full text-lg">
              {t('invite.continue')}
            </Button>
          </form>
        )}

        {/* Login Link */}
        <div className="text-center">
          <Button
            type="button"
            variant="link"
            onClick={() => navigate('/login')}
            className="text-sm"
          >
            {t('invite.alreadyHaveAccount')}
          </Button>
        </div>

        {/* Security Footer */}
        <div className="mt-8 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Shield className="h-4 w-4" />
          <span>{t('security.protectedByZeroTrust')}</span>
        </div>
      </div>
    </div>
  );
}
