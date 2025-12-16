import { useTranslation } from "react-i18next";
import { Bell, AlertTriangle, CheckCircle, Clock, Megaphone } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  usePushNotificationPreferences, 
  NotificationTypeKey 
} from "@/hooks/use-push-notification-preferences";

const RTL_LANGUAGES = ['ar', 'ur'];

interface NotificationCategory {
  id: string;
  icon: React.ReactNode;
  types: NotificationTypeKey[];
}

const NOTIFICATION_CATEGORIES: NotificationCategory[] = [
  {
    id: 'incidents',
    icon: <AlertTriangle className="h-4 w-4 text-destructive" />,
    types: ['incidents_new', 'incidents_assigned', 'incidents_status_change'],
  },
  {
    id: 'approvals',
    icon: <CheckCircle className="h-4 w-4 text-green-600" />,
    types: ['approvals_requested', 'approvals_decision'],
  },
  {
    id: 'sla',
    icon: <Clock className="h-4 w-4 text-amber-600" />,
    types: ['sla_warnings', 'sla_overdue', 'sla_escalations'],
  },
  {
    id: 'system',
    icon: <Megaphone className="h-4 w-4 text-primary" />,
    types: ['system_announcements'],
  },
];

export function PushNotificationTypePreferences() {
  const { t, i18n } = useTranslation();
  const isRTL = RTL_LANGUAGES.includes(i18n.language);
  const direction = isRTL ? 'rtl' : 'ltr';
  
  const { 
    preferences, 
    isLoading, 
    updatePreference, 
    updateMultiple,
    isUpdating 
  } = usePushNotificationPreferences();

  const handleToggle = (key: NotificationTypeKey, value: boolean) => {
    updatePreference({ key, value });
  };

  const handleCategoryToggle = (types: NotificationTypeKey[], enable: boolean) => {
    const updates = types.reduce((acc, type) => {
      acc[type] = enable;
      return acc;
    }, {} as Record<NotificationTypeKey, boolean>);
    updateMultiple(updates);
  };

  const isCategoryEnabled = (types: NotificationTypeKey[]) => {
    if (!preferences) return false;
    return types.every(type => preferences[type]);
  };

  const isCategoryPartiallyEnabled = (types: NotificationTypeKey[]) => {
    if (!preferences) return false;
    const enabled = types.filter(type => preferences[type]);
    return enabled.length > 0 && enabled.length < types.length;
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!preferences) {
    return null;
  }

  return (
    <div className="space-y-4" dir={direction}>
      <div className="flex items-center gap-2">
        <Bell className="h-5 w-5 text-primary" />
        <div>
          <h3 className="text-lg font-medium">{t('pushNotifications.title')}</h3>
          <p className="text-sm text-muted-foreground">
            {t('pushNotifications.description')}
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {NOTIFICATION_CATEGORIES.map((category) => {
          const allEnabled = isCategoryEnabled(category.types);
          const partiallyEnabled = isCategoryPartiallyEnabled(category.types);

          return (
            <div key={category.id} className="rounded-lg border p-4 space-y-3">
              {/* Category Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {category.icon}
                  <span className="font-medium">
                    {t(`pushNotifications.category.${category.id}`)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => handleCategoryToggle(category.types, !allEnabled)}
                    disabled={isUpdating}
                  >
                    {allEnabled 
                      ? t('pushNotifications.disableAll') 
                      : t('pushNotifications.enableAll')}
                  </Button>
                </div>
              </div>

              {/* Individual Type Toggles */}
              <div className="space-y-3 ps-6 border-s-2 border-muted ms-2">
                {category.types.map((typeKey) => (
                  <div 
                    key={typeKey} 
                    className="flex items-center justify-between gap-4"
                  >
                    <div className="flex-1 min-w-0">
                      <Label 
                        htmlFor={typeKey} 
                        className="font-normal cursor-pointer"
                      >
                        {t(`pushNotifications.types.${typeKey}`)}
                      </Label>
                      <p className="text-xs text-muted-foreground truncate">
                        {t(`pushNotifications.descriptions.${typeKey}`)}
                      </p>
                    </div>
                    <Switch
                      id={typeKey}
                      checked={preferences[typeKey]}
                      onCheckedChange={(checked) => handleToggle(typeKey, checked)}
                      disabled={isUpdating}
                    />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
