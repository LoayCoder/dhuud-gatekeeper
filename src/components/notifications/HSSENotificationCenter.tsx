import { Bell, AlertTriangle, Shield, CloudRain, BookOpen, FileText, Info, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatDistanceToNow } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useHSSENotificationsUser } from '@/features/incidents/hooks/use-hsse-notifications';
import type { HSSENotification } from '@/features/incidents/hooks/use-hsse-notifications';

const PRIORITY_STYLES: Record<string, string> = {
  critical: 'text-destructive',
  high: 'text-destructive',
  medium: 'text-warning',
  low: 'text-muted-foreground',
};

const CATEGORY_ICONS: Record<string, typeof Bell> = {
  weather_risk: CloudRain,
  regulation: FileText,
  safety_alert: AlertTriangle,
  policy_update: Shield,
  training: BookOpen,
  general: Info,
};

export function HSSENotificationCenter() {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  const {
    notifications,
    isLoading,
    unreadCount,
    markAsRead,
    isRead,
    isAcknowledged,
    getLocalizedTitle,
    getLocalizedBody,
  } = useHSSENotificationsUser();

  const handleMarkAllRead = () => {
    notifications?.forEach((n) => {
      if (!isRead(n.id) && !isAcknowledged(n.id)) {
        markAsRead.mutate(n.id);
      }
    });
  };

  const handleItemClick = (notification: HSSENotification) => {
    if (!isRead(notification.id)) {
      markAsRead.mutate(notification.id);
    }
  };

  const displayNotifications = (notifications || []).slice(0, 20);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9 min-h-[44px] min-w-[44px] rounded-lg"
          aria-label={t('hsseNotifications.title', 'Notifications')}
        >
          <Bell className="h-5 w-5 text-muted-foreground" />
          {unreadCount > 0 && (
            <span className="absolute top-1 end-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[340px] sm:w-[380px] p-0"
        align="end"
        sideOffset={8}
        dir={direction}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="text-sm font-semibold">
            {t('hsseNotifications.title', 'Notifications')}
          </h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-primary"
              onClick={handleMarkAllRead}
            >
              <Check className="h-3 w-3 me-1" />
              {t('notifications.markAllRead', 'Mark all as read')}
            </Button>
          )}
        </div>

        {/* Notification List */}
        <ScrollArea className="max-h-[360px]">
          {isLoading ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              {t('common.loading', 'Loading...')}
            </div>
          ) : displayNotifications.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">
                {t('notifications.noHistory', 'No notifications yet')}
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {displayNotifications.map((notification) => {
                const read = isRead(notification.id) || isAcknowledged(notification.id);
                const CategoryIcon = CATEGORY_ICONS[notification.category] || Info;
                const timeAgo = formatDistanceToNow(new Date(notification.published_at || notification.created_at), {
                  addSuffix: true,
                  locale: i18n.language === 'ar' ? ar : enUS,
                });

                return (
                  <button
                    key={notification.id}
                    className={cn(
                      'w-full flex items-start gap-3 px-4 py-3 text-start transition-colors hover:bg-muted/50',
                      'min-h-[44px] cursor-pointer',
                      !read && 'bg-primary/5',
                    )}
                    onClick={() => handleItemClick(notification)}
                  >
                    {/* Priority dot + category icon */}
                    <div className="relative flex-shrink-0 mt-0.5">
                      <CategoryIcon
                        className={cn('h-4 w-4', PRIORITY_STYLES[notification.priority] || 'text-muted-foreground')}
                      />
                      {!read && (
                        <span className="absolute -top-0.5 -end-0.5 h-2 w-2 rounded-full bg-primary" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <p className={cn('text-sm leading-tight line-clamp-2', !read && 'font-semibold')}>
                          {getLocalizedTitle(notification)}
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-1 mb-1">
                        {getLocalizedBody(notification)}
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground">{timeAgo}</span>
                        {notification.notification_type === 'mandatory' && (
                          <Badge variant="destructive" className="text-[9px] h-4 px-1">
                            {t('hsseNotifications.mandatory', 'Mandatory')}
                          </Badge>
                        )}
                        <Badge variant="outline" className={cn('text-[9px] h-4 px-1', PRIORITY_STYLES[notification.priority])}>
                          {t(`hsseNotifications.priorities.${notification.priority}`, notification.priority)}
                        </Badge>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
