import { useState } from "react";
import { useTranslation } from "react-i18next";
import { formatDistanceToNow } from "date-fns";
import { Bell, RefreshCw, Info, AlertTriangle, Check, Trash2, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useNotificationHistory } from "@/hooks/use-notification-history";
import { NotificationHistoryItem } from "@/lib/notification-history";
import { cn } from "@/lib/utils";

type NotificationType = 'all' | 'sync' | 'update' | 'info' | 'error';

const typeIcons = {
  sync: RefreshCw,
  update: Bell,
  info: Info,
  error: AlertTriangle,
};

const typeColors = {
  sync: "text-blue-500",
  update: "text-green-500",
  info: "text-muted-foreground",
  error: "text-destructive",
};

function NotificationItem({ 
  item, 
  onMarkRead,
  isRTL 
}: { 
  item: NotificationHistoryItem; 
  onMarkRead: (id: string) => void;
  isRTL: boolean;
}) {
  const Icon = typeIcons[item.type] || Info;
  
  return (
    <div 
      className={cn(
        "flex gap-3 p-3 border-b last:border-b-0 transition-colors",
        !item.read && "bg-muted/50",
        isRTL && "flex-row-reverse"
      )}
    >
      <div className={cn("mt-0.5", typeColors[item.type])}>
        <Icon className="h-4 w-4" />
      </div>
      <div className={cn("flex-1 min-w-0", isRTL && "text-right")}>
        <div className={cn("flex items-center gap-2", isRTL && "flex-row-reverse justify-end")}>
          <p className={cn("font-medium text-sm truncate", !item.read && "font-semibold")}>
            {item.title}
          </p>
          {!item.read && (
            <Badge variant="secondary" className="h-5 px-1.5 text-xs">
              New
            </Badge>
          )}
        </div>
        {item.body && (
          <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">
            {item.body}
          </p>
        )}
        <p className="text-xs text-muted-foreground mt-1">
          {formatDistanceToNow(item.timestamp, { addSuffix: true })}
        </p>
      </div>
      {!item.read && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={() => onMarkRead(item.id)}
        >
          <Check className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

export function NotificationHistory() {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';
  const { history, unreadCount, markAsRead, markAllAsRead, clearHistory } = useNotificationHistory();
  const [filter, setFilter] = useState<NotificationType>('all');

  const filteredHistory = filter === 'all' 
    ? history 
    : history.filter(item => item.type === filter);

  const filterCounts = {
    all: history.length,
    sync: history.filter(h => h.type === 'sync').length,
    update: history.filter(h => h.type === 'update').length,
    info: history.filter(h => h.type === 'info').length,
    error: history.filter(h => h.type === 'error').length,
  };

  return (
    <div className="space-y-4">
      <div className={cn("flex items-center justify-between", isRTL && "flex-row-reverse")}>
        <div className={isRTL ? "text-right" : ""}>
          <h3 className="text-lg font-medium">{t('notifications.history')}</h3>
          <p className="text-sm text-muted-foreground">
            {t('notifications.historyDescription')}
          </p>
        </div>
        {unreadCount > 0 && (
          <Badge variant="default" className="h-6">
            {unreadCount} {t('notifications.unread')}
          </Badge>
        )}
      </div>

      {/* Category Filters */}
      <div className="flex flex-wrap gap-2">
        <ToggleGroup 
          type="single" 
          value={filter} 
          onValueChange={(v) => v && setFilter(v as NotificationType)}
          className="justify-start flex-wrap"
        >
          <ToggleGroupItem value="all" size="sm" className="gap-1">
            {t('common.all')}
            <Badge variant="secondary" className="h-5 px-1.5 text-xs">
              {filterCounts.all}
            </Badge>
          </ToggleGroupItem>
          <ToggleGroupItem value="sync" size="sm" className="gap-1">
            <RefreshCw className="h-3.5 w-3.5" />
            {t('notifications.soundType.sync')}
            <Badge variant="secondary" className="h-5 px-1.5 text-xs">
              {filterCounts.sync}
            </Badge>
          </ToggleGroupItem>
          <ToggleGroupItem value="update" size="sm" className="gap-1">
            <Bell className="h-3.5 w-3.5" />
            {t('notifications.soundType.update')}
            <Badge variant="secondary" className="h-5 px-1.5 text-xs">
              {filterCounts.update}
            </Badge>
          </ToggleGroupItem>
          <ToggleGroupItem value="info" size="sm" className="gap-1">
            <Info className="h-3.5 w-3.5" />
            {t('notifications.soundType.info')}
            <Badge variant="secondary" className="h-5 px-1.5 text-xs">
              {filterCounts.info}
            </Badge>
          </ToggleGroupItem>
          <ToggleGroupItem value="error" size="sm" className="gap-1">
            <AlertTriangle className="h-3.5 w-3.5" />
            {t('notifications.soundType.error')}
            <Badge variant="secondary" className="h-5 px-1.5 text-xs">
              {filterCounts.error}
            </Badge>
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      <div className="rounded-lg border">
        {/* Actions bar */}
        {history.length > 0 && (
          <div className={cn(
            "flex items-center justify-between p-2 border-b bg-muted/30",
            isRTL && "flex-row-reverse"
          )}>
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              disabled={unreadCount === 0}
              className={cn("gap-2", isRTL && "flex-row-reverse")}
            >
              <CheckCheck className="h-4 w-4" />
              {t('notifications.markAllRead')}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearHistory}
              className={cn("gap-2 text-destructive hover:text-destructive", isRTL && "flex-row-reverse")}
            >
              <Trash2 className="h-4 w-4" />
              {t('notifications.clearHistory')}
            </Button>
          </div>
        )}

        {/* Notification list */}
        {filteredHistory.length > 0 ? (
          <ScrollArea className="h-[300px]">
            {filteredHistory.map((item) => (
              <NotificationItem
                key={item.id}
                item={item}
                onMarkRead={markAsRead}
                isRTL={isRTL}
              />
            ))}
          </ScrollArea>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Bell className="h-10 w-10 mb-3 opacity-50" />
            <p className="text-sm">{t('notifications.noHistory')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
