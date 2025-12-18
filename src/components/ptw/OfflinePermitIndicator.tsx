import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { 
  WifiOff, 
  Cloud, 
  CloudOff, 
  RefreshCw, 
  Trash2, 
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { useOfflinePermitCreation, OfflinePermit } from '@/hooks/ptw/use-offline-permit-creation';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

interface OfflinePermitIndicatorProps {
  className?: string;
}

export function OfflinePermitIndicator({ className }: OfflinePermitIndicatorProps) {
  const { t } = useTranslation();
  const {
    isOnline,
    isSyncing,
    pendingPermits,
    pendingCount,
    syncPendingPermits,
    removeFailedPermit,
    retryFailedPermit,
  } = useOfflinePermitCreation();

  if (pendingCount === 0 && isOnline) {
    return null;
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn('gap-2', className)}
        >
          {isOnline ? (
            <Cloud className="h-4 w-4 text-primary" />
          ) : (
            <WifiOff className="h-4 w-4 text-amber-500" />
          )}
          {pendingCount > 0 && (
            <Badge 
              variant={isOnline ? 'default' : 'secondary'} 
              className="h-5 min-w-5 px-1.5"
            >
              {pendingCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isOnline ? (
                <>
                  <Cloud className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">
                    {t('ptw.offline.online', 'Online')}
                  </span>
                </>
              ) : (
                <>
                  <CloudOff className="h-4 w-4 text-amber-500" />
                  <span className="text-sm font-medium text-amber-600">
                    {t('ptw.offline.offline', 'Offline Mode')}
                  </span>
                </>
              )}
            </div>
            {isOnline && pendingCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => syncPendingPermits()}
                disabled={isSyncing}
              >
                <RefreshCw className={cn('h-3 w-3 me-1', isSyncing && 'animate-spin')} />
                {isSyncing 
                  ? t('ptw.offline.syncing', 'Syncing...') 
                  : t('ptw.offline.syncNow', 'Sync Now')
                }
              </Button>
            )}
          </div>

          {pendingCount > 0 ? (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                {t('ptw.offline.pendingPermits', '{{count}} pending permit(s)', { count: pendingCount })}
              </p>
              <ScrollArea className="h-[200px]">
                <div className="space-y-2 pe-4">
                  {pendingPermits.map((permit) => (
                    <OfflinePermitItem
                      key={permit.localId}
                      permit={permit}
                      isOnline={isOnline}
                      onRetry={() => retryFailedPermit(permit.localId)}
                      onRemove={() => removeFailedPermit(permit.localId)}
                    />
                  ))}
                </div>
              </ScrollArea>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-2">
              {t('ptw.offline.noPending', 'No pending permits')}
            </p>
          )}

          {!isOnline && (
            <p className="text-xs text-muted-foreground border-t pt-2">
              {t('ptw.offline.offlineNote', 'Permits will sync automatically when connection is restored')}
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

interface OfflinePermitItemProps {
  permit: OfflinePermit;
  isOnline: boolean;
  onRetry: () => void;
  onRemove: () => void;
}

function OfflinePermitItem({ permit, isOnline, onRetry, onRemove }: OfflinePermitItemProps) {
  const { t } = useTranslation();
  
  const statusIcon = {
    pending: <CloudOff className="h-3 w-3 text-amber-500" />,
    syncing: <RefreshCw className="h-3 w-3 animate-spin text-primary" />,
    synced: <CheckCircle2 className="h-3 w-3 text-green-500" />,
    failed: <AlertCircle className="h-3 w-3 text-destructive" />,
  };

  const statusText = {
    pending: t('ptw.offline.status.pending', 'Pending'),
    syncing: t('ptw.offline.status.syncing', 'Syncing'),
    synced: t('ptw.offline.status.synced', 'Synced'),
    failed: t('ptw.offline.status.failed', 'Failed'),
  };

  return (
    <div className="rounded-md border p-2 text-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            {statusIcon[permit.syncStatus]}
            <span className="text-xs font-medium">
              {statusText[permit.syncStatus]}
            </span>
          </div>
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {(permit.data.job_description as string)?.slice(0, 50) || t('ptw.offline.noDescription', 'No description')}
          </p>
          <p className="text-xs text-muted-foreground">
            {format(permit.createdAt, 'MMM d, HH:mm')}
          </p>
          {permit.syncError && (
            <p className="text-xs text-destructive mt-1">{permit.syncError}</p>
          )}
        </div>
        <div className="flex items-center gap-1">
          {permit.syncStatus === 'failed' && isOnline && (
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onRetry}>
              <RefreshCw className="h-3 w-3" />
            </Button>
          )}
          {permit.syncStatus !== 'syncing' && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6 text-muted-foreground hover:text-destructive"
              onClick={onRemove}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
