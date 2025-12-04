import { useNetworkStatus } from '@/hooks/use-network-status';
import { Wifi, WifiOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

export function NetworkStatusIndicator() {
  const { isOnline, wasOffline } = useNetworkStatus();
  const { t } = useTranslation();

  // Don't show anything if always online
  if (isOnline && !wasOffline) {
    return null;
  }

  return (
    <div
      className={cn(
        'fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium shadow-lg transition-all duration-300',
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
        </>
      )}
    </div>
  );
}
