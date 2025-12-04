import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { RefreshCw, Bell, Info, AlertTriangle } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  CategoryPreferences,
  NotificationSoundType,
  getCategoryPreferences,
  setCategoryPreferences,
} from "@/lib/notification-history";
import { cn } from "@/lib/utils";

const categoryConfig: {
  type: NotificationSoundType;
  icon: typeof RefreshCw;
  colorClass: string;
}[] = [
  { type: 'sync', icon: RefreshCw, colorClass: 'text-blue-500' },
  { type: 'update', icon: Bell, colorClass: 'text-green-500' },
  { type: 'info', icon: Info, colorClass: 'text-muted-foreground' },
  { type: 'error', icon: AlertTriangle, colorClass: 'text-destructive' },
];

export function NotificationCategoryPreferences() {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';
  const [prefs, setPrefs] = useState<CategoryPreferences>(getCategoryPreferences);

  useEffect(() => {
    setPrefs(getCategoryPreferences());
  }, []);

  const handleToggle = (type: NotificationSoundType, enabled: boolean) => {
    const newPrefs = { ...prefs, [type]: enabled };
    setPrefs(newPrefs);
    setCategoryPreferences(newPrefs);
  };

  return (
    <div className="space-y-4">
      <div className={isRTL ? "text-right" : ""}>
        <h3 className="text-lg font-medium">{t('notifications.categoryPreferences')}</h3>
        <p className="text-sm text-muted-foreground">
          {t('notifications.categoryPreferencesDescription')}
        </p>
      </div>

      <div className="rounded-lg border p-4 space-y-1">
        {categoryConfig.map(({ type, icon: Icon, colorClass }) => (
          <div
            key={type}
            className={cn(
              "flex items-center justify-between py-3 border-b last:border-b-0",
              isRTL && "flex-row-reverse"
            )}
          >
            <div className={cn("flex items-center gap-3", isRTL && "flex-row-reverse")}>
              <Icon className={cn("h-4 w-4", colorClass)} />
              <div className={isRTL ? "text-right" : ""}>
                <Label htmlFor={`category-${type}`} className="font-medium cursor-pointer">
                  {t(`notifications.category.${type}`)}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {t(`notifications.categoryDescription.${type}`)}
                </p>
              </div>
            </div>
            <Switch
              id={`category-${type}`}
              checked={prefs[type]}
              onCheckedChange={(checked) => handleToggle(type, checked)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
