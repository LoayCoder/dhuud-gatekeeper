import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Wifi, WifiOff, Cloud, CloudOff, RefreshCw } from 'lucide-react';
import { useOfflinePatrolQueue } from '@/hooks/use-offline-patrol-queue';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export function OfflinePatrolIndicator() {
  const { t } = useTranslation();
  const { isOnline, pendingCount, failedCount, isSyncing, syncQueue, retryFailed } = useOfflinePatrolQueue();

  if (isOnline && pendingCount === 0 && failedCount === 0) {
    return (
      <Badge variant="outline" className="gap-1">
        <Wifi className="h-3 w-3 text-green-500" />
        {t('security.patrol.online', 'Online')}
      </Badge>
    );
  }

  return (
    <TooltipProvider>
      <div className="flex items-center gap-2">
        {/* Connection Status */}
        <Badge variant={isOnline ? 'outline' : 'destructive'} className="gap-1">
          {isOnline ? (
            <Wifi className="h-3 w-3 text-green-500" />
          ) : (
            <WifiOff className="h-3 w-3" />
          )}
          {isOnline 
            ? t('security.patrol.online', 'Online') 
            : t('security.patrol.offline', 'Offline')
          }
        </Badge>

        {/* Pending Sync */}
        {pendingCount > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="secondary" className="gap-1">
                <CloudOff className="h-3 w-3" />
                {pendingCount} {t('security.patrol.pending', 'pending')}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              {t('security.patrol.pendingDesc', '{{count}} checkpoint(s) waiting to sync', { count: pendingCount })}
            </TooltipContent>
          </Tooltip>
        )}

        {/* Failed Sync */}
        {failedCount > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="destructive" className="gap-1">
                {failedCount} {t('security.patrol.failed', 'failed')}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              {t('security.patrol.failedDesc', '{{count}} checkpoint(s) failed to sync', { count: failedCount })}
            </TooltipContent>
          </Tooltip>
        )}

        {/* Sync Actions */}
        {isOnline && (pendingCount > 0 || failedCount > 0) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={failedCount > 0 ? retryFailed : syncQueue}
            disabled={isSyncing}
          >
            <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
          </Button>
        )}

        {/* Syncing Indicator */}
        {isSyncing && (
          <Badge variant="outline" className="gap-1">
            <Cloud className="h-3 w-3 animate-pulse" />
            {t('security.patrol.syncing', 'Syncing...')}
          </Badge>
        )}
      </div>
    </TooltipProvider>
  );
}
