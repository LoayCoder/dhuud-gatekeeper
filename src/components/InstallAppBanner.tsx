import { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallAppBanner() {
  const { t } = useTranslation();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isDismissing, setIsDismissing] = useState(false);

  useEffect(() => {
    // Check if already dismissed recently (within 7 days)
    const dismissedAt = localStorage.getItem('pwa-install-dismissed');
    if (dismissedAt) {
      const dismissedTime = parseInt(dismissedAt, 10);
      const sevenDays = 7 * 24 * 60 * 60 * 1000;
      if (Date.now() - dismissedTime < sevenDays) {
        return;
      }
    }

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
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
  }, []);

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
      setIsDismissing(false);
    }, 300);
  };

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
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <Download className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-foreground">
            {t('pwa.installTitle', 'Install Dhuud HSSE')}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('pwa.installDescription', 'Install the app for faster access and offline support.')}
          </p>
          <Button onClick={handleInstall} size="sm" className="mt-3">
            <Download className="me-2 h-4 w-4" />
            {t('pwa.installButton', 'Install App')}
          </Button>
        </div>
      </div>
    </div>
  );
}
