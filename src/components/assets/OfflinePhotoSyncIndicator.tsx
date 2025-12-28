import { useTranslation } from 'react-i18next';
import { Cloud, CloudOff, Loader2, ImageIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useOfflineAssetPhotos } from '@/hooks/use-offline-asset-photos';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { cn } from '@/lib/utils';

interface OfflinePhotoSyncIndicatorProps {
  className?: string;
  showSyncButton?: boolean;
}

export function OfflinePhotoSyncIndicator({ 
  className,
  showSyncButton = true 
}: OfflinePhotoSyncIndicatorProps) {
  const { t } = useTranslation();
  const isOnline = useOnlineStatus();
  const { pendingCount, isSyncing, syncPhotos } = useOfflineAssetPhotos();

  // Don't show anything if no pending photos
  if (pendingCount === 0 && !isSyncing) {
    return null;
  }

  return (
    <div className={cn(
      "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm",
      isOnline 
        ? "bg-primary/10 text-primary border border-primary/20" 
        : "bg-muted text-muted-foreground border border-border",
      className
    )}>
      {isSyncing ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>{t('assets.photos.syncing', 'Syncing photos...')}</span>
        </>
      ) : (
        <>
          {isOnline ? (
            <Cloud className="h-4 w-4" />
          ) : (
            <CloudOff className="h-4 w-4" />
          )}
          <ImageIcon className="h-4 w-4" />
          <Badge variant="secondary" className="h-5 min-w-5 px-1 text-xs">
            {pendingCount}
          </Badge>
          <span className="hidden sm:inline">
            {t('assets.photos.pendingSync', 'photos pending sync')}
          </span>
          {showSyncButton && isOnline && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-6 px-2 text-xs"
              onClick={() => syncPhotos()}
            >
              {t('assets.photos.syncNow', 'Sync now')}
            </Button>
          )}
        </>
      )}
    </div>
  );
}
