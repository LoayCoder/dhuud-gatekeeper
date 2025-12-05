import { useState } from "react";
import { useTranslation } from "react-i18next";
import { formatDistanceToNow } from "date-fns";
import { Bell, RefreshCw, Info, AlertTriangle, Check, Settings, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group";
import { useNotificationHistory } from "@/hooks/use-notification-history";
import { NotificationHistoryItem } from "@/lib/notification-history";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

type NotificationType = 'all' | 'sync' | 'update' | 'info' | 'error';

const RTL_LANGUAGES = ['ar', 'ur'];

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
}: { 
  item: NotificationHistoryItem; 
  onMarkRead: (id: string) => void;
}) {
  const Icon = typeIcons[item.type] || Info;
  
  return (
    <div 
      className={cn(
        "flex gap-2 p-2.5 border-b last:border-b-0 transition-colors hover:bg-muted/50",
        !item.read && "bg-primary/5"
      )}
      onClick={() => !item.read && onMarkRead(item.id)}
    >
      <div className={cn("mt-0.5 shrink-0", typeColors[item.type])}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0 text-start">
        <p className={cn("text-sm truncate", !item.read && "font-medium")}>
          {item.title}
        </p>
        {item.body && (
          <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
            {item.body}
          </p>
        )}
        <p className="text-[10px] text-muted-foreground mt-1">
          {formatDistanceToNow(item.timestamp, { addSuffix: true })}
        </p>
      </div>
      {!item.read && (
        <div className="shrink-0">
          <div className="h-2 w-2 rounded-full bg-primary" />
        </div>
      )}
    </div>
  );
}

export function NotificationPopover() {
  const { t, i18n } = useTranslation();
  const isRTL = RTL_LANGUAGES.includes(i18n.language);
  const direction = isRTL ? 'rtl' : 'ltr';
  const navigate = useNavigate();
  const { history, unreadCount, markAsRead, markAllAsRead } = useNotificationHistory();
  const [filter, setFilter] = useState<NotificationType>('all');
  const [open, setOpen] = useState(false);

  const filteredHistory = filter === 'all' 
    ? history 
    : history.filter(item => item.type === filter);

  const recentNotifications = filteredHistory.slice(0, 10);

  const filterCounts = {
    all: history.length,
    sync: history.filter(h => h.type === 'sync').length,
    update: history.filter(h => h.type === 'update').length,
    info: history.filter(h => h.type === 'info').length,
    error: history.filter(h => h.type === 'error').length,
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="relative p-2 rounded-md hover:bg-sidebar-accent transition-colors group-data-[collapsible=icon]:hidden"
          title={t('notifications.title')}
        >
          <Bell className="h-5 w-5 text-muted-foreground" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -end-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium text-destructive-foreground">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-80 p-0 bg-popover" 
        align={isRTL ? "start" : "end"}
        sideOffset={8}
        dir={direction}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b">
          <h4 className="font-semibold text-sm">{t('notifications.title')}</h4>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 px-2 text-xs"
                onClick={markAllAsRead}
              >
                <Check className="h-3 w-3 me-1" />
                {t('notifications.markAllRead')}
              </Button>
            )}
          </div>
        </div>

        {/* Category Filters */}
        <div className="p-2 border-b">
          <ToggleGroup 
            type="single" 
            value={filter} 
            onValueChange={(v) => v && setFilter(v as NotificationType)}
            className="justify-start flex-wrap gap-1"
          >
            <ToggleGroupItem value="all" size="sm" className="h-7 px-2 text-xs">
              {t('common.all')} ({filterCounts.all})
            </ToggleGroupItem>
            <ToggleGroupItem value="sync" size="sm" className="h-7 px-2 text-xs">
              <RefreshCw className="h-3 w-3 me-1" />
              {filterCounts.sync}
            </ToggleGroupItem>
            <ToggleGroupItem value="update" size="sm" className="h-7 px-2 text-xs">
              <Bell className="h-3 w-3 me-1" />
              {filterCounts.update}
            </ToggleGroupItem>
            <ToggleGroupItem value="error" size="sm" className="h-7 px-2 text-xs">
              <AlertTriangle className="h-3 w-3 me-1" />
              {filterCounts.error}
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

        {/* Notifications List */}
        {recentNotifications.length > 0 ? (
          <ScrollArea className="h-[280px]">
            {recentNotifications.map((item) => (
              <NotificationItem
                key={item.id}
                item={item}
                onMarkRead={markAsRead}
              />
            ))}
          </ScrollArea>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Bell className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-sm">{t('notifications.noHistory')}</p>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between p-2 border-t bg-muted/30">
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-7 px-2 text-xs"
            onClick={() => {
              setOpen(false);
              navigate("/profile?tab=security");
            }}
          >
            <Settings className="h-3 w-3 me-1" />
            {t('notifications.soundSettings')}
          </Button>
          {history.length > 10 && (
            <Button 
              variant="link" 
              size="sm" 
              className="h-7 px-2 text-xs"
              onClick={() => {
                setOpen(false);
                navigate("/profile?tab=security");
              }}
            >
              {t('common.view')} {t('common.all')} ({history.length})
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
