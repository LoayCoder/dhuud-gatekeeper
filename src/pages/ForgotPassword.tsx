import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useTheme as useNextTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Shield, ArrowLeft } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { z } from 'zod';
import { DHUUD_LOGO_LIGHT, DHUUD_LOGO_DARK, DHUUD_TENANT_NAME } from '@/constants/branding';

export default function ForgotPassword() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const navigate = useNavigate();
  const { resolvedTheme } = useNextTheme();

  // Determine the logo to display
  const displayLogo = resolvedTheme === 'dark' ? DHUUD_LOGO_DARK : DHUUD_LOGO_LIGHT;

  const resetSchema = z.object({
    email: z.string().email(t('auth.invalidEmail')),
  });

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      resetSchema.parse({ email });
      setLoading(true);

      const redirectUrl = `${window.location.origin}/reset-password`;

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });

      if (error) throw error;

      setEmailSent(true);
      toast({
        title: t('forgotPassword.checkYourEmail'),
        description: t('forgotPassword.emailSentMessage'),
      });
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
          description: err instanceof Error ? err.message : t('forgotPassword.sendResetLink'),
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-8">
      <div className="w-full max-w-md space-y-8">
        {/* Header */}
        <div className="text-center">
          <img 
            src={displayLogo} 
            alt={DHUUD_TENANT_NAME} 
            className="mx-auto mb-4 h-16 object-contain"
          />
          <h1 className="text-3xl font-bold">{t('forgotPassword.title')}</h1>
          <p className="mt-2 text-muted-foreground">
            {emailSent
              ? t('forgotPassword.emailSentDescription')
              : t('forgotPassword.description')}
          </p>
        </div>

        {!emailSent ? (
          <form onSubmit={handlePasswordReset} className="space-y-6">
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

            <Button type="submit" className="h-12 w-full text-lg" disabled={loading}>
              {loading ? t('forgotPassword.sending') : t('forgotPassword.sendResetLink')}
            </Button>

            <div className="text-center">
              <Button
                type="button"
                variant="link"
                onClick={() => navigate('/login')}
                className="text-sm"
              >
                <ArrowLeft className="me-2 h-4 w-4" />
                {t('forgotPassword.backToLogin')}
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-6">
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-center">
              <p className="text-sm">
                {t('forgotPassword.sentTo')} <strong>{email}</strong>
              </p>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/login')}
              className="h-12 w-full"
            >
              <ArrowLeft className="me-2 h-4 w-4" />
              {t('forgotPassword.backToLogin')}
            </Button>
          </div>
        )}

        {/* Security Footer */}
        <div className="mt-8 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Shield className="h-4 w-4" />
          <span>{t('security.protectedByZeroTrust')}</span>
        </div>
      </div>
    </div>
  );
}
