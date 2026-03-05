import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Wifi, WifiOff, RefreshCw, CloudOff, Check, Clock } from 'lucide-react';
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
  /** Compact mode shows only a status icon - useful for mobile headers */
  compact?: boolean;
}

export function GateOfflineStatusBar({ lastSyncTime, onRefresh, compact = false }: GateOfflineStatusBarProps) {
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

  // Compact mode: just a status indicator icon
  if (compact) {
    return (
      <div className="flex items-center gap-1.5">
        <span 
          className={cn(
            "relative flex h-2.5 w-2.5",
          )}
        >
          <span 
            className={cn(
              "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
              isOnline ? "bg-green-400" : "bg-amber-400"
            )}
          />
          <span 
            className={cn(
              "relative inline-flex rounded-full h-2.5 w-2.5",
              isOnline ? "bg-green-500" : "bg-amber-500"
            )}
          />
        </span>
        {totalPending > 0 && (
          <Badge variant="secondary" className="h-4 px-1 text-[9px] bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
            {totalPending}
          </Badge>
        )}
      </div>
    );
  }

  return (
    <div 
      className={cn(
        "flex flex-col xs:flex-row items-start xs:items-center justify-between gap-2 px-2.5 sm:px-3 py-2 rounded-lg border text-xs sm:text-sm transition-colors",
        isOnline 
          ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800" 
          : "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800"
      )}
    >
      {/* Status indicator */}
      <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-wrap">
        {isOnline ? (
          <>
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
            </span>
            <span className="text-green-700 dark:text-green-300 font-medium hidden sm:inline">
              {t('offline.online', 'Online')}
            </span>
          </>
        ) : (
          <>
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
            </span>
            <WifiOff className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
            <span className="text-amber-700 dark:text-amber-300 font-medium">
              {t('offline.offline', 'Offline')}
            </span>
          </>
        )}

        {/* Last sync time */}
        {lastSyncTime && (
          <span className="text-[10px] sm:text-xs text-muted-foreground hidden sm:inline-flex items-center">
            <Clock className="h-3 w-3 me-1 flex-shrink-0" />
            <span className="truncate">{formatDistanceToNow(lastSyncTime, { addSuffix: true })}</span>
          </span>
        )}
      </div>

      {/* Pending entries and sync button */}
      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap w-full xs:w-auto justify-end">
        {totalPending > 0 && (
          <Badge 
            variant="secondary" 
            className={cn(
              "text-[10px] sm:text-xs",
              isOnline 
                ? "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200"
                : "bg-amber-200 text-amber-900 dark:bg-amber-800 dark:text-amber-100"
            )}
          >
            <CloudOff className="h-3 w-3 me-1 flex-shrink-0" />
            {t('offline.pendingSync', '{count} pending', { count: totalPending })}
          </Badge>
        )}

        {isOnline && totalPending > 0 && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleSync}
            disabled={isSyncing}
            className="h-6 sm:h-7 px-2 text-[10px] sm:text-xs text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/30"
          >
            <RefreshCw className={cn("h-3 w-3 me-1", isSyncing && "animate-spin")} />
            <span className="hidden xs:inline">{isSyncing ? t('offline.syncing', 'Syncing...') : t('offline.syncNow', 'Sync Now')}</span>
            <span className="xs:hidden">{isSyncing ? '...' : t('offline.sync', 'Sync')}</span>
          </Button>
        )}

        {isOnline && totalPending === 0 && (
          <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-[10px] sm:text-xs">
            <Check className="h-3 w-3 me-1 flex-shrink-0" />
            <span className="hidden xs:inline">{t('offline.allSynced', 'All synced')}</span>
            <span className="xs:hidden">✓</span>
          </Badge>
        )}

        {!isOnline && (
          <Badge variant="outline" className="text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700 text-[10px] sm:text-xs">
            {t('offline.cached', 'Cached')}
          </Badge>
        )}
      </div>
    </div>
  );
}
