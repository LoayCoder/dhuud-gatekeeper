import { useTranslation } from 'react-i18next';
import { WifiOff, RefreshCw, CheckCircle2, CloudOff } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { usePendingMutationsCount, replayQueuedMutations } from '@/hooks/use-offline-mutation';
import { useState } from 'react';
import { cn } from '@/lib/utils';

export function OfflineStatusBanner() {
  const { t } = useTranslation();
  const { isOnline } = useNetworkStatus();
  const pendingCount = usePendingMutationsCount();
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await replayQueuedMutations();
    } finally {
      setIsSyncing(false);
    }
  };

  // Don't show banner if online and no pending changes
  if (isOnline && pendingCount === 0) return null;

  return (
    <Alert 
      variant={isOnline ? "default" : "destructive"} 
      className={cn(
        "fixed bottom-4 start-4 end-4 z-50 max-w-md mx-auto shadow-lg",
        isOnline ? "bg-yellow-50 border-yellow-500 dark:bg-yellow-950" : ""
      )}
    >
      <div className="flex items-center gap-3">
        {isOnline ? (
          <CloudOff className="h-4 w-4 text-yellow-600" />
        ) : (
          <WifiOff className="h-4 w-4" />
        )}
        
        <AlertDescription className="flex-1 text-sm">
          {!isOnline ? (
            t('offline.youAreOffline', 'You are offline')
          ) : pendingCount > 0 ? (
            t('offline.pendingChanges', '{{count}} pending changes', { count: pendingCount })
          ) : (
            t('offline.syncComplete', 'All changes synced')
          )}
        </AlertDescription>
        
        {isOnline && pendingCount > 0 && (
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
        
        {isOnline && pendingCount === 0 && (
          <CheckCircle2 className="h-4 w-4 text-green-600" />
        )}
      </div>
    </Alert>
  );
}
