/**
 * Security Notification Settings Component
 * 
 * Settings panel for security personnel to manage emergency alert preferences.
 */

import { useTranslation } from 'react-i18next';
import { Bell, BellRing, Shield, AlertTriangle, Siren } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { usePushSubscription, usePushNotificationStatus } from '@/hooks/use-push-subscription';
import { usePushNotificationPreferences, NotificationTypeKey } from '@/hooks/use-push-notification-preferences';
import { cn } from '@/lib/utils';

export function SecurityNotificationSettings() {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';
  
  const {
    isSubscribed,
    isSupported,
    isLoading,
    subscribe,
  } = usePushSubscription();

  const { permission } = usePushNotificationStatus();

  const {
    preferences,
    isLoading: prefsLoading,
    updatePreference,
  } = usePushNotificationPreferences();

  const handleEnablePush = async () => {
    if (permission !== 'granted' && 'Notification' in window) {
      await Notification.requestPermission();
    }
    await subscribe();
  };

  // Map of security-relevant notification types
  const notificationTypes: Array<{
    key: NotificationTypeKey;
    icon: typeof Siren;
    label: string;
    description: string;
    critical: boolean;
  }> = [
    {
      key: 'sla_escalations',
      icon: Siren,
      label: t('security.notifications.emergencyAlerts', 'Emergency Alerts'),
      description: t('security.notifications.emergencyAlertsDesc', 'Panic, fire, medical emergencies'),
      critical: true,
    },
    {
      key: 'sla_warnings',
      icon: AlertTriangle,
      label: t('security.notifications.slaEscalations', 'SLA Escalations'),
      description: t('security.notifications.slaEscalationsDesc', 'Overdue actions and escalations'),
      critical: false,
    },
    {
      key: 'approvals_requested',
      icon: Bell,
      label: t('security.notifications.approvalRequests', 'Approval Requests'),
      description: t('security.notifications.approvalRequestsDesc', 'Pending approval notifications'),
      critical: false,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          {t('security.notifications.title', 'Security Notifications')}
        </CardTitle>
        <CardDescription>
          {t('security.notifications.description', 'Manage how you receive security alerts')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Push Notification Status */}
        <div className={cn(
          "flex items-center justify-between p-4 rounded-lg border",
          isSubscribed ? "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-900" : "bg-muted"
        )}>
          <div className="flex items-center gap-3">
            <div className={cn(
              "p-2 rounded-full",
              isSubscribed ? "bg-green-100 dark:bg-green-900" : "bg-muted-foreground/10"
            )}>
              {isSubscribed ? (
                <BellRing className="h-5 w-5 text-green-600 dark:text-green-400" />
              ) : (
                <Bell className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
            <div>
              <p className="font-medium">
                {t('security.notifications.pushStatus', 'Push Notifications')}
              </p>
              <p className="text-sm text-muted-foreground">
                {isSubscribed 
                  ? t('security.notifications.pushEnabled', 'You will receive alerts even when app is closed')
                  : t('security.notifications.pushDisabled', 'Enable to receive alerts when app is closed')
                }
              </p>
            </div>
          </div>
          
          {!isSubscribed ? (
            <Button 
              onClick={handleEnablePush} 
              disabled={isLoading || !isSupported}
              variant="destructive"
              size="sm"
            >
              {t('common.enable', 'Enable')}
            </Button>
          ) : (
            <Badge variant="outline" className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
              {t('common.active', 'Active')}
            </Badge>
          )}
        </div>

        {!isSupported && (
          <p className="text-sm text-amber-600 dark:text-amber-400">
            {t('security.notifications.notSupported', 'Push notifications are not supported on this device/browser')}
          </p>
        )}

        {/* Notification Type Preferences */}
        <div className="space-y-4">
          <h4 className="font-medium text-sm text-muted-foreground">
            {t('security.notifications.alertTypes', 'Alert Types')}
          </h4>
          
          {notificationTypes.map((type) => {
            const Icon = type.icon;
            const isEnabled = preferences?.[type.key] !== false;
            
            return (
              <div 
                key={type.key}
                className={cn(
                  "flex items-center justify-between p-3 rounded-lg border",
                  type.critical && "border-destructive/30 bg-destructive/5"
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon className={cn(
                    "h-5 w-5",
                    type.critical ? "text-destructive" : "text-muted-foreground"
                  )} />
                  <div>
                    <div className="flex items-center gap-2">
                      <Label htmlFor={type.key} className="font-medium">
                        {type.label}
                      </Label>
                      {type.critical && (
                        <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                          {t('common.critical', 'Critical')}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {type.description}
                    </p>
                  </div>
                </div>
                
                <Switch
                  id={type.key}
                  checked={isEnabled}
                  onCheckedChange={(checked) => updatePreference({ key: type.key, value: checked })}
                  disabled={prefsLoading || (type.critical && isEnabled)}
                  className={type.critical ? "data-[state=checked]:bg-destructive" : ""}
                />
              </div>
            );
          })}
        </div>

        {/* Info about critical alerts */}
        <p className="text-xs text-muted-foreground">
          {t('security.notifications.criticalNote', 'Emergency alerts cannot be disabled for security personnel.')}
        </p>
      </CardContent>
    </Card>
  );
}
