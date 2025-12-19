import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { usePWAInstall } from '@/hooks/use-pwa-install';
import { Download, Share, Plus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useTheme } from '@/contexts/ThemeContext';
import { toast } from 'sonner';

interface InstallButtonProps {
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  showLabel?: boolean;
  className?: string;
}

export function InstallButton({ 
  variant = 'outline', 
  size = 'default',
  showLabel = true,
  className 
}: InstallButtonProps) {
  const { t } = useTranslation();
  const { canInstall, canPromptNatively, isIOS, promptInstall, isInstalled } = usePWAInstall();
  const { activeAppIconUrl, tenantName } = useTheme();
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  // Don't show if already installed
  if (isInstalled) return null;

  const handleClick = async () => {
    if (isIOS) {
      // Show iOS instructions modal
      setShowIOSInstructions(true);
      return;
    }

    if (canPromptNatively) {
      // Immediately trigger the native install prompt
      const accepted = await promptInstall();
      if (accepted) {
        toast.success(t('pwa.installed', 'App installed successfully!'));
      }
    } else {
      // Browser doesn't support beforeinstallprompt, show manual instructions
      toast.info(t('pwa.manualInstall', 'Use your browser menu to add to home screen'), {
        duration: 5000,
      });
    }
  };

  if (!canInstall) return null;

  return (
    <>
      <Button 
        variant={variant} 
        size={size} 
        onClick={handleClick}
        className={className}
      >
        <Download className="w-4 h-4" />
        {showLabel && (
          <span className="ms-2">{t('pwa.install.button', 'Install App')}</span>
        )}
      </Button>

      {/* iOS Instructions Dialog */}
      <Dialog open={showIOSInstructions} onOpenChange={setShowIOSInstructions}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="text-center items-center">
            <div className="mx-auto mb-4 w-16 h-16 rounded-xl bg-primary/10 p-2 flex items-center justify-center">
              <img 
                src={activeAppIconUrl || 'https://xdlowvfzhvjzbtgvurzj.supabase.co/storage/v1/object/public/branding/9290e913-c735-405c-91c6-141e966011ae/favicon/1764707368310.png'} 
                alt={tenantName} 
                className="w-full h-full object-contain rounded-lg"
              />
            </div>
            <DialogTitle>
              {t('pwa.ios.title', 'Install on iOS')}
            </DialogTitle>
            <DialogDescription className="text-center">
              {t('pwa.ios.description', 'Follow these steps to install {{name}}', { name: tenantName })}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
              <span className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium shrink-0">1</span>
              <div className="flex-1">
                <p className="font-medium text-sm">{t('pwa.ios.step1Title', 'Open Share Menu')}</p>
                <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                  {t('pwa.ios.step1Desc', 'Tap the')} <Share className="w-4 h-4 inline" /> {t('pwa.ios.step1Desc2', 'button at the bottom of Safari')}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
              <span className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium shrink-0">2</span>
              <div className="flex-1">
                <p className="font-medium text-sm">{t('pwa.ios.step2Title', 'Add to Home Screen')}</p>
                <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                  {t('pwa.ios.step2Desc', 'Scroll down and tap')} <Plus className="w-4 h-4 inline" /> {t('pwa.ios.step2Desc2', '"Add to Home Screen"')}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
              <span className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium shrink-0">3</span>
              <div className="flex-1">
                <p className="font-medium text-sm">{t('pwa.ios.step3Title', 'Confirm Installation')}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {t('pwa.ios.step3Desc', 'Tap "Add" in the top right corner')}
                </p>
              </div>
            </div>
          </div>

          <Button variant="outline" onClick={() => setShowIOSInstructions(false)} className="w-full">
            {t('common.gotIt', 'Got it!')}
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
