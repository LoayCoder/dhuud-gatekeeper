/**
 * Offline Area Inspection Banner
 * Shows pending changes count and sync status for area inspections
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { WifiOff, RefreshCw, CheckCircle2, CloudOff, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { usePendingAreaResponsesCount } from '@/hooks/use-offline-area-inspection';
import { syncAreaSession, clearSyncedData } from '@/lib/area-inspection-sync';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface OfflineAreaBannerProps {
  sessionId: string | undefined;
  className?: string;
}

export function OfflineAreaBanner({ sessionId, className }: OfflineAreaBannerProps) {
  const { t } = useTranslation();
  const { isOnline } = useNetworkStatus();
  const { profile } = useAuth();
  const pendingCount = usePendingAreaResponsesCount(sessionId);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<{ success: number; failed: number } | null>(null);

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline && pendingCount > 0 && sessionId && profile?.tenant_id && !isSyncing) {
      handleSync();
    }
  }, [isOnline, pendingCount, sessionId, profile?.tenant_id]);

  const handleSync = async () => {
    if (!sessionId || !profile?.tenant_id || isSyncing) return;

    setIsSyncing(true);
    setLastSyncResult(null);

    try {
      const result = await syncAreaSession(sessionId, profile.tenant_id);
      const totalSuccess = result.responses.success + result.findings.success;
      const totalFailed = result.responses.failed + result.findings.failed;

      setLastSyncResult({ success: totalSuccess, failed: totalFailed });

      if (totalFailed === 0 && totalSuccess > 0) {
        toast.success(t('offline.syncSuccess', '{{count}} changes synced successfully', { count: totalSuccess }));
        // Clean up synced data
        await clearSyncedData(sessionId);
      } else if (totalFailed > 0) {
        toast.warning(
          t('offline.syncPartial', '{{success}} synced, {{failed}} failed', {
            success: totalSuccess,
            failed: totalFailed,
          })
        );
      }
    } catch (error) {
      console.error('Sync failed:', error);
      toast.error(t('offline.syncFailed', 'Sync failed'));
    } finally {
      setIsSyncing(false);
    }
  };

  // Don't show banner if online and no pending changes
  if (isOnline && pendingCount === 0 && !lastSyncResult) return null;

  return (
    <Alert
      variant={isOnline ? (lastSyncResult?.failed ? 'destructive' : 'default') : 'destructive'}
      className={cn(
        'shadow-lg',
        isOnline && !lastSyncResult?.failed
          ? 'bg-yellow-50 border-yellow-500 dark:bg-yellow-950 dark:border-yellow-700'
          : '',
        className
      )}
    >
      <div className="flex items-center gap-3">
        {!isOnline ? (
          <WifiOff className="h-4 w-4 shrink-0" />
        ) : lastSyncResult?.failed ? (
          <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
        ) : pendingCount > 0 ? (
          <CloudOff className="h-4 w-4 shrink-0 text-yellow-600 dark:text-yellow-400" />
        ) : (
          <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600 dark:text-green-400" />
        )}

        <AlertDescription className="flex-1 text-sm">
          {!isOnline ? (
            <>
              <span className="font-medium">{t('offline.youAreOffline', 'You are offline')}</span>
              {pendingCount > 0 && (
                <span className="ms-1 text-muted-foreground">
                  ({t('offline.pendingChanges', '{{count}} pending changes', { count: pendingCount })})
                </span>
              )}
            </>
          ) : pendingCount > 0 ? (
            t('offline.pendingChanges', '{{count}} pending changes', { count: pendingCount })
          ) : lastSyncResult?.failed ? (
            t('offline.syncPartial', '{{success}} synced, {{failed}} failed', {
              success: lastSyncResult.success,
              failed: lastSyncResult.failed,
            })
          ) : (
            t('offline.syncComplete', 'All changes synced')
          )}
        </AlertDescription>

        {isOnline && (pendingCount > 0 || lastSyncResult?.failed) && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleSync}
            disabled={isSyncing}
            className="shrink-0"
          >
            {isSyncing ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <RefreshCw className="h-4 w-4 me-1" />
                {t('offline.sync', 'Sync')}
              </>
            )}
          </Button>
        )}
      </div>
    </Alert>
  );
}
