import { useTranslation } from 'react-i18next';
import { Cloud, CloudOff, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useAuth } from '@/contexts/AuthContext';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { sessionCache } from '@/hooks/use-cached-session';
import { formatDistanceToNow } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface OfflineSessionIndicatorProps {
  className?: string;
}

export function OfflineSessionIndicator({ className }: OfflineSessionIndicatorProps) {
  const { t, i18n } = useTranslation();
  const { isUsingCachedSession, refreshSession } = useAuth();
  const isOnline = useOnlineStatus();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [cachedAt, setCachedAt] = useState<Date | null>(null);

  // Get cached timestamp on mount
  useEffect(() => {
    const loadCachedTime = async () => {
      const cached = await sessionCache.getCachedSession();
      if (cached?.cachedAt) {
        setCachedAt(new Date(cached.cachedAt));
      }
    };
    if (isUsingCachedSession) {
      loadCachedTime();
    }
  }, [isUsingCachedSession]);

  // Don't show if not using cached session
  if (!isUsingCachedSession) return null;

  const handleRefresh = async () => {
    if (!isOnline || isRefreshing) return;
    
    setIsRefreshing(true);
    try {
      await refreshSession();
    } finally {
      setIsRefreshing(false);
    }
  };

  const getLastVerifiedText = () => {
    if (!cachedAt) return t('offline.session.unknown', 'Unknown');
    
    const locale = i18n.language === 'ar' ? ar : enUS;
    return formatDistanceToNow(cachedAt, { addSuffix: true, locale });
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-7 px-2 gap-1.5 text-xs font-medium",
              "bg-amber-100 text-amber-800 hover:bg-amber-200",
              "dark:bg-amber-900/30 dark:text-amber-200 dark:hover:bg-amber-900/50",
              className
            )}
            onClick={isOnline ? handleRefresh : undefined}
            disabled={isRefreshing}
          >
            {isRefreshing ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : isOnline ? (
              <Cloud className="h-3.5 w-3.5" />
            ) : (
              <CloudOff className="h-3.5 w-3.5" />
            )}
            <span className="hidden sm:inline">
              {t('offline.session.cached', 'Cached')}
            </span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" align="end" className="max-w-64">
          <div className="space-y-2">
            <p className="font-medium">
              {t('offline.session.usingCached', 'Using cached session')}
            </p>
            <p className="text-xs text-muted-foreground">
              {t('offline.session.lastVerified', 'Last verified')}: {getLastVerifiedText()}
            </p>
            {isOnline && !isRefreshing && (
              <p className="text-xs text-primary">
                {t('offline.session.clickToRefresh', 'Click to refresh session')}
              </p>
            )}
            {isRefreshing && (
              <p className="text-xs text-muted-foreground">
                {t('offline.session.refreshing', 'Refreshing...')}
              </p>
            )}
            {!isOnline && (
              <p className="text-xs text-muted-foreground">
                {t('offline.session.connectToRefresh', 'Connect to internet to refresh')}
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
