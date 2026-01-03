import { useTranslation } from 'react-i18next';
import { AlertTriangle, Bell, Info, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useHSSENotificationsUser, HSSENotification } from '@/hooks/use-hsse-notifications';
import { cn } from '@/lib/utils';
import { useState } from 'react';

export function HSSEAlertBanner() {
  const { t } = useTranslation();
  const { notifications, pendingMandatory, pendingMandatoryCount, unreadCount, getLocalizedTitle, isRead, isAcknowledged } = useHSSENotificationsUser();
  const [dismissed, setDismissed] = useState(false);

  // Get all unread notifications (both mandatory and informational)
  const unreadNotifications = notifications?.filter(n => !isRead(n.id) && !isAcknowledged(n.id)) || [];
  const totalUnread = unreadNotifications.length;

  // Don't show if no unread notifications or dismissed
  if (totalUnread === 0 || dismissed) {
    return null;
  }

  // Get the highest priority notification to show
  const priorityOrder = ['critical', 'high', 'medium', 'low'];
  const sortedNotifications = [...unreadNotifications].sort((a, b) => {
    // Mandatory notifications first, then by priority
    if (a.notification_type !== b.notification_type) {
      return a.notification_type === 'mandatory' ? -1 : 1;
    }
    return priorityOrder.indexOf(a.priority) - priorityOrder.indexOf(b.priority);
  });
  
  const topNotification = sortedNotifications[0];
  const isCritical = topNotification?.priority === 'critical';
  const isMandatory = topNotification?.notification_type === 'mandatory';

  // Determine the banner style based on notification type and priority
  const getBannerStyle = () => {
    if (isCritical) {
      return 'bg-destructive/10 border-destructive/30 text-destructive';
    }
    if (isMandatory) {
      return 'bg-warning/10 border-warning/30 text-warning-foreground';
    }
    // Informational notifications
    return 'bg-primary/10 border-primary/30 text-primary';
  };

  const getIconBgStyle = () => {
    if (isCritical) return 'bg-destructive/20';
    if (isMandatory) return 'bg-warning/20';
    return 'bg-primary/20';
  };

  const getIcon = () => {
    if (isCritical) return <AlertTriangle className="h-5 w-5" />;
    if (isMandatory) return <Bell className="h-5 w-5" />;
    return <Info className="h-5 w-5" />;
  };

  // Build the message based on notification counts
  const getMessage = () => {
    if (pendingMandatoryCount > 0) {
      // Show mandatory count first
      if (pendingMandatoryCount === 1) {
        return t('hsseNotifications.onePending');
      }
      return t('hsseNotifications.multiplePending', { count: pendingMandatoryCount });
    }
    // Only informational notifications
    if (totalUnread === 1) {
      return t('hsseNotifications.oneNewNotification', { defaultValue: 'You have a new HSSE notification' });
    }
    return t('hsseNotifications.multipleNewNotifications', { count: totalUnread, defaultValue: `You have ${totalUnread} new HSSE notifications` });
  };

  return (
    <div 
      className={cn(
        "flex items-center justify-between gap-4 px-4 py-3 rounded-lg border animate-in slide-in-from-top-2",
        getBannerStyle()
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className={cn("p-2 rounded-full shrink-0", getIconBgStyle())}>
          {getIcon()}
        </div>
        
        <div className="min-w-0">
          <p className="font-semibold text-sm">
            {getMessage()}
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
