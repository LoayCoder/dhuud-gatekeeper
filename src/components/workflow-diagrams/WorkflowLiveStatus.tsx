import { useTranslation } from 'react-i18next';
import { useWorkflowMetrics, BottleneckAlert } from '@/hooks/workflow';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { 
  Activity, 
  CheckCircle2, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Wifi,
  WifiOff,
  Clock
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';

interface WorkflowLiveStatusProps {
  workflowKey?: string;
  className?: string;
  compact?: boolean;
}

export function WorkflowLiveStatus({ workflowKey, className, compact = false }: WorkflowLiveStatusProps) {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir() === 'rtl';
  const { metrics, bottleneckAlerts, isConnected, lastUpdate, isLoading } = useWorkflowMetrics(workflowKey);

  const TrendIcon = metrics.performanceTrend === 'improving' 
    ? TrendingUp 
    : metrics.performanceTrend === 'declining' 
      ? TrendingDown 
      : Minus;

  const trendColor = metrics.performanceTrend === 'improving'
    ? 'text-green-500'
    : metrics.performanceTrend === 'declining'
      ? 'text-red-500'
      : 'text-muted-foreground';

  if (compact) {
    return (
      <div className={cn('flex items-center gap-3', className)}>
        {/* Connection Status */}
        <div className={cn(
          'flex items-center gap-1.5 text-xs',
          isConnected ? 'text-green-500' : 'text-red-500'
        )}>
          {isConnected ? (
            <>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              <Wifi className="h-3 w-3" />
            </>
          ) : (
            <WifiOff className="h-3 w-3" />
          )}
        </div>

        {/* Active Count */}
        <Badge variant="secondary" className="gap-1">
          <Activity className="h-3 w-3" />
          {metrics.totalActive}
        </Badge>

        {/* Bottleneck Alert */}
        {bottleneckAlerts.length > 0 && (
          <Badge variant="destructive" className="gap-1">
            <AlertTriangle className="h-3 w-3" />
            {bottleneckAlerts.length}
          </Badge>
        )}
      </div>
    );
  }

  return (
    <Card className={cn('p-4 space-y-4', className)}>
      {/* Header with connection status */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">{t('workflowDiagrams.liveStatus', 'Live Status')}</h3>
        <div className={cn(
          'flex items-center gap-1.5 text-xs',
          isConnected ? 'text-green-500' : 'text-red-500'
        )}>
          {isConnected ? (
            <>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              <span>{t('workflowDiagrams.connected', 'Connected')}</span>
            </>
          ) : (
            <>
              <WifiOff className="h-3 w-3" />
              <span>{t('workflowDiagrams.disconnected', 'Disconnected')}</span>
            </>
          )}
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* Active Instances */}
        <div className="bg-muted/50 rounded-lg p-3">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
            <Activity className="h-3.5 w-3.5" />
            {t('workflowDiagrams.activeInstances', 'Active')}
          </div>
          <div className="text-2xl font-bold">{metrics.totalActive}</div>
        </div>

        {/* Completed Today */}
        <div className="bg-muted/50 rounded-lg p-3">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {t('workflowDiagrams.completedToday', 'Today')}
          </div>
          <div className="text-2xl font-bold text-green-600">{metrics.completedToday}</div>
        </div>

        {/* Avg Completion Time */}
        <div className="bg-muted/50 rounded-lg p-3">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
            <Clock className="h-3.5 w-3.5" />
            {t('workflowDiagrams.avgTime', 'Avg Time')}
          </div>
          <div className="text-lg font-semibold">
            {metrics.avgCompletionHours !== null 
              ? `${metrics.avgCompletionHours.toFixed(1)}h`
              : '-'}
          </div>
        </div>

        {/* Trend */}
        <div className="bg-muted/50 rounded-lg p-3">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
            <TrendIcon className={cn('h-3.5 w-3.5', trendColor)} />
            {t('workflowDiagrams.trend', 'Trend')}
          </div>
          <div className={cn('text-lg font-semibold capitalize', trendColor)}>
            {t(`workflowDiagrams.${metrics.performanceTrend}`, metrics.performanceTrend)}
          </div>
        </div>
      </div>

      {/* Bottleneck Alerts */}
      {bottleneckAlerts.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
            {t('workflowDiagrams.bottlenecks', 'Bottlenecks')}
          </h4>
          <div className="space-y-1.5">
            {bottleneckAlerts.slice(0, 3).map((alert, idx) => (
              <BottleneckAlertItem key={idx} alert={alert} isRtl={isRtl} />
            ))}
          </div>
        </div>
      )}

      {/* Last Update */}
      {lastUpdate && (
        <div className="text-xs text-muted-foreground text-center pt-2 border-t">
          {t('workflowDiagrams.lastUpdated', 'Updated')}{' '}
          {formatDistanceToNow(lastUpdate, { 
            addSuffix: true, 
            locale: isRtl ? ar : enUS 
          })}
        </div>
      )}
    </Card>
  );
}

function BottleneckAlertItem({ alert, isRtl }: { alert: BottleneckAlert; isRtl: boolean }) {
  const severityColors = {
    low: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    medium: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
    high: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  };

  return (
    <div className={cn(
      'flex items-center justify-between p-2 rounded text-xs',
      severityColors[alert.severity]
    )}>
      <span className="truncate flex-1">{alert.stepId}</span>
      <Badge variant="outline" className="ms-2 text-xs">
        {alert.count}
      </Badge>
    </div>
  );
}
