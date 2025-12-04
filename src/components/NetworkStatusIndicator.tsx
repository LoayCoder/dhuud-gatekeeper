import { useState } from 'react';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { usePendingMutationsCount, replayQueuedMutations } from '@/hooks/use-offline-mutation';
import { Wifi, WifiOff, CloudOff, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

export function NetworkStatusIndicator() {
  const { isOnline, wasOffline, isDismissing } = useNetworkStatus();
  const pendingCount = usePendingMutationsCount();
  const { t } = useTranslation();
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSyncNow = async () => {
    if (!isOnline || isSyncing || pendingCount === 0) return;
    
    setIsSyncing(true);
    try {
      const { success, failed } = await replayQueuedMutations();
      if (success > 0) {
        toast({
          title: t('common.syncSuccess', 'Sync complete'),
          description: t('common.syncSuccessDesc', '{{count}} change(s) synced successfully.', { count: success }),
        });
      }
      if (failed > 0) {
        toast({
          title: t('common.syncFailed', 'Some changes failed'),
          description: t('common.syncFailedDesc', '{{count}} change(s) could not be synced.', { count: failed }),
          variant: 'destructive',
        });
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const showOfflineStatus = !isOnline || (isOnline && wasOffline);
  const showPendingBadge = pendingCount > 0 && isOnline;

  // Don't show anything if online with no pending and wasn't offline
  if (!showOfflineStatus && !showPendingBadge) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 z-50 flex flex-col gap-2">
      {/* Pending changes indicator */}
      {showPendingBadge && (
        <div className="flex items-center gap-2 rounded-lg bg-amber-500/90 px-4 py-2 text-sm font-medium text-white shadow-lg animate-in slide-in-from-left">
          <CloudOff className="h-4 w-4" />
          <span>
            {t('common.pendingChanges', '{{count}} pending change(s)', { count: pendingCount })}
          </span>
          <button
            onClick={handleSyncNow}
            disabled={isSyncing}
            className="ms-2 flex items-center gap-1 rounded bg-white/20 px-2 py-0.5 text-xs hover:bg-white/30 disabled:opacity-50"
          >
            <RefreshCw className={cn('h-3 w-3', isSyncing && 'animate-spin')} />
            {t('common.syncNow', 'Sync Now')}
          </button>
        </div>
      )}

      {/* Online/Offline status */}
      {showOfflineStatus && (
        <div
          className={cn(
            'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium shadow-lg transition-all duration-300',
            isOnline
              ? 'bg-green-500/90 text-white'
              : 'bg-destructive/90 text-destructive-foreground',
            isDismissing
              ? 'animate-fade-out opacity-0'
              : 'animate-in slide-in-from-left'
          )}
        >
          {isOnline ? (
            <>
              <Wifi className="h-4 w-4" />
              <span>{t('common.backOnline', 'Back online')}</span>
            </>
          ) : (
            <>
              <WifiOff className="h-4 w-4" />
              <span>{t('common.offline', 'You are offline')}</span>
              {pendingCount > 0 && (
                <span className="ms-1 rounded-full bg-white/20 px-2 py-0.5 text-xs">
                  {pendingCount}
                </span>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
