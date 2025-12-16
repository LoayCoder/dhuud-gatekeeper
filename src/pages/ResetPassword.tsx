import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useTheme as useNextTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Shield } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { z } from 'zod';
import { DHUUD_LOGO_LIGHT, DHUUD_LOGO_DARK, DHUUD_TENANT_NAME } from '@/constants/branding';

export default function ResetPassword() {
  const { t } = useTranslation();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { resolvedTheme } = useNextTheme();

  // Determine the logo to display
  const displayLogo = resolvedTheme === 'dark' ? DHUUD_LOGO_DARK : DHUUD_LOGO_LIGHT;

  const passwordSchema = z.object({
    password: z.string().min(6, t('auth.passwordMinLength')),
    confirmPassword: z.string(),
  }).refine((data) => data.password === data.confirmPassword, {
    message: t('auth.passwordsDoNotMatch'),
    path: ['confirmPassword'],
  });

  useEffect(() => {
    // Check if user has a valid session from the reset link
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        toast({
          title: t('resetPassword.invalidLink'),
          description: t('resetPassword.invalidLinkMessage'),
          variant: 'destructive',
        });
        navigate('/forgot-password');
      }
    });
  }, [navigate, t]);

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      passwordSchema.parse({ password, confirmPassword });
      setLoading(true);

      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) throw error;

      toast({
        title: t('resetPassword.passwordUpdated'),
        description: t('resetPassword.passwordUpdatedMessage'),
      });

      navigate('/login');
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
          description: err instanceof Error ? err.message : t('resetPassword.updatePassword'),
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
          <h1 className="text-3xl font-bold">{t('resetPassword.title')}</h1>
          <p className="mt-2 text-muted-foreground">
            {t('resetPassword.description')}
          </p>
        </div>

        {/* Password Reset Form */}
        <form onSubmit={handlePasswordUpdate} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">{t('resetPassword.newPassword')}</Label>
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

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">{t('resetPassword.confirmPassword')}</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder={t('auth.passwordPlaceholder')}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={loading}
                className="h-12"
              />
            </div>
          </div>

          <Button type="submit" className="h-12 w-full text-lg" disabled={loading}>
            {loading ? t('resetPassword.updating') : t('resetPassword.updatePassword')}
          </Button>
        </form>

        {/* Security Footer */}
        <div className="mt-8 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Shield className="h-4 w-4" />
          <span>{t('security.protectedByZeroTrust')}</span>
        </div>
      </div>
    </div>
  );
}
