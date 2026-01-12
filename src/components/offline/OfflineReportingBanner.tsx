/**
 * Offline Reporting Banner Component
 * Displays network status, pending reports count, and sync controls
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { useOfflineReportQueue } from '@/hooks/use-offline-report-queue';
import { useOfflineReporting } from '@/hooks/use-offline-reporting';
import { syncOfflineReports } from '@/lib/offline-report-sync';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  WifiOff,
  Wifi,
  CloudOff,
  Cloud,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Clock,
  Loader2,
  Database,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface OfflineReportingBannerProps {
  className?: string;
  compact?: boolean;
}

export function OfflineReportingBanner({ 
  className,
  compact = false,
}: OfflineReportingBannerProps) {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  const { isOnline, wasOffline } = useNetworkStatus();
  const { pendingCount, refreshQueue } = useOfflineReportQueue();
  const { isCacheReady, isLoading: isCachingData, prefetchReportingData, lastCachedAt } = useOfflineReporting();
  
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline && wasOffline && pendingCount > 0) {
      handleSync();
    }
  }, [isOnline, wasOffline, pendingCount]);

  // Refresh cache when coming online
  useEffect(() => {
    if (isOnline && wasOffline) {
      prefetchReportingData();
    }
  }, [isOnline, wasOffline, prefetchReportingData]);

  const handleSync = async () => {
    if (isSyncing || !isOnline || pendingCount === 0) return;

    setIsSyncing(true);
    setSyncProgress(10);

    try {
      const result = await syncOfflineReports();
      setSyncProgress(100);

      if (result.success > 0) {
        toast.success(t('offline.syncComplete'), {
          description: t('offline.reportsSynced', { count: result.success }),
        });
      }

      if (result.failed > 0) {
        toast.error(t('offline.syncPartialFailed'), {
          description: t('offline.reportsFailed', { count: result.failed }),
        });
      }

      await refreshQueue();
    } catch (err) {
      console.error('[OfflineBanner] Sync failed:', err);
      toast.error(t('offline.syncFailed'));
    } finally {
      setIsSyncing(false);
      setSyncProgress(0);
    }
  };

  const handleRefreshCache = async () => {
    await prefetchReportingData(true);
    toast.success(t('offline.cacheRefreshed'));
  };

  // Format last cached time
  const formatCachedTime = () => {
    if (!lastCachedAt) return null;
    const diff = Date.now() - lastCachedAt;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    
    if (hours > 0) {
      return t('offline.cachedHoursAgo', { hours });
    }
    if (minutes > 0) {
      return t('offline.cachedMinutesAgo', { minutes });
    }
    return t('offline.cachedJustNow');
  };

  // Don't show if online and no pending reports and not caching
  if (isOnline && pendingCount === 0 && !isCachingData && !wasOffline) {
    return null;
  }

  if (compact) {
    return (
      <div 
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-lg text-sm",
          !isOnline && "bg-warning/10 text-warning border border-warning/20",
          isOnline && pendingCount > 0 && "bg-primary/10 text-primary border border-primary/20",
          className
        )}
        dir={direction}
      >
        {!isOnline ? (
          <>
            <WifiOff className="h-4 w-4 shrink-0" />
            <span>{t('offline.offlineMode')}</span>
            {pendingCount > 0 && (
              <Badge variant="secondary" className="ms-auto">
                {pendingCount}
              </Badge>
            )}
          </>
        ) : pendingCount > 0 ? (
          <>
            <CloudOff className="h-4 w-4 shrink-0" />
            <span>{t('offline.pendingSync', { count: pendingCount })}</span>
            <Button 
              size="sm" 
              variant="ghost" 
              className="ms-auto h-7 px-2"
              onClick={handleSync}
              disabled={isSyncing}
            >
              {isSyncing ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <RefreshCw className="h-3 w-3" />
              )}
            </Button>
          </>
        ) : null}
      </div>
    );
  }

  return (
    <div 
      className={cn(
        "rounded-lg border p-4 space-y-3",
        !isOnline && "bg-warning/5 border-warning/30",
        isOnline && pendingCount > 0 && "bg-primary/5 border-primary/30",
        isOnline && pendingCount === 0 && "bg-success/5 border-success/30",
        className
      )}
      dir={direction}
    >
      {/* Network Status Row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {!isOnline ? (
            <div className="flex items-center gap-2 text-warning">
              <WifiOff className="h-5 w-5" />
              <span className="font-medium">{t('offline.offlineMode')}</span>
            </div>
          ) : pendingCount > 0 ? (
            <div className="flex items-center gap-2 text-primary">
              <Cloud className="h-5 w-5" />
              <span className="font-medium">{t('offline.readyToSync')}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-success">
              <Wifi className="h-5 w-5" />
              <span className="font-medium">{t('offline.connected')}</span>
            </div>
          )}
        </div>

        {/* Cache Status */}
        {isCacheReady && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Database className="h-3 w-3" />
            <span>{formatCachedTime()}</span>
            {isOnline && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-6 px-2"
                onClick={handleRefreshCache}
                disabled={isCachingData}
              >
                {isCachingData ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <RefreshCw className="h-3 w-3" />
                )}
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Pending Reports */}
      {pendingCount > 0 && (
        <div className="flex items-center justify-between bg-background/50 rounded-lg p-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-warning/10 flex items-center justify-center">
              <Clock className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="font-medium">{t('offline.pendingReports', { count: pendingCount })}</p>
              <p className="text-sm text-muted-foreground">
                {isOnline 
                  ? t('offline.clickToSync')
                  : t('offline.willSyncAutomatically')}
              </p>
            </div>
          </div>
          
          {isOnline && (
            <Button
              onClick={handleSync}
              disabled={isSyncing}
              size="sm"
              className="gap-2"
            >
              {isSyncing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t('offline.syncing')}
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  {t('offline.syncNow')}
                </>
              )}
            </Button>
          )}
        </div>
      )}

      {/* Sync Progress */}
      {isSyncing && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>{t('offline.syncingProgress')}</span>
            <span>{syncProgress}%</span>
          </div>
          <Progress value={syncProgress} className="h-2" />
        </div>
      )}

      {/* Offline Instructions */}
      {!isOnline && (
        <div className="flex items-start gap-2 p-3 bg-background/50 rounded-lg text-sm text-muted-foreground">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <div>
            <p>{t('offline.offlineInstructions')}</p>
            {isCacheReady && (
              <p className="text-success mt-1 flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                {t('offline.offlineReady')}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Caching Progress */}
      {isCachingData && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>{t('offline.preparingOfflineMode')}</span>
        </div>
      )}
    </div>
  );
}
