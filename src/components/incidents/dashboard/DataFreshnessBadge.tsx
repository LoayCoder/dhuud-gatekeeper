import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { RefreshCw, Check, Clock } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";

interface DataFreshnessBadgeProps {
  dataUpdatedAt?: number;
  isFetching?: boolean;
  isStale?: boolean;
  showTimestamp?: boolean;
  className?: string;
}

export function DataFreshnessBadge({ 
  dataUpdatedAt, 
  isFetching, 
  isStale,
  showTimestamp = true,
  className = ""
}: DataFreshnessBadgeProps) {
  const { t } = useTranslation();

  if (!dataUpdatedAt && !isFetching) return null;

  const getStatusInfo = () => {
    if (isFetching) {
      return {
        variant: 'outline' as const,
        icon: RefreshCw,
        label: t('hsseDashboard.caching.refreshing', 'Refreshing...'),
        className: 'border-primary/50 text-primary animate-pulse'
      };
    }
    
    if (isStale) {
      return {
        variant: 'outline' as const,
        icon: Clock,
        label: t('hsseDashboard.caching.stale', 'May be outdated'),
        className: 'border-warning/50 text-warning'
      };
    }
    
    return {
      variant: 'outline' as const,
      icon: Check,
      label: t('hsseDashboard.caching.fresh', 'Fresh'),
      className: 'border-chart-3/50 text-chart-3'
    };
  };

  const { variant, icon: Icon, label, className: statusClassName } = getStatusInfo();
  
  const timeAgo = dataUpdatedAt 
    ? formatDistanceToNow(new Date(dataUpdatedAt), { addSuffix: true })
    : null;
    
  const exactTime = dataUpdatedAt 
    ? format(new Date(dataUpdatedAt), 'HH:mm:ss')
    : null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge 
          variant={variant} 
          className={`text-xs gap-1 font-normal ${statusClassName} ${className}`}
        >
          <Icon className={`h-3 w-3 ${isFetching ? 'animate-spin' : ''}`} />
          {showTimestamp && timeAgo ? (
            <span className="hidden sm:inline">{timeAgo}</span>
          ) : (
            <span className="hidden sm:inline">{label}</span>
          )}
        </Badge>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">
        <div className="space-y-1">
          <p className="font-medium">{label}</p>
          {exactTime && (
            <p className="text-muted-foreground">
              {t('hsseDashboard.caching.lastUpdated', 'Last updated')}: {exactTime}
            </p>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
