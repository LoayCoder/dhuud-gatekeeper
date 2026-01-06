import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Bell, BellOff, AlertCircle, RefreshCw, Smartphone, Loader2, Send, Lock } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { useNotificationPermission } from "@/hooks/use-notification-permission";
import { toast } from "@/hooks/use-toast";
import { NotificationHistory } from "./NotificationHistory";
import { NotificationSoundSettings } from "./NotificationSoundSettings";
import { NotificationCategoryPreferences } from "./NotificationCategoryPreferences";
import { PushNotificationTypePreferences } from "./PushNotificationTypePreferences";
import { AssetNotificationPreferences } from "@/components/settings/AssetNotificationPreferences";
import { usePushSubscription } from "@/hooks/use-push-subscription";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const RTL_LANGUAGES = ['ar', 'ur'];

export function NotificationPreferences() {
  const { t, i18n } = useTranslation();
  const isRTL = RTL_LANGUAGES.includes(i18n.language);
  const direction = isRTL ? 'rtl' : 'ltr';
  const { permission, isSupported, isGranted, isDenied, requestPermission } = useNotificationPermission();
  const { isSubscribed, isLoading: isPushLoading, subscribe, unsubscribe, error: pushError, isAuthenticated } = usePushSubscription();
  const { user } = useAuth();
  const [isToggling, setIsToggling] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  
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

  const handlePushToggle = async (checked: boolean) => {
    setIsToggling(true);
    try {
      if (checked) {
        const success = await subscribe();
        if (success) {
          toast({
            title: t('notifications.pushSubscribed', 'Push notifications enabled'),
            description: t('notifications.pushSubscribedDescription', 'You will now receive push notifications on this device.'),
          });
        }
        // If not successful, the error is already set in the hook state and displayed in UI
      } else {
        const success = await unsubscribe();
        if (success) {
          toast({
            title: t('notifications.pushUnsubscribed', 'Push notifications disabled'),
            description: t('notifications.pushUnsubscribedDescription', 'You will no longer receive push notifications on this device.'),
          });
        }
      }
    } catch (error) {
      toast({
        title: t('notifications.pushError', 'Push notification error'),
        description: error instanceof Error ? error.message : t('notifications.pushErrorDescription', 'Failed to update push notification settings.'),
        variant: "destructive",
      });
    } finally {
      setIsToggling(false);
    }
  };

  const handleTestPushNotification = async () => {
    if (!user?.id) {
      toast({
        title: t('notifications.testError', 'Test failed'),
        description: t('notifications.noUser', 'User not authenticated'),
        variant: "destructive",
      });
      return;
    }

    setIsSendingTest(true);
    try {
      console.log('[TestPush] Sending test notification to user:', user.id);
      
      const response = await supabase.functions.invoke('send-push-notification', {
        body: {
          user_ids: [user.id],
          payload: {
            title: 'Test Push Notification ✅',
            body: 'If you see this, push notifications are working correctly!',
            tag: 'test-notification',
            data: { type: 'test' }
          }
        }
      });

      console.log('[TestPush] Response:', response);

      if (response.error) {
        console.error('[TestPush] Error from edge function:', response.error);
        throw response.error;
      }

      const result = response.data;
      console.log('[TestPush] Result:', result);

      if (result?.sent > 0) {
        toast({
          title: t('notifications.testSent', 'Test notification sent!'),
          description: t('notifications.testSentDescription', 'You should receive a push notification shortly.'),
        });
      } else if (result?.message?.includes('No active subscriptions')) {
        toast({
          title: t('notifications.noSubscription', 'No active subscription'),
          description: t('notifications.resubscribe', 'Please toggle push notifications off and on again to re-subscribe.'),
          variant: "destructive",
        });
      } else {
        toast({
          title: t('notifications.testSent', 'Request sent'),
          description: result?.message || 'Check if you receive the notification.',
        });
      }
    } catch (error) {
      console.error('[TestPush] Error:', error);
      toast({
        title: t('notifications.testError', 'Failed to send test notification'),
        description: error instanceof Error ? error.message : 'Unknown error - check console',
        variant: "destructive",
      });
    } finally {
      setIsSendingTest(false);
    }
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
    <div className="space-y-4" dir={direction}>
      <div>
        <h3 className="text-lg font-medium">{t('notifications.title')}</h3>
        <p className="text-sm text-muted-foreground">
          {t('notifications.description')}
        </p>
      </div>

      {/* Permission Status */}
      <div className="rounded-lg border p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isGranted ? (
              <Bell className="h-5 w-5 text-green-600" />
            ) : (
              <BellOff className="h-5 w-5 text-muted-foreground" />
            )}
            <div>
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
          <div className="flex items-center justify-between pt-2 border-t">
            <div>
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
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-3">
            <RefreshCw className="h-5 w-5 text-muted-foreground" />
            <div>
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

        {/* Push Notification Subscription Toggle */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-3">
            <Smartphone className="h-5 w-5 text-muted-foreground" />
            <div className="flex-1">
              <Label htmlFor="push-subscription" className="font-medium">
                {t('notifications.pushSubscription', 'Push Notifications')}
              </Label>
              <p className="text-sm text-muted-foreground">
                {isAuthenticated
                  ? (isSubscribed 
                      ? t('notifications.pushSubscriptionActive', 'Receiving push notifications on this device')
                      : t('notifications.pushSubscriptionInactive', 'Enable to receive push notifications on this device'))
                  : t('notifications.pushDescription', 'Enable to receive push notifications on this device')
                }
              </p>
              
              {/* Info message when not authenticated - NOT red */}
              {!isAuthenticated && (
                <div className="flex items-center gap-2 mt-2 p-2 rounded-md bg-muted/50 border border-border">
                  <Lock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-sm text-muted-foreground flex-1">
                    {t('notifications.signInRequired', 'Please sign in to enable push notifications and receive important alerts.')}
                  </span>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    asChild
                    className="flex-shrink-0"
                  >
                    <Link to="/login">
                      {t('common.signIn', 'Sign In')}
                    </Link>
                  </Button>
                </div>
              )}
              
              {/* Only show errors when authenticated */}
              {isAuthenticated && pushError && (
                <p className="text-sm text-destructive mt-1">
                  {pushError}
                </p>
              )}
            </div>
          </div>
          {(isToggling || isPushLoading) ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : (
            <Switch
              id="push-subscription"
              checked={isSubscribed}
              onCheckedChange={handlePushToggle}
              disabled={!isAuthenticated}
            />
          )}
        </div>

        {/* Test Push Notification Button - Always visible */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-3">
            <Send className="h-5 w-5 text-muted-foreground" />
            <div>
              <Label className="font-medium">
                {t('notifications.testPush', 'Test Push Notification')}
              </Label>
              <p className="text-sm text-muted-foreground">
                {t('notifications.testPushDescription', 'Send a test notification to verify push is working')}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleTestPushNotification}
            disabled={isSendingTest || !isSubscribed || !user?.id}
          >
            {isSendingTest ? (
              <Loader2 className="h-4 w-4 animate-spin me-2" />
            ) : (
              <Send className="h-4 w-4 me-2" />
            )}
            {t('notifications.sendTest', 'Send Test')}
          </Button>
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

      {/* Push Notification Type Preferences - Only show if subscribed */}
      {isSubscribed && (
        <>
          <Separator className="my-6" />
          <PushNotificationTypePreferences />
        </>
      )}

      <Separator className="my-6" />
      
      {/* Category Preferences */}
      <NotificationCategoryPreferences />
      
      <Separator className="my-6" />
      
      {/* Sound Settings */}
      <NotificationSoundSettings />
      
      <Separator className="my-6" />
      
      {/* Notification History */}
      <NotificationHistory />
      
      <Separator className="my-6" />
      
      {/* Asset Notification Preferences */}
      <AssetNotificationPreferences />
    </div>
  );
}
