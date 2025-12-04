import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Bell, BellOff, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNotificationPermission } from '@/hooks/use-notification-permission';

const DISMISSED_KEY = 'notification-prompt-dismissed';

export function NotificationPermissionPrompt() {
  const { t } = useTranslation();
  const { permission, isSupported, requestPermission } = useNotificationPermission();
  const [isDismissed, setIsDismissed] = useState(true);
  const [isRequesting, setIsRequesting] = useState(false);

  useEffect(() => {
    // Check if user has dismissed the prompt
    const dismissed = localStorage.getItem(DISMISSED_KEY);
    const dismissedTime = dismissed ? parseInt(dismissed, 10) : 0;
    const daysSinceDismiss = (Date.now() - dismissedTime) / (1000 * 60 * 60 * 24);
    
    // Show again after 7 days if still on default
    if (!dismissed || (permission === 'default' && daysSinceDismiss > 7)) {
      setIsDismissed(false);
    }
  }, [permission]);

  const handleEnable = async () => {
    setIsRequesting(true);
    try {
      await requestPermission();
      setIsDismissed(true);
    } finally {
      setIsRequesting(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, Date.now().toString());
    setIsDismissed(true);
  };

  // Don't show if not supported, already granted/denied, or dismissed
  if (!isSupported || permission !== 'default' || isDismissed) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 left-4 sm:left-auto sm:right-4 sm:max-w-sm z-50 animate-in slide-in-from-top-4 duration-300">
      <div className="bg-card border border-border rounded-lg shadow-lg p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Bell className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm text-foreground">
              {t('notifications.enableTitle')}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {t('notifications.enableDescription')}
            </p>
            <div className="flex gap-2 mt-3">
              <Button
                size="sm"
                onClick={handleEnable}
                disabled={isRequesting}
                className="text-xs"
              >
                <Bell className="h-3 w-3 me-1" />
                {t('notifications.enable')}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleDismiss}
                className="text-xs"
              >
                {t('notifications.notNow')}
              </Button>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
