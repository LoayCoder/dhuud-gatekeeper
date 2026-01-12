import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, Download, WifiOff } from 'lucide-react';
import { isAppShellCached } from '@/lib/cache-app-shell';
import { cn } from '@/lib/utils';

interface OfflineReadyIndicatorProps {
  className?: string;
  showOnlyWhenReady?: boolean;
}

/**
 * Shows the offline-ready status of the app
 * Displays a subtle indicator when the app is cached and ready for offline use
 */
export function OfflineReadyIndicator({ 
  className,
  showOnlyWhenReady = false 
}: OfflineReadyIndicatorProps) {
  const { t } = useTranslation();
  const [isReady, setIsReady] = useState(false);
  const [isCaching, setIsCaching] = useState(false);
  const [justCached, setJustCached] = useState(false);

  useEffect(() => {
    // Check initial state
    setIsReady(isAppShellCached());

    // Listen for caching events
    const handleCacheStart = () => {
      setIsCaching(true);
    };

    const handleCached = () => {
      setIsCaching(false);
      setIsReady(true);
      setJustCached(true);
      
      // Hide the "just cached" animation after 3 seconds
      setTimeout(() => setJustCached(false), 3000);
    };

    window.addEventListener('app-shell-caching', handleCacheStart);
    window.addEventListener('app-shell-cached', handleCached);

    return () => {
      window.removeEventListener('app-shell-caching', handleCacheStart);
      window.removeEventListener('app-shell-cached', handleCached);
    };
  }, []);

  // Hide if showOnlyWhenReady and not ready yet
  if (showOnlyWhenReady && !isReady && !isCaching) {
    return null;
  }

  if (isCaching) {
    return (
      <div 
        className={cn(
          "flex items-center gap-2 text-xs text-muted-foreground",
          className
        )}
      >
        <Download className="h-3.5 w-3.5 animate-bounce" />
        <span>{t('offline.preparingOffline', 'Preparing for offline use...')}</span>
      </div>
    );
  }

  if (isReady) {
    return (
      <div 
        className={cn(
          "flex items-center gap-2 text-xs",
          justCached 
            ? "text-green-600 dark:text-green-400 animate-in fade-in duration-500" 
            : "text-muted-foreground",
          className
        )}
      >
        {justCached ? (
          <CheckCircle2 className="h-3.5 w-3.5" />
        ) : (
          <WifiOff className="h-3.5 w-3.5" />
        )}
        <span>
          {justCached 
            ? t('offline.nowAvailable', 'App ready for offline use!')
            : t('offline.available', 'Available offline')
          }
        </span>
      </div>
    );
  }

  return (
    <div 
      className={cn(
        "flex items-center gap-2 text-xs text-muted-foreground/60",
        className
      )}
    >
      <WifiOff className="h-3.5 w-3.5" />
      <span>{t('offline.notReady', 'Offline not ready')}</span>
    </div>
  );
}
