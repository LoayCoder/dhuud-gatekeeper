import { useTranslation } from 'react-i18next';
import { AlertTriangle, Clock, CheckCircle2, ArrowUpRight, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { ActionCenterStats } from '@/hooks/use-action-center-stats';

interface ActionCenterStatsBarProps {
  stats: ActionCenterStats | undefined;
  isLoading: boolean;
  onFilterClick?: (filter: string) => void;
}

interface StatItem {
  key: string;
  label: string;
  value: number;
  icon: typeof AlertTriangle;
  colorClass: string;
  bgClass: string;
}

export function ActionCenterStatsBar({ stats, isLoading, onFilterClick }: ActionCenterStatsBarProps) {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map(i => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-8 w-16 bg-muted rounded mb-2" />
              <div className="h-4 w-24 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) return null;

  const items: StatItem[] = [
    {
      key: 'overdue',
      label: t('actionCenter.stats.overdue', 'Overdue Items'),
      value: stats.summary.totalOverdue,
      icon: AlertTriangle,
      colorClass: 'text-destructive',
      bgClass: 'bg-destructive/10 border-destructive/20',
    },
    {
      key: 'pending_approvals',
      label: t('actionCenter.stats.pendingApprovals', 'Pending Approvals'),
      value: stats.summary.totalPendingApprovals,
      icon: Clock,
      colorClass: 'text-warning',
      bgClass: 'bg-warning/10 border-warning/20',
    },
    {
      key: 'in_progress',
      label: t('actionCenter.stats.inProgress', 'In Progress'),
      value: stats.summary.totalInProgress,
      icon: ArrowUpRight,
      colorClass: 'text-info',
      bgClass: 'bg-info/10 border-info/20',
    },
    {
      key: 'total',
      label: t('actionCenter.stats.totalActions', 'Total Open Actions'),
      value: stats.summary.totalActions,
      icon: CheckCircle2,
      colorClass: 'text-muted-foreground',
      bgClass: 'bg-muted border-muted',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {items.map((item) => (
        <Card
          key={item.key}
          className={cn(
            'cursor-pointer transition-all hover:shadow-md border',
            item.value > 0 ? item.bgClass : 'bg-muted/30',
          )}
          onClick={() => onFilterClick?.(item.key)}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <span className={cn('text-2xl font-bold tabular-nums', item.value > 0 ? item.colorClass : 'text-muted-foreground')}>
                {item.value}
              </span>
              <item.icon className={cn('h-5 w-5', item.value > 0 ? item.colorClass : 'text-muted-foreground')} />
            </div>
            <p className="text-xs text-muted-foreground font-medium">
              {item.label}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
