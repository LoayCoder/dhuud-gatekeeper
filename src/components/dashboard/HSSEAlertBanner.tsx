import { useTranslation } from 'react-i18next';
import { AlertTriangle, Bell, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useHSSENotificationsUser, HSSENotification } from '@/hooks/use-hsse-notifications';
import { cn } from '@/lib/utils';
import { useState } from 'react';

export function HSSEAlertBanner() {
  const { t } = useTranslation();
  const { pendingMandatory, pendingMandatoryCount, getLocalizedTitle } = useHSSENotificationsUser();
  const [dismissed, setDismissed] = useState(false);

  // Don't show if no pending mandatory or dismissed
  if (pendingMandatoryCount === 0 || dismissed) {
    return null;
  }

  // Get the highest priority notification to show
  const priorityOrder = ['critical', 'high', 'medium', 'low'];
  const sortedNotifications = [...(pendingMandatory || [])].sort((a, b) => {
    return priorityOrder.indexOf((a as HSSENotification).priority) - priorityOrder.indexOf((b as HSSENotification).priority);
  });
  
  const topNotification = sortedNotifications[0] as HSSENotification | undefined;
  const isCritical = topNotification?.priority === 'critical';

  return (
    <div 
      className={cn(
        "flex items-center justify-between gap-4 px-4 py-3 rounded-lg border animate-in slide-in-from-top-2",
        isCritical 
          ? 'bg-destructive/10 border-destructive/30 text-destructive' 
          : 'bg-warning/10 border-warning/30 text-warning-foreground'
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className={cn(
          "p-2 rounded-full shrink-0",
          isCritical ? 'bg-destructive/20' : 'bg-warning/20'
        )}>
          {isCritical ? (
            <AlertTriangle className="h-5 w-5" />
          ) : (
            <Bell className="h-5 w-5" />
          )}
        </div>
        
        <div className="min-w-0">
          <p className="font-semibold text-sm">
            {pendingMandatoryCount === 1 
              ? t('hsseNotifications.onePending')
              : t('hsseNotifications.multiplePending', { count: pendingMandatoryCount })
            }
          </p>
          {topNotification && (
            <p className="text-xs opacity-80 truncate">
              {getLocalizedTitle(topNotification)}
            </p>
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-2 shrink-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setDismissed(true)}
          className="h-8 px-2 opacity-70 hover:opacity-100"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
