/**
 * Enhanced Offline Status Banner
 * Shows detailed sync status with pending count, auto-retry countdown, and manual sync trigger
 */

import { useTranslation } from 'react-i18next';
import { 
  WifiOff, 
  RefreshCw, 
  CheckCircle2, 
  CloudOff, 
  AlertTriangle,
  Clock,
  Loader2,
  X
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useOfflineSyncEnhanced } from '@/hooks/use-offline-sync-enhanced';
import { usePrefetchCriticalData } from '@/hooks/use-prefetch-critical-data';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';

export function OfflineStatusEnhanced() {
  const { t } = useTranslation();
  const { 
    isOnline, 
    syncProgress, 
    conflicts, 
    pendingCount,
    syncPendingMutations,
    clearAllPending,
    retryCount,
  } = useOfflineSyncEnhanced();
  
  const { isPrefetching, prefetchProgress, isSlowNetwork } = usePrefetchCriticalData();
  const [countdown, setCountdown] = useState<number | null>(null);
  const [dismissed, setDismissed] = useState(false);

  // Countdown timer for next retry
  useEffect(() => {
    if (!syncProgress.nextRetryAt) {
      setCountdown(null);
      return;
    }

    const updateCountdown = () => {
      const remaining = Math.max(0, Math.floor((syncProgress.nextRetryAt!.getTime() - Date.now()) / 1000));
      setCountdown(remaining);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [syncProgress.nextRetryAt]);

  // Reset dismissed state when status changes significantly
  useEffect(() => {
    if (!isOnline || pendingCount > 0 || conflicts.length > 0) {
      setDismissed(false);
    }
  }, [isOnline, pendingCount, conflicts.length]);

  // Don't show banner if online, no pending changes, and no conflicts
  if (dismissed || (isOnline && pendingCount === 0 && conflicts.length === 0 && !syncProgress.inProgress && !isPrefetching)) {
    return null;
  }

  const hasConflicts = conflicts.length > 0;
  const isSyncing = syncProgress.inProgress;
  const progress = syncProgress.total > 0 
    ? ((syncProgress.completed + syncProgress.failed) / syncProgress.total) * 100 
    : 0;

  return (
    <Alert 
      variant={!isOnline ? "destructive" : hasConflicts ? "destructive" : "default"} 
      className={cn(
        "fixed bottom-4 start-4 end-4 z-50 max-w-md mx-auto shadow-lg transition-all",
        !isOnline && "bg-destructive/10 border-destructive",
        isOnline && pendingCount > 0 && "bg-yellow-50 border-yellow-500 dark:bg-yellow-950",
        hasConflicts && "bg-orange-50 border-orange-500 dark:bg-orange-950",
        isPrefetching && "bg-blue-50 border-blue-500 dark:bg-blue-950"
      )}
    >
      <div className="flex flex-col gap-2">
        {/* Header row */}
        <div className="flex items-center gap-3">
          {/* Status icon */}
          {!isOnline ? (
            <WifiOff className="h-5 w-5 text-destructive shrink-0" />
          ) : isSyncing ? (
            <Loader2 className="h-5 w-5 text-primary animate-spin shrink-0" />
          ) : hasConflicts ? (
            <AlertTriangle className="h-5 w-5 text-orange-600 shrink-0" />
          ) : isPrefetching ? (
            <Loader2 className="h-5 w-5 text-blue-600 animate-spin shrink-0" />
          ) : pendingCount > 0 ? (
            <CloudOff className="h-5 w-5 text-yellow-600 shrink-0" />
          ) : (
            <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
          )}
          
          {/* Status text */}
          <AlertDescription className="flex-1 text-sm font-medium">
            {!isOnline ? (
              t('offline.youAreOffline', 'You are offline')
            ) : isSyncing ? (
              t('offline.syncing', 'Syncing changes...')
            ) : hasConflicts ? (
              t('offline.conflictsDetected', '{{count}} sync conflicts detected', { count: conflicts.length })
            ) : isPrefetching ? (
              t('offline.prefetching', 'Preparing offline data...')
            ) : pendingCount > 0 ? (
              t('offline.pendingChanges', '{{count}} pending changes', { count: pendingCount })
            ) : (
              t('offline.syncComplete', 'All changes synced')
            )}
          </AlertDescription>

          {/* Pending count badge */}
          {pendingCount > 0 && !isSyncing && (
            <Badge variant="secondary" className="shrink-0">
              {pendingCount}
            </Badge>
          )}

          {/* Dismiss button (only when synced) */}
          {isOnline && pendingCount === 0 && conflicts.length === 0 && !isSyncing && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6 shrink-0"
              onClick={() => setDismissed(true)}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Progress bar (during sync or prefetch) */}
        {(isSyncing || isPrefetching) && (
          <Progress 
            value={isPrefetching 
              ? (prefetchProgress.current / prefetchProgress.total) * 100 
              : progress
            } 
            className="h-1.5" 
          />
        )}

        {/* Slow network warning */}
        {isSlowNetwork && isOnline && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <AlertTriangle className="h-3 w-3" />
            {t('offline.slowNetwork', 'Slow network detected - caching data for offline use')}
          </div>
        )}

        {/* Retry countdown */}
        {countdown !== null && countdown > 0 && !isSyncing && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            {t('offline.retryIn', 'Retrying in {{seconds}}s (attempt {{attempt}})', { 
              seconds: countdown,
              attempt: retryCount + 1 
            })}
          </div>
        )}

        {/* Action buttons */}
        {isOnline && (pendingCount > 0 || conflicts.length > 0) && !isSyncing && (
          <div className="flex items-center gap-2 mt-1">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => syncPendingMutations()}
              disabled={isSyncing}
              className="shrink-0"
            >
              <RefreshCw className="h-4 w-4 me-1" />
              {t('offline.syncNow', 'Sync Now')}
            </Button>
            
            {pendingCount > 0 && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={clearAllPending}
                className="shrink-0 text-destructive hover:text-destructive"
              >
                {t('offline.discardAll', 'Discard All')}
              </Button>
            )}
          </div>
        )}

        {/* Sync results summary */}
        {syncProgress.lastSyncAt && !isSyncing && (syncProgress.completed > 0 || syncProgress.failed > 0) && (
          <div className="text-xs text-muted-foreground">
            {t('offline.lastSync', 'Last sync: {{completed}} synced, {{failed}} failed', {
              completed: syncProgress.completed,
              failed: syncProgress.failed,
            })}
          </div>
        )}
      </div>
    </Alert>
  );
}
