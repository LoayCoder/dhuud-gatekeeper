import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Wifi, WifiOff, RefreshCw, Smartphone, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { usePendingMutationsCount, replayQueuedMutations } from '@/hooks/use-offline-mutation';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

export function OfflineStatusBadge() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isOnline } = useNetworkStatus();
  const pendingCount = usePendingMutationsCount();
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  const handleSyncNow = async () => {
    if (!isOnline || isSyncing) return;
    
    setIsSyncing(true);
    try {
      await replayQueuedMutations();
      setLastSyncTime(new Date());
    } finally {
      setIsSyncing(false);
    }
  };

  const getLastSyncText = () => {
    if (!lastSyncTime) return null;
    const diff = Math.floor((Date.now() - lastSyncTime.getTime()) / 60000);
    if (diff < 1) return t('headerBadge.justNow', 'Just now');
    if (diff === 1) return t('headerBadge.oneMinAgo', '1 min ago');
    return t('headerBadge.minsAgo', '{{count}} mins ago', { count: diff });
  };

  const hasPendingChanges = pendingCount > 0;
  const showBadge = !isOnline || hasPendingChanges;

  if (!showBadge) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "relative h-8 w-8 sm:h-9 sm:w-9 p-0 rounded-full",
            !isOnline && "text-destructive",
            hasPendingChanges && isOnline && "text-warning"
          )}
          aria-label={
            !isOnline 
              ? t('headerBadge.offline', 'Offline') 
              : t('headerBadge.pendingChanges', '{{count}} pending changes', { count: pendingCount })
          }
        >
          {isOnline ? (
            <Wifi className="h-4 w-4" />
          ) : (
            <WifiOff className="h-4 w-4" />
          )}
          {hasPendingChanges && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -end-1 h-5 min-w-5 flex items-center justify-center p-0 text-xs"
            >
              {pendingCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-3">
        <div className="space-y-3">
          {/* Status Header */}
          <div className="flex items-center gap-2">
            {isOnline ? (
              <>
                <div className="h-2 w-2 rounded-full bg-green-500" />
                <span className="text-sm font-medium">
                  {t('headerBadge.online', 'Online')}
                </span>
              </>
            ) : (
              <>
                <div className="h-2 w-2 rounded-full bg-destructive" />
                <span className="text-sm font-medium text-destructive">
                  {t('headerBadge.offline', 'Offline')}
                </span>
              </>
            )}
          </div>

          {/* Pending Changes */}
          {hasPendingChanges ? (
            <div className="rounded-md bg-muted p-2">
              <p className="text-sm">
                {t('headerBadge.pendingChanges', '{{count}} pending changes', { count: pendingCount })}
              </p>
              {isOnline && (
                <Button
                  size="sm"
                  className="mt-2 w-full gap-2"
                  onClick={handleSyncNow}
                  disabled={isSyncing}
                >
                  {isSyncing ? (
                    <>
                      <RefreshCw className="h-3 w-3 animate-spin" />
                      {t('headerBadge.syncing', 'Syncing...')}
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-3 w-3" />
                      {t('headerBadge.syncNow', 'Sync Now')}
                    </>
                  )}
                </Button>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Check className="h-4 w-4 text-green-500" />
              {t('headerBadge.allSynced', 'All changes synced')}
            </div>
          )}

          {/* Last Sync */}
          {lastSyncTime && (
            <p className="text-xs text-muted-foreground">
              {t('headerBadge.lastSync', 'Last sync')}: {getLastSyncText()}
            </p>
          )}

          {/* Install App Link */}
          <div className="border-t pt-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
              onClick={() => navigate('/install')}
            >
              <Smartphone className="h-4 w-4" />
              {t('headerBadge.installApp', 'Install App')}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
