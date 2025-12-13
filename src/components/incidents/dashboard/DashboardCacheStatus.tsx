import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { RefreshCw, CheckCircle2, AlertCircle, Database } from "lucide-react";
import { format } from "date-fns";

interface CacheInfo {
  dataUpdatedAt?: number;
  isFetching?: boolean;
  isStale?: boolean;
}

interface DashboardCacheStatusProps {
  cacheInfos: CacheInfo[];
  className?: string;
}

export function DashboardCacheStatus({ cacheInfos, className = "" }: DashboardCacheStatusProps) {
  const { t } = useTranslation();

  const isAnyFetching = cacheInfos.some(c => c.isFetching);
  const isAnyStale = cacheInfos.some(c => c.isStale);
  const validUpdates = cacheInfos.map(c => c.dataUpdatedAt || 0).filter(v => v > 0);
  const latestUpdate = validUpdates.length > 0 ? Math.max(...validUpdates) : 0;

  const getOverallStatus = () => {
    if (isAnyFetching) {
      return {
        icon: RefreshCw,
        label: t('hsseDashboard.caching.refreshing', 'Refreshing...'),
        className: 'bg-primary/10 text-primary border-primary/30',
        iconClass: 'animate-spin'
      };
    }
    
    if (isAnyStale) {
      return {
        icon: AlertCircle,
        label: t('hsseDashboard.caching.stale', 'Some data may be outdated'),
        className: 'bg-warning/10 text-warning border-warning/30',
        iconClass: ''
      };
    }
    
    return {
      icon: CheckCircle2,
      label: t('hsseDashboard.caching.fresh', 'All data fresh'),
      className: 'bg-chart-3/10 text-chart-3 border-chart-3/30',
      iconClass: ''
    };
  };

  const { icon: Icon, label, className: statusClassName, iconClass } = getOverallStatus();
  
  const lastUpdatedTime = latestUpdate > 0
    ? format(new Date(latestUpdate), 'HH:mm:ss')
    : null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge 
          variant="outline" 
          className={`gap-1.5 text-xs font-normal px-2.5 py-1 ${statusClassName} ${className}`}
        >
          <Database className="h-3 w-3" />
          <Icon className={`h-3 w-3 ${iconClass}`} />
          <span className="hidden md:inline">{label}</span>
        </Badge>
      </TooltipTrigger>
      <TooltipContent side="bottom" align="end" className="text-xs">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Icon className={`h-4 w-4 ${iconClass}`} />
            <span className="font-medium">{label}</span>
          </div>
          {lastUpdatedTime && (
            <p className="text-muted-foreground">
              {t('hsseDashboard.caching.lastUpdated', 'Last updated')}: {lastUpdatedTime}
            </p>
          )}
          <p className="text-muted-foreground">
            {t('hsseDashboard.caching.autoRefresh', 'Auto-refreshes every 5 minutes')}
          </p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
