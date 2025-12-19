import { useState, useCallback } from 'react';
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

// Rate limiting constants
const RATE_LIMIT_KEY = 'password_reset_attempts';
const RATE_LIMIT_MAX = 3;
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

interface RateLimitData {
  attempts: number;
  resetTime: number;
}

// Client-side rate limiting
function checkClientRateLimit(): { allowed: boolean; remainingTime?: number } {
  try {
    const stored = localStorage.getItem(RATE_LIMIT_KEY);
    const now = Date.now();
    
    if (!stored) {
      localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify({ attempts: 1, resetTime: now + RATE_LIMIT_WINDOW_MS }));
      return { allowed: true };
    }
    
    const data: RateLimitData = JSON.parse(stored);
    
    // Reset if window expired
    if (now > data.resetTime) {
      localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify({ attempts: 1, resetTime: now + RATE_LIMIT_WINDOW_MS }));
      return { allowed: true };
    }
    
    // Check limit
    if (data.attempts >= RATE_LIMIT_MAX) {
      const remainingTime = Math.ceil((data.resetTime - now) / 1000);
      return { allowed: false, remainingTime };
    }
    
    // Increment attempts
    data.attempts++;
    localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(data));
    return { allowed: true };
  } catch {
    return { allowed: true };
  }
}

// Notify admin about password reset request
async function notifyPasswordResetRequest(email: string, language: string): Promise<void> {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    
    await fetch(`${supabaseUrl}/functions/v1/notify-password-reset`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        origin: window.location.origin,
        timestamp: new Date().toISOString(),
        language,
      }),
    });
  } catch (error) {
    // Silently fail - don't block the user flow
    console.error('Failed to notify admin:', error);
  }
}

export default function ForgotPassword() {
  const { t, i18n } = useTranslation();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const navigate = useNavigate();
  const { resolvedTheme } = useNextTheme();

  // Determine the logo to display
  const displayLogo = resolvedTheme === 'dark' ? DHUUD_LOGO_DARK : DHUUD_LOGO_LIGHT;

  const resetSchema = z.object({
    email: z.string().trim().email(t('auth.invalidEmail')).max(255),
  });

  const handlePasswordReset = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    // Client-side rate limiting
    const rateLimitCheck = checkClientRateLimit();
    if (!rateLimitCheck.allowed) {
      const minutes = Math.ceil((rateLimitCheck.remainingTime || 0) / 60);
      toast({
        title: t('auth.tooManyAttempts'),
        description: t('auth.tryAgainIn', { minutes }),
        variant: 'destructive',
      });
      return;
    }

    try {
      const trimmedEmail = email.trim().toLowerCase();
      resetSchema.parse({ email: trimmedEmail });
      setLoading(true);

      const redirectUrl = `${window.location.origin}/reset-password`;

      // Always show success message (constant-time response to prevent email enumeration)
      const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
        redirectTo: redirectUrl,
      });

      // Notify admin about the password reset request (fire and forget)
      notifyPasswordResetRequest(trimmedEmail, i18n.language);

      // Always show success even if there's an error (to prevent email enumeration)
      setEmailSent(true);
      toast({
        title: t('forgotPassword.checkYourEmail'),
        description: t('forgotPassword.emailSentMessage'),
      });

      // Log error for debugging but don't show to user
      if (error) {
        console.error('Password reset error (hidden from user):', error.message);
      }
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast({
          title: t('auth.validationError'),
          description: err.errors[0].message,
          variant: 'destructive',
        });
      } else {
        // Always show success to prevent email enumeration
        setEmailSent(true);
        toast({
          title: t('forgotPassword.checkYourEmail'),
          description: t('forgotPassword.emailSentMessage'),
        });
      }
    } finally {
      setLoading(false);
    }
  }, [email, resetSchema, t, i18n.language]);

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
