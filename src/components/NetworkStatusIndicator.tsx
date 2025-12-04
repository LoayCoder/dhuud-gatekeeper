import { useNetworkStatus } from '@/hooks/use-network-status';
import { usePendingMutationsCount } from '@/hooks/use-offline-mutation';
import { Wifi, WifiOff, CloudOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

export function NetworkStatusIndicator() {
  const { isOnline, wasOffline } = useNetworkStatus();
  const pendingCount = usePendingMutationsCount();
  const { t } = useTranslation();

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
        </div>
      )}

      {/* Online/Offline status */}
      {showOfflineStatus && (
        <div
          className={cn(
            'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium shadow-lg transition-all duration-300 animate-in slide-in-from-left',
            isOnline
              ? 'bg-green-500/90 text-white'
              : 'bg-destructive/90 text-destructive-foreground'
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
