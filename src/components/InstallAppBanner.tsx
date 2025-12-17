import { useState, useEffect } from 'react';
import { X, Share, PlusSquare } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { DHUUD_APP_ICON } from '@/constants/branding';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
}

function isInStandaloneMode(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as any).standalone === true
  );
}

function isIOSSafari(): boolean {
  const ua = navigator.userAgent;
  const isIos = isIOS();
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
  return isIos && isSafari;
}

export function InstallAppBanner() {
  const { t } = useTranslation();
  const { user, isLoading: authLoading } = useAuth();
  const { activeAppIconUrl, tenantName } = useTheme();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [showIOSBanner, setShowIOSBanner] = useState(false);
  const [isDismissing, setIsDismissing] = useState(false);

  // Determine app icon - use tenant's icon or DHUUD default
  const appIcon = activeAppIconUrl || DHUUD_APP_ICON;

  useEffect(() => {
    // Don't show until auth is loaded and user is authenticated
    if (authLoading || !user) {
      return;
    }

    // Check if already installed
    if (isInStandaloneMode()) {
      return;
    }

    // Check if already dismissed recently (within 7 days)
    const dismissedAt = localStorage.getItem('pwa-install-dismissed');
    if (dismissedAt) {
      const dismissedTime = parseInt(dismissedAt, 10);
      const sevenDays = 7 * 24 * 60 * 60 * 1000;
      if (Date.now() - dismissedTime < sevenDays) {
        return;
      }
    }

    // Check for iOS Safari specifically
    if (isIOSSafari()) {
      setShowIOSBanner(true);
      return;
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, [authLoading, user]);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      setShowBanner(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setIsDismissing(true);
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
    setTimeout(() => {
      setShowBanner(false);
      setShowIOSBanner(false);
      setIsDismissing(false);
    }, 300);
  };

  // Don't show if not authenticated or auth is loading
  if (authLoading || !user) {
    return null;
  }

  // iOS Safari banner
  if (showIOSBanner) {
    return (
      <div
        className={cn(
          'fixed bottom-20 left-4 right-4 z-40 mx-auto max-w-md rounded-lg border bg-card p-4 shadow-lg',
          isDismissing ? 'animate-fade-out' : 'animate-in slide-in-from-bottom'
        )}
      >
        <button
          onClick={handleDismiss}
          className="absolute end-2 top-2 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label={t('common.dismiss', 'Dismiss')}
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-start gap-3">
          <img
            src={appIcon}
            alt={tenantName || 'App Icon'}
            className="h-10 w-10 shrink-0 rounded-lg object-cover"
            onError={(e) => { e.currentTarget.src = DHUUD_APP_ICON; }}
          />
          <div className="flex-1">
            <h3 className="font-semibold text-foreground">
              {t('pwa.installTitle', 'Install Dhuud HSSE')}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {t('pwa.iosInstructions', 'To install this app on your iPhone:')}
            </p>
            <ol className="mt-2 space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                  1
                </span>
                <span className="flex items-center gap-1">
                  {t('pwa.iosTapShare', 'Tap the')}
                  <Share className="mx-1 h-4 w-4 text-primary" />
                  {t('pwa.iosShareButton', 'Share button')}
                </span>
              </li>
              <li className="flex items-center gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                  2
                </span>
                <span className="flex items-center gap-1">
                  {t('pwa.iosScrollAndTap', 'Scroll and tap')}
                  <PlusSquare className="mx-1 h-4 w-4 text-primary" />
                  <strong>{t('pwa.iosAddToHome', 'Add to Home Screen')}</strong>
                </span>
              </li>
            </ol>
          </div>
        </div>
      </div>
    );
  }

  // Standard install prompt banner
  if (!showBanner) return null;

  return (
    <div
      className={cn(
        'fixed bottom-20 left-4 right-4 z-40 mx-auto max-w-md rounded-lg border bg-card p-4 shadow-lg',
        isDismissing ? 'animate-fade-out' : 'animate-in slide-in-from-bottom'
      )}
    >
      <button
        onClick={handleDismiss}
        className="absolute end-2 top-2 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
        aria-label={t('common.dismiss', 'Dismiss')}
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex items-start gap-3">
        <img
          src={appIcon}
          alt={tenantName || 'App Icon'}
          className="h-10 w-10 shrink-0 rounded-lg object-cover"
          onError={(e) => { e.currentTarget.src = DHUUD_APP_ICON; }}
        />
        <div className="flex-1">
          <h3 className="font-semibold text-foreground">
            {t('pwa.installTitle', 'Install Dhuud HSSE')}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('pwa.installDescription', 'Install the app for faster access and offline support.')}
          </p>
          <Button onClick={handleInstall} size="sm" className="mt-3">
            {t('pwa.installButton', 'Install App')}
          </Button>
        </div>
      </div>
    </div>
  );
}
