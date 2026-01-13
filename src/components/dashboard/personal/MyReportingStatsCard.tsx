import { useTranslation } from 'react-i18next';
import { useMyReportingStats } from '@/hooks/use-my-reporting-stats';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  FileText, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  CheckCircle2,
  Eye,
  ShieldCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { WeeklyTrendChart } from './WeeklyTrendChart';

interface StatItemProps {
  icon: React.ElementType;
  label: string;
  value: number;
  trend?: number;
  trendLabel?: string;
  color?: 'default' | 'success' | 'warning' | 'info';
  trendData?: number[];
}

function StatItem({ icon: Icon, label, value, trend, trendLabel, color = 'default', trendData }: StatItemProps) {
  const colorClasses = {
    default: 'bg-muted/50',
    success: 'bg-success/10',
    warning: 'bg-warning/10',
    info: 'bg-info/10',
  };

  const iconColorClasses = {
    default: 'text-muted-foreground',
    success: 'text-success',
    warning: 'text-warning',
    info: 'text-info',
  };

  const TrendIcon = trend && trend > 0 ? TrendingUp : trend && trend < 0 ? TrendingDown : Minus;
  const trendColor = trend && trend > 0 ? 'text-success' : trend && trend < 0 ? 'text-destructive' : 'text-muted-foreground';

  return (
    <div className={cn(
      'flex flex-col p-3 rounded-xl border transition-colors',
      colorClasses[color]
    )}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className={cn('p-1.5 rounded-lg bg-background/80')}>
            <Icon className={cn('h-4 w-4', iconColorClasses[color])} strokeWidth={1.75} />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">{label}</p>
            <p className="text-xl font-bold tabular-nums mt-0.5">{value}</p>
          </div>
        </div>
        
        {/* Trend indicator */}
        {trend !== undefined && trend !== 0 && (
          <div className={cn('flex items-center gap-0.5 text-xs', trendColor)}>
            <TrendIcon className="h-3 w-3" />
            <span className="font-medium tabular-nums">{Math.abs(trend)}</span>
          </div>
        )}
      </div>

      {/* Mini sparkline */}
      {trendData && trendData.length > 1 && (
        <div className="mt-2 -mx-1">
          <WeeklyTrendChart 
            data={trendData} 
            height={24} 
            color={color === 'success' ? 'success' : color === 'warning' ? 'warning' : color === 'info' ? 'info' : 'primary'}
          />
        </div>
      )}

      {trendLabel && (
        <p className="text-[10px] text-muted-foreground mt-1.5">{trendLabel}</p>
      )}
    </div>
  );
}

export function MyReportingStatsCard() {
  const { t } = useTranslation();
  const { data: stats, isLoading } = useMyReportingStats();

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!stats) return null;

  // Generate sample trend data for visualization (in real app, this comes from API)
  const generateTrendData = (current: number, trend: number) => {
    const weeks = 8;
    const base = Math.max(0, current - (trend * 4));
    return Array.from({ length: weeks }, (_, i) => 
      Math.max(0, Math.round(base + (current - base) * (i / (weeks - 1)) + (Math.random() - 0.5) * 2))
    );
  };

  const statItems: StatItemProps[] = [
    {
      icon: Eye,
      label: t('dashboard.stats.observations', 'Observations'),
      value: stats.my_observations,
      trend: stats.trend_observations,
      trendLabel: t('dashboard.stats.thisMonth', 'This month: {{count}}', { count: stats.my_observations_this_month }),
      color: 'info',
      trendData: generateTrendData(stats.my_observations, stats.trend_observations),
    },
    {
      icon: AlertTriangle,
      label: t('dashboard.stats.incidents', 'Incidents'),
      value: stats.my_incidents,
      trend: stats.trend_incidents,
      trendLabel: t('dashboard.stats.thisMonth', 'This month: {{count}}', { count: stats.my_incidents_this_month }),
      color: 'warning',
      trendData: generateTrendData(stats.my_incidents, stats.trend_incidents),
    },
    {
      icon: CheckCircle2,
      label: t('dashboard.stats.actionsCompleted', 'Actions Done'),
      value: stats.completed_actions,
      color: 'success',
    },
    {
      icon: ShieldCheck,
      label: t('dashboard.stats.totalReports', 'Total Reports'),
      value: stats.my_observations + stats.my_incidents,
      color: 'default',
    },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10">
            <FileText className="h-4 w-4 text-primary" strokeWidth={1.75} />
          </div>
          {t('dashboard.stats.title', 'My Reporting Activity')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {statItems.map((item, index) => (
            <StatItem key={index} {...item} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
