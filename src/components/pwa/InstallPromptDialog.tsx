import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { usePWAInstall } from '@/hooks/use-pwa-install';
import { useTheme } from '@/contexts/ThemeContext';
import { Download, Share, Plus, CheckCircle2, Zap, WifiOff, Bell } from 'lucide-react';

const AUTO_SHOW_KEY = 'pwa-install-auto-shown';
const AUTO_SHOW_DELAY = 2000; // 2 seconds after login

interface InstallPromptDialogProps {
  triggerOnLogin?: boolean;
}

export function InstallPromptDialog({ triggerOnLogin = false }: InstallPromptDialogProps) {
  const { t } = useTranslation();
  const { canInstall, canPromptNatively, isIOS, promptInstall, dismissUntil, isInstalled } = usePWAInstall();
  const { activeAppIconUrl, tenantName } = useTheme();
  const [open, setOpen] = useState(false);

  // Auto-show on login if not dismissed
  useEffect(() => {
    if (!triggerOnLogin || isInstalled) return;
    
    const autoShownUntil = localStorage.getItem(AUTO_SHOW_KEY);
    if (autoShownUntil && new Date(autoShownUntil) > new Date()) {
      return; // Already shown recently
    }
    
    const timer = setTimeout(() => {
      if (canInstall) {
        setOpen(true);
        // Mark as shown for 24 hours
        const until = new Date();
        until.setHours(until.getHours() + 24);
        localStorage.setItem(AUTO_SHOW_KEY, until.toISOString());
      }
    }, AUTO_SHOW_DELAY);

    return () => clearTimeout(timer);
  }, [triggerOnLogin, canInstall, isInstalled]);

  const handleInstall = async () => {
    if (canPromptNatively) {
      const accepted = await promptInstall();
      if (accepted) {
        setOpen(false);
      }
    }
  };

  const handleDismiss = () => {
    dismissUntil(7); // Dismiss for 7 days
    setOpen(false);
  };

  const benefits = [
    { icon: Zap, text: t('pwa.benefit.faster', 'Faster loading & performance') },
    { icon: WifiOff, text: t('pwa.benefit.offline', 'Works offline') },
    { icon: Bell, text: t('pwa.benefit.notifications', 'Push notifications') },
  ];

  if (isInstalled) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center items-center">
          <div className="mx-auto mb-4 w-20 h-20 rounded-2xl bg-primary/10 p-2 flex items-center justify-center">
            <img 
              src={activeAppIconUrl || 'https://xdlowvfzhvjzbtgvurzj.supabase.co/storage/v1/object/public/branding/9290e913-c735-405c-91c6-141e966011ae/favicon/1764707368310.png'} 
              alt={tenantName} 
              className="w-full h-full object-contain rounded-xl"
            />
          </div>
          <DialogTitle className="text-xl">
            {t('pwa.install.title', 'Install {{name}}', { name: tenantName })}
          </DialogTitle>
          <DialogDescription className="text-center">
            {t('pwa.install.description', 'Add to your home screen for the best experience')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          {benefits.map((benefit, index) => (
            <div key={index} className="flex items-center gap-3 text-sm">
              <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
              <benefit.icon className="w-4 h-4 text-muted-foreground shrink-0" />
              <span>{benefit.text}</span>
            </div>
          ))}
        </div>

        {isIOS ? (
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <p className="text-sm font-medium">{t('pwa.ios.instructions', 'To install on iOS:')}</p>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">1</span>
                <span className="flex items-center gap-1">
                  {t('pwa.ios.step1', 'Tap the')} <Share className="w-4 h-4" /> {t('pwa.ios.share', 'Share button')}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">2</span>
                <span className="flex items-center gap-1">
                  {t('pwa.ios.step2', 'Tap')} <Plus className="w-4 h-4" /> {t('pwa.ios.addToHome', '"Add to Home Screen"')}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <Button 
              onClick={handleInstall} 
              className="w-full gap-2"
              disabled={!canPromptNatively}
            >
              <Download className="w-4 h-4" />
              {t('pwa.install.button', 'Install Now')}
            </Button>
            {!canPromptNatively && (
              <p className="text-xs text-muted-foreground text-center">
                {t('pwa.install.browserPrompt', 'Use your browser menu to install')}
              </p>
            )}
          </div>
        )}

        <Button 
          variant="ghost" 
          onClick={handleDismiss}
          className="w-full text-muted-foreground"
        >
          {t('pwa.install.later', 'Maybe Later')}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
