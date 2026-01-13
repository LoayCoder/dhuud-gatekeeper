import { useTranslation } from 'react-i18next';
import { useMyReportingStats } from '@/hooks/use-my-reporting-stats';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  AlertTriangle, 
  Eye, 
  TrendingUp, 
  TrendingDown,
  CheckCircle,
  Calendar,
  Minus,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatItemProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  trend?: number;
  colorClass?: string;
  bgClass?: string;
}

function StatItem({ icon: Icon, label, value, trend, colorClass = 'text-primary', bgClass = 'bg-primary/10' }: StatItemProps) {
  const { t } = useTranslation();
  
  const getTrendIcon = () => {
    if (trend === undefined || trend === 0) return <Minus className="h-3 w-3 text-muted-foreground" />;
    if (trend > 0) return <TrendingUp className="h-3 w-3 text-success" />;
    return <TrendingDown className="h-3 w-3 text-destructive" />;
  };

  const getTrendLabel = () => {
    if (trend === undefined) return null;
    if (trend === 0) return t('dashboard.stats.noChange', 'No change');
    const prefix = trend > 0 ? '+' : '';
    return `${prefix}${trend} ${t('dashboard.stats.vsLastMonth', 'vs last month')}`;
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className={cn('p-2.5 rounded-xl', bgClass)}>
            <Icon className={cn('h-5 w-5', colorClass)} />
          </div>
          {trend !== undefined && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              {getTrendIcon()}
              <span className={cn(
                trend > 0 && 'text-success',
                trend < 0 && 'text-destructive'
              )}>
                {trend !== 0 && (trend > 0 ? `+${trend}` : trend)}
              </span>
            </div>
          )}
        </div>
        <div className="mt-3">
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export function MyReportingStatsCard() {
  const { t } = useTranslation();
  const { data: stats, isLoading } = useMyReportingStats();

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
    );
  }

  const statItems: StatItemProps[] = [
    {
      icon: AlertTriangle,
      label: t('dashboard.stats.myIncidents', 'My Incidents'),
      value: stats?.my_incidents || 0,
      trend: stats?.trend_incidents,
      colorClass: 'text-destructive',
      bgClass: 'bg-destructive/10',
    },
    {
      icon: Eye,
      label: t('dashboard.stats.myObservations', 'My Observations'),
      value: stats?.my_observations || 0,
      trend: stats?.trend_observations,
      colorClass: 'text-info',
      bgClass: 'bg-info/10',
    },
    {
      icon: Calendar,
      label: t('dashboard.stats.thisMonth', 'This Month'),
      value: (stats?.my_incidents_this_month || 0) + (stats?.my_observations_this_month || 0),
      colorClass: 'text-primary',
      bgClass: 'bg-primary/10',
    },
    {
      icon: CheckCircle,
      label: t('dashboard.stats.completedActions', 'Actions Completed'),
      value: stats?.completed_actions || 0,
      colorClass: 'text-success',
      bgClass: 'bg-success/10',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {statItems.map((item, idx) => (
        <StatItem key={idx} {...item} />
      ))}
    </div>
  );
}
