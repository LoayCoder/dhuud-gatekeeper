import React from 'react';
import { useTranslation } from 'react-i18next';
import { Wifi, WifiOff } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface PTWRealtimeIndicatorProps {
  isConnected: boolean;
  lastUpdate: Date | null;
  newUpdatesCount?: number;
  onClearUpdates?: () => void;
  className?: string;
}

export function PTWRealtimeIndicator({
  isConnected,
  lastUpdate,
  newUpdatesCount = 0,
  onClearUpdates,
  className,
}: PTWRealtimeIndicatorProps) {
  const { t } = useTranslation();

  const lastUpdateText = lastUpdate
    ? formatDistanceToNow(lastUpdate, { addSuffix: true })
    : null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn(
            'flex items-center gap-2 cursor-default',
            className
          )}
          onClick={onClearUpdates}
        >
          <div className="relative">
            {isConnected ? (
              <>
                <div className="absolute inset-0 animate-ping rounded-full bg-green-500/40" />
                <div className="relative flex h-2.5 w-2.5 rounded-full bg-green-500" />
              </>
            ) : (
              <div className="flex h-2.5 w-2.5 rounded-full bg-muted-foreground" />
            )}
          </div>
          <span className={cn(
            'text-xs font-medium',
            isConnected ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'
          )}>
            {isConnected ? t('ptw.realtime.live', 'Live') : t('ptw.realtime.offline', 'Offline')}
          </span>
          {newUpdatesCount > 0 && (
            <Badge variant="secondary" className="text-xs h-5 min-w-[20px] px-1.5">
              {newUpdatesCount}
            </Badge>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        <div className="flex flex-col gap-1 text-xs">
          <div className="flex items-center gap-2">
            {isConnected ? (
              <Wifi className="h-3 w-3 text-green-500" />
            ) : (
              <WifiOff className="h-3 w-3 text-muted-foreground" />
            )}
            <span>
              {isConnected
                ? t('ptw.realtime.connected', 'Receiving live updates')
                : t('ptw.realtime.disconnected', 'Not connected')}
            </span>
          </div>
          {lastUpdateText && (
            <span className="text-muted-foreground">
              {t('ptw.realtime.lastUpdate', 'Last update: {{time}}', { time: lastUpdateText })}
            </span>
          )}
          {newUpdatesCount > 0 && (
            <span className="text-primary">
              {t('ptw.realtime.newUpdates', '{{count}} new updates', { count: newUpdatesCount })}
            </span>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
