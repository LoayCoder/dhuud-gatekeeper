import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Bell, BellOff, CheckCircle2, Send, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useOneSignal } from '@/contexts/OneSignalContext';
import { useAuth } from '@/contexts/AuthContext';
import { triggerWorkflowNotification } from '@/lib/onesignal-workflow';
import { toast } from 'sonner';

export function NotificationManager() {
  const { t } = useTranslation();
  const { isInitialized, isSupported, permissionState, requestPermission } = useOneSignal();
  const { user } = useAuth();
  const [isSendingTest, setIsSendingTest] = useState(false);

  const handleEnableNotifications = async () => {
    await requestPermission();
  };

  const handleSendTest = async () => {
    if (!user?.id) return;
    setIsSendingTest(true);
    try {
      await triggerWorkflowNotification({
        type: 'status_change',
        heading: 'Test Notification',
        content: 'If you see this, OneSignal push notifications are working!',
        targetUserIds: [user.id],
        data: { route: '/dashboard' },
      });
      toast.success(t('notifications.testSent', 'Test notification sent'));
    } catch (error) {
      logger.error('Failed to send test notification', error);
      toast.error(t('notifications.testFailed', 'Failed to send test notification'));
    } finally {
      setIsSendingTest(false);
    }
  };

  if (!isSupported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellOff className="h-5 w-5 text-muted-foreground" />
            {t('notifications.pushTitle', 'Push Notifications')}
          </CardTitle>
          <CardDescription>
            {t('notifications.unsupported', 'Push notifications are not supported in this browser or the OneSignal App ID is not configured.')}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!isInitialized) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 animate-pulse text-muted-foreground" />
            {t('notifications.pushTitle', 'Push Notifications')}
          </CardTitle>
          <CardDescription>
            {t('notifications.initializing', 'Initializing notification service...')}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          {t('notifications.pushTitle', 'Push Notifications')}
        </CardTitle>
        <CardDescription>
          {t('notifications.pushDescription', 'Manage your push notification preferences for approval workflows.')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Permission: default */}
        {permissionState === 'default' && (
          <div className="flex items-start gap-3 p-4 rounded-lg border border-primary/20 bg-primary/5">
            <Bell className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium">
                {t('notifications.enableTitle', 'Enable Notifications')}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {t('notifications.enableDescription', 'Get notified about new requests, approvals, and status changes in real time.')}
              </p>
              <Button size="sm" className="mt-3" onClick={handleEnableNotifications}>
                <Bell className="h-3 w-3 me-1.5" />
                {t('notifications.enable', 'Enable Notifications')}
              </Button>
            </div>
          </div>
        )}

        {/* Permission: granted */}
        {permissionState === 'granted' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-3 rounded-lg border border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950">
              <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0" />
              <span className="text-sm text-green-700 dark:text-green-300">
                {t('notifications.active', 'Notifications Active')}
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSendTest}
              disabled={isSendingTest}
            >
              <Send className="h-3 w-3 me-1.5" />
              {isSendingTest
                ? t('notifications.sending', 'Sending...')
                : t('notifications.sendTest', 'Send Test Notification')}
            </Button>
          </div>
        )}

        {/* Permission: denied */}
        {permissionState === 'denied' && (
          <div className="flex items-start gap-3 p-4 rounded-lg border border-destructive/20 bg-destructive/5">
            <AlertTriangle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-destructive">
                {t('notifications.deniedTitle', 'Notifications Blocked')}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {t(
                  'notifications.deniedInstructions',
                  'You have blocked notifications for this site. To re-enable them:'
                )}
              </p>
              <ol className="text-xs text-muted-foreground mt-2 list-decimal list-inside space-y-1">
                <li>{t('notifications.deniedStep1', 'Click the lock/info icon in the browser address bar')}</li>
                <li>{t('notifications.deniedStep2', 'Find "Notifications" in the permissions list')}</li>
                <li>{t('notifications.deniedStep3', 'Change the setting from "Block" to "Allow"')}</li>
                <li>{t('notifications.deniedStep4', 'Refresh this page')}</li>
              </ol>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
