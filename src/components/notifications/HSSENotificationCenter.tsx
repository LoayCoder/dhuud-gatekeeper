import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Bell, CloudSun, Gavel, ShieldAlert, BookOpen, GraduationCap, CheckCircle2, AlertTriangle, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { useHSSENotificationsUser, HSSENotification } from '@/hooks/use-hsse-notifications';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';

const CATEGORY_ICONS = {
  weather_risk: CloudSun,
  regulation: Gavel,
  safety_alert: ShieldAlert,
  policy_update: BookOpen,
  training: GraduationCap,
  general: Bell,
};

const PRIORITY_COLORS = {
  critical: 'border-s-destructive',
  high: 'border-s-orange-500',
  medium: 'border-s-yellow-500',
  low: 'border-s-muted',
};

interface NotificationItemProps {
  notification: HSSENotification;
  isRead: boolean;
  isAcknowledged: boolean;
  getLocalizedTitle: (n: HSSENotification) => string;
  getLocalizedBody: (n: HSSENotification) => string;
  onAcknowledge: (id: string) => void;
  onMarkRead: (id: string) => void;
  isAcknowledging: boolean;
}

function NotificationItem({
  notification,
  isRead,
  isAcknowledged,
  getLocalizedTitle,
  getLocalizedBody,
  onAcknowledge,
  onMarkRead,
  isAcknowledging,
}: NotificationItemProps) {
  const { t, i18n } = useTranslation();
  const CategoryIcon = CATEGORY_ICONS[notification.category] || Bell;
  const locale = i18n.language === 'ar' ? ar : enUS;

  const publishedAt = notification.published_at 
    ? formatDistanceToNow(new Date(notification.published_at), { addSuffix: true, locale })
    : '';

  const isMandatory = notification.notification_type === 'mandatory';
  const isHandled = isMandatory ? isAcknowledged : isRead;

  return (
    <div 
      className={cn(
        "p-3 border-s-4 rounded-md transition-colors",
        PRIORITY_COLORS[notification.priority],
        isHandled ? 'bg-muted/30' : 'bg-card hover:bg-accent/50'
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn(
          "p-1.5 rounded-full shrink-0",
          notification.priority === 'critical' ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground'
        )}>
          <CategoryIcon className="h-4 w-4" />
        </div>
        
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            {isMandatory && !isAcknowledged && (
              <Badge variant="destructive" className="text-xs shrink-0">
                {t('hsseNotifications.mandatory')}
              </Badge>
            )}
            {isHandled && (
              <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
            )}
            <span className="text-xs text-muted-foreground">{publishedAt}</span>
          </div>
          
          <h4 className={cn(
            "font-medium text-sm line-clamp-1",
            isHandled && 'text-muted-foreground'
          )}>
            {getLocalizedTitle(notification)}
          </h4>
          
          <p className="text-xs text-muted-foreground line-clamp-2">
            {getLocalizedBody(notification)}
          </p>
          
          {!isHandled && (
            <div className="pt-2">
              {isMandatory ? (
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => onAcknowledge(notification.id)}
                  disabled={isAcknowledging}
                  className="h-7 text-xs"
                >
                  <CheckCircle2 className="h-3 w-3 me-1" />
                  {t('hsseNotifications.acknowledge')}
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onMarkRead(notification.id)}
                  className="h-7 text-xs"
                >
                  <Eye className="h-3 w-3 me-1" />
                  {t('hsseNotifications.markRead')}
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function HSSENotificationCenter() {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'mandatory' | 'read'>('all');
  
  const {
    notifications,
    isLoading,
    unreadCount,
    pendingMandatoryCount,
    acknowledgeNotification,
    markAsRead,
    isAcknowledged,
    isRead,
    getLocalizedTitle,
    getLocalizedBody,
  } = useHSSENotificationsUser();

  const [acknowledgingId, setAcknowledgingId] = useState<string | null>(null);

  const handleAcknowledge = async (id: string) => {
    setAcknowledgingId(id);
    try {
      await acknowledgeNotification.mutateAsync(id);
    } finally {
      setAcknowledgingId(null);
    }
  };

  const handleMarkRead = (id: string) => {
    markAsRead.mutate(id);
  };

  // Filter notifications based on active tab
  const filteredNotifications = notifications?.filter(n => {
    const handled = n.notification_type === 'mandatory' ? isAcknowledged(n.id) : isRead(n.id);
    
    if (activeTab === 'mandatory') {
      return n.notification_type === 'mandatory' && !isAcknowledged(n.id);
    }
    if (activeTab === 'read') {
      return handled;
    }
    return true;
  }) ?? [];

  const totalBadge = pendingMandatoryCount > 0 ? pendingMandatoryCount : unreadCount;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {totalBadge > 0 && (
            <Badge 
              variant={pendingMandatoryCount > 0 ? "destructive" : "secondary"}
              className="absolute -top-1 -end-1 h-5 min-w-5 px-1 text-xs"
            >
              {totalBadge > 99 ? '99+' : totalBadge}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      
      <PopoverContent 
        className="w-[calc(100vw-1rem)] sm:w-96 max-w-96 p-0" 
        align="end"
        sideOffset={8}
      >
        <div className="p-4 pb-2">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-lg">
              {t('hsseNotifications.title')}
            </h3>
            {pendingMandatoryCount > 0 && (
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="h-3 w-3" />
                {pendingMandatoryCount} {t('hsseNotifications.pendingAck')}
              </Badge>
            )}
          </div>
        </div>
        
        <Separator />
        
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
          <TabsList className="w-full rounded-none border-b bg-transparent h-10">
            <TabsTrigger value="all" className="flex-1 text-xs">
              {t('hsseNotifications.all')}
            </TabsTrigger>
            <TabsTrigger value="mandatory" className="flex-1 text-xs relative">
              {t('hsseNotifications.mandatoryTab')}
              {pendingMandatoryCount > 0 && (
                <span className="absolute -top-0.5 -end-0.5 h-2 w-2 rounded-full bg-destructive" />
              )}
            </TabsTrigger>
            <TabsTrigger value="read" className="flex-1 text-xs">
              {t('hsseNotifications.readTab')}
            </TabsTrigger>
          </TabsList>
          
          <ScrollArea className="h-[400px]">
            <div className="p-2 space-y-2">
              {isLoading ? (
                <div className="flex items-center justify-center py-8 text-muted-foreground">
                  {t('common.loading')}
                </div>
              ) : filteredNotifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <Bell className="h-8 w-8 mb-2 opacity-50" />
                  <p className="text-sm">{t('hsseNotifications.noNotifications')}</p>
                </div>
              ) : (
                filteredNotifications.map(notification => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    isRead={isRead(notification.id)}
                    isAcknowledged={isAcknowledged(notification.id)}
                    getLocalizedTitle={getLocalizedTitle}
                    getLocalizedBody={getLocalizedBody}
                    onAcknowledge={handleAcknowledge}
                    onMarkRead={handleMarkRead}
                    isAcknowledging={acknowledgingId === notification.id}
                  />
                ))
              )}
            </div>
          </ScrollArea>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}
