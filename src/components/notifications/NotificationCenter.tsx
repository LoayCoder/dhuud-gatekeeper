import React, { useState, useCallback } from 'react';
import { Bell, Check, CheckCheck, ExternalLink } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  useNotifications,
  useUnreadNotificationCount,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  useNotificationSubscription,
  Notification,
} from '@/hooks/use-notifications';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const notificationTypeIcons: Record<string, string> = {
  sla_warning: '⚠️',
  sla_escalation: '🚨',
  action_assigned: '📋',
  action_completed: '✅',
  inspection_completed: '📝',
  finding_created: '🔍',
  info: 'ℹ️',
};

const notificationTypeColors: Record<string, string> = {
  sla_warning: 'bg-warning/10 text-warning',
  sla_escalation: 'bg-destructive/10 text-destructive',
  action_assigned: 'bg-primary/10 text-primary',
  action_completed: 'bg-success/10 text-success',
  inspection_completed: 'bg-primary/10 text-primary',
  finding_created: 'bg-accent/10 text-accent-foreground',
  info: 'bg-muted text-muted-foreground',
};

export function NotificationCenter() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const isArabic = i18n.language === 'ar';

  const { data: notifications = [], isLoading } = useNotifications(30);
  const { data: unreadCount = 0 } = useUnreadNotificationCount();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  // Subscribe to real-time notifications
  useNotificationSubscription(
    useCallback((notification: Notification) => {
      const title = isArabic && notification.title_ar ? notification.title_ar : notification.title;
      toast.info(title, {
        description: isArabic && notification.body_ar ? notification.body_ar : notification.body,
      });
    }, [isArabic])
  );

  const handleNotificationClick = (notification: Notification & { displayTitle: string }) => {
    // Mark as read
    if (!notification.is_read) {
      markRead.mutate(notification.id);
    }

    // Navigate to related entity if available
    if (notification.related_entity_type && notification.related_entity_id) {
      const routes: Record<string, string> = {
        inspection_session: `/inspections/sessions/${notification.related_entity_id}`,
        finding: `/inspections/findings/${notification.related_entity_id}`,
        corrective_action: `/actions/${notification.related_entity_id}`,
        incident: `/incidents/${notification.related_entity_id}`,
      };
      const route = routes[notification.related_entity_type];
      if (route) {
        navigate(route);
        setIsOpen(false);
      }
    }
  };

  const handleMarkAllRead = () => {
    markAllRead.mutate();
  };

  const formatTime = (dateString: string) => {
    return formatDistanceToNow(new Date(dateString), {
      addSuffix: true,
      locale: isArabic ? ar : enUS,
    });
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -end-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
          <span className="sr-only">{t('notifications.title', 'Notifications')}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h4 className="font-semibold">{t('notifications.title', 'Notifications')}</h4>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllRead}
              disabled={markAllRead.isPending}
              className="text-xs"
            >
              <CheckCheck className="h-4 w-4 me-1" />
              {t('notifications.markAllRead', 'Mark all read')}
            </Button>
          )}
        </div>
        <ScrollArea className="h-[400px]">
          {isLoading ? (
            <div className="p-4 text-center text-muted-foreground">
              {t('common.loading', 'Loading...')}
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>{t('notifications.empty', 'No notifications')}</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <button
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={cn(
                    'w-full text-start p-4 hover:bg-muted/50 transition-colors',
                    !notification.is_read && 'bg-primary/5'
                  )}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-lg flex-shrink-0">
                      {notificationTypeIcons[notification.type] || '📌'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={cn(
                          'text-sm font-medium truncate',
                          !notification.is_read && 'font-semibold'
                        )}>
                          {notification.displayTitle}
                        </p>
                        {!notification.is_read && (
                          <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                        )}
                      </div>
                      {notification.displayBody && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                          {notification.displayBody}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <span className={cn(
                          'text-xs px-2 py-0.5 rounded-full',
                          notificationTypeColors[notification.type] || 'bg-muted'
                        )}>
                          {t(`notifications.types.${notification.type}`, notification.type)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatTime(notification.created_at)}
                        </span>
                      </div>
                    </div>
                    {notification.related_entity_id && (
                      <ExternalLink className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
        {notifications.length > 0 && (
          <>
            <Separator />
            <div className="p-2">
              <Button
                variant="ghost"
                className="w-full text-sm"
                onClick={() => {
                  navigate('/settings/notifications');
                  setIsOpen(false);
                }}
              >
                {t('notifications.viewAll', 'View all notifications')}
              </Button>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
