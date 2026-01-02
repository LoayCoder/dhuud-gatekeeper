import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Wifi, WifiOff, RefreshCw, CloudOff, Check, Clock, Download } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { usePendingMutationsCount, replayQueuedMutations } from '@/hooks/use-offline-mutation';
import { gateOfflineCache } from '@/lib/gate-offline-cache';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

interface GateOfflineStatusBarProps {
  lastSyncTime?: Date;
  onRefresh?: () => void;
}

export function GateOfflineStatusBar({ lastSyncTime, onRefresh }: GateOfflineStatusBarProps) {
  const { t } = useTranslation();
  const { isOnline } = useNetworkStatus();
  const pendingCount = usePendingMutationsCount();
  const { toast } = useToast();
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingGateEntries, setPendingGateEntries] = useState(0);

  // Check for pending gate entries on mount
  useState(() => {
    gateOfflineCache.getPendingEntries().then(entries => {
      setPendingGateEntries(entries.length);
    });
  });

  const handleSync = async () => {
    if (!isOnline) {
      toast({
        title: t('offline.cannotSync', 'Cannot Sync'),
        description: t('offline.waitForConnection', 'Please wait for internet connection'),
        variant: 'destructive',
      });
      return;
    }

    setIsSyncing(true);
    try {
      const result = await replayQueuedMutations();
      
      if (result.success > 0) {
        toast({
          title: t('offline.syncComplete', 'Sync Complete'),
          description: t('offline.syncedEntries', '{count} entries synced successfully', { count: result.success }),
        });
      }
      
      if (result.failed > 0) {
        toast({
          title: t('offline.syncPartial', 'Partial Sync'),
          description: t('offline.syncFailed', '{count} entries failed to sync', { count: result.failed }),
          variant: 'destructive',
        });
      }

      // Refresh pending count
      const entries = await gateOfflineCache.getPendingEntries();
      setPendingGateEntries(entries.length);
      
      onRefresh?.();
    } catch (error) {
      console.error('Sync error:', error);
      toast({
        title: t('common.error', 'Error'),
        description: t('offline.syncError', 'Failed to sync data'),
        variant: 'destructive',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const totalPending = pendingCount + pendingGateEntries;

  return (
    <div 
      className={cn(
        "flex items-center justify-between gap-2 px-3 py-2 rounded-lg border text-sm transition-colors",
        isOnline 
          ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800" 
          : "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800"
      )}
    >
      {/* Status indicator */}
      <div className="flex items-center gap-2">
        {isOnline ? (
          <>
            <Wifi className="h-4 w-4 text-green-600 dark:text-green-400" />
            <span className="text-green-700 dark:text-green-300 font-medium">
              {t('offline.online', 'Online')}
            </span>
          </>
        ) : (
          <>
            <WifiOff className="h-4 w-4 text-amber-600 dark:text-amber-400 animate-pulse" />
            <span className="text-amber-700 dark:text-amber-300 font-medium">
              {t('offline.offline', 'Offline Mode')}
            </span>
          </>
        )}

        {/* Last sync time */}
        {lastSyncTime && (
          <span className="text-xs text-muted-foreground hidden sm:inline">
            <Clock className="h-3 w-3 inline me-1" />
            {t('offline.lastSync', 'Last sync')}: {formatDistanceToNow(lastSyncTime, { addSuffix: true })}
          </span>
        )}
      </div>

      {/* Pending entries and sync button */}
      <div className="flex items-center gap-2">
        {totalPending > 0 && (
          <Badge 
            variant="secondary" 
            className={cn(
              "text-xs",
              isOnline 
                ? "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200"
                : "bg-amber-200 text-amber-900 dark:bg-amber-800 dark:text-amber-100"
            )}
          >
            <CloudOff className="h-3 w-3 me-1" />
            {t('offline.pendingSync', '{count} pending', { count: totalPending })}
          </Badge>
        )}

        {isOnline && totalPending > 0 && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleSync}
            disabled={isSyncing}
            className="h-7 px-2 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/30"
          >
            <RefreshCw className={cn("h-3 w-3 me-1", isSyncing && "animate-spin")} />
            {isSyncing ? t('offline.syncing', 'Syncing...') : t('offline.syncNow', 'Sync Now')}
          </Button>
        )}

        {isOnline && totalPending === 0 && (
          <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
            <Check className="h-3 w-3 me-1" />
            {t('offline.allSynced', 'All synced')}
          </Badge>
        )}

        {!isOnline && (
          <Badge variant="outline" className="text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700">
            <Download className="h-3 w-3 me-1" />
            {t('offline.usingCached', 'Using cached data')}
          </Badge>
        )}
      </div>
    </div>
  );
}
