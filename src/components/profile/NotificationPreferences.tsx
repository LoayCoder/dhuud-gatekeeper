import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Bell, BellOff, AlertCircle, RefreshCw } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useNotificationPermission } from "@/hooks/use-notification-permission";
import { toast } from "@/hooks/use-toast";

export function NotificationPreferences() {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';
  const { permission, isSupported, isGranted, isDenied, requestPermission } = useNotificationPermission();
  
  const [syncNotifications, setSyncNotifications] = useState(() => {
    return localStorage.getItem('sync-notifications-enabled') !== 'false';
  });
  
  const [periodicSyncEnabled, setPeriodicSyncEnabled] = useState(() => {
    return localStorage.getItem('periodic-sync-enabled') !== 'false';
  });

  useEffect(() => {
    localStorage.setItem('sync-notifications-enabled', syncNotifications.toString());
  }, [syncNotifications]);

  useEffect(() => {
    localStorage.setItem('periodic-sync-enabled', periodicSyncEnabled.toString());
    
    // Register or unregister periodic sync
    if ('serviceWorker' in navigator && 'periodicSync' in ServiceWorkerRegistration.prototype) {
      navigator.serviceWorker.ready.then(async (registration) => {
        try {
          if (periodicSyncEnabled) {
            // @ts-ignore - periodicSync is not in TypeScript types yet
            const status = await navigator.permissions.query({ name: 'periodic-background-sync' });
            if (status.state === 'granted') {
              // @ts-ignore
              await registration.periodicSync.register('server-updates-sync', {
                minInterval: 4 * 60 * 60 * 1000, // 4 hours
              });
            }
          } else {
            // @ts-ignore
            await registration.periodicSync.unregister('server-updates-sync');
          }
        } catch (error) {
          console.log('Periodic sync not available:', error);
        }
      });
    }
  }, [periodicSyncEnabled]);

  const handleEnableNotifications = async () => {
    const granted = await requestPermission();
    if (granted) {
      toast({
        title: t('notifications.enabled'),
        description: t('notifications.enabledDescription'),
      });
    } else {
      toast({
        title: t('notifications.deniedTitle'),
        description: t('notifications.deniedDescription'),
        variant: "destructive",
      });
    }
  };

  const handleRevokeNotifications = () => {
    toast({
      title: t('notifications.revokeInfo'),
      description: t('notifications.revokeInstructions'),
    });
  };

  if (!isSupported) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{t('notifications.unsupported')}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium">{t('notifications.title')}</h3>
        <p className="text-sm text-muted-foreground">
          {t('notifications.description')}
        </p>
      </div>

      {/* Permission Status */}
      <div className="rounded-lg border p-4 space-y-4">
        <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
          <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
            {isGranted ? (
              <Bell className="h-5 w-5 text-green-600" />
            ) : (
              <BellOff className="h-5 w-5 text-muted-foreground" />
            )}
            <div className={isRTL ? 'text-right' : ''}>
              <p className="font-medium">{t('notifications.browserPermission')}</p>
              <p className="text-sm text-muted-foreground">
                {isGranted 
                  ? t('notifications.permissionGranted') 
                  : isDenied 
                    ? t('notifications.permissionDenied')
                    : t('notifications.permissionDefault')}
              </p>
            </div>
          </div>
          {!isGranted && !isDenied && (
            <Button onClick={handleEnableNotifications} size="sm">
              {t('notifications.enable')}
            </Button>
          )}
          {isDenied && (
            <Button onClick={handleRevokeNotifications} variant="outline" size="sm">
              {t('notifications.howToEnable')}
            </Button>
          )}
        </div>

        {/* Sync Notifications Toggle */}
        {isGranted && (
          <div className={`flex items-center justify-between pt-2 border-t ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className={isRTL ? 'text-right' : ''}>
              <Label htmlFor="sync-notifications" className="font-medium">
                {t('notifications.syncNotifications')}
              </Label>
              <p className="text-sm text-muted-foreground">
                {t('notifications.syncNotificationsDescription')}
              </p>
            </div>
            <Switch
              id="sync-notifications"
              checked={syncNotifications}
              onCheckedChange={setSyncNotifications}
            />
          </div>
        )}

        {/* Periodic Sync Toggle */}
        <div className={`flex items-center justify-between pt-2 border-t ${isRTL ? 'flex-row-reverse' : ''}`}>
          <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <RefreshCw className="h-5 w-5 text-muted-foreground" />
            <div className={isRTL ? 'text-right' : ''}>
              <Label htmlFor="periodic-sync" className="font-medium">
                {t('notifications.periodicSync')}
              </Label>
              <p className="text-sm text-muted-foreground">
                {t('notifications.periodicSyncDescription')}
              </p>
            </div>
          </div>
          <Switch
            id="periodic-sync"
            checked={periodicSyncEnabled}
            onCheckedChange={setPeriodicSyncEnabled}
          />
        </div>
      </div>

      {isDenied && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {t('notifications.blockedInstructions')}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
