import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { Radio, WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface SecurityRealtimeIndicatorProps {
  isConnected: boolean;
  lastEventTime: Date | null;
  newEventCount?: number;
  className?: string;
}

export function SecurityRealtimeIndicator({
  isConnected,
  lastEventTime,
  newEventCount = 0,
  className,
}: SecurityRealtimeIndicatorProps) {
  const { t } = useTranslation();

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn("flex items-center gap-2", className)}>
            {isConnected ? (
              <>
                <Radio className="h-4 w-4 text-green-500 animate-pulse" />
                <span className="text-sm text-green-600 dark:text-green-400 font-medium">
                  {t('security.dashboard.live', 'Live')}
                </span>
              </>
            ) : (
              <>
                <WifiOff className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {t('security.dashboard.offline', 'Offline')}
                </span>
              </>
            )}
            {newEventCount > 0 && (
              <Badge variant="destructive" className="text-xs px-1.5 h-5 min-w-[20px] justify-center">
                {newEventCount}
              </Badge>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" align="end">
          <div className="text-xs space-y-1">
            <p>
              {isConnected 
                ? t('security.dashboard.realtimeConnected', 'Real-time updates active')
                : t('security.dashboard.realtimeDisconnected', 'Connection lost, attempting to reconnect...')
              }
            </p>
            {lastEventTime && (
              <p className="text-muted-foreground">
                {t('security.dashboard.lastUpdate', 'Last update')}: {formatDistanceToNow(lastEventTime, { addSuffix: true })}
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
