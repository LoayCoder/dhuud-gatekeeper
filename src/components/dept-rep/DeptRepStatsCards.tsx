import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Clock, AlertTriangle, CheckCircle2, FileWarning } from 'lucide-react';
import { DeptRepDashboardStats } from '@/hooks/use-dept-rep-dashboard';

interface DeptRepStatsCardsProps {
  stats: DeptRepDashboardStats | undefined;
  isLoading: boolean;
}

export function DeptRepStatsCards({ stats, isLoading }: DeptRepStatsCardsProps) {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="border-border/50">
            <CardContent className="p-4">
              <Skeleton className="h-8 w-12 mb-2" />
              <Skeleton className="h-4 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const statItems = [
    {
      label: t('deptRepDashboard.stats.pending', 'Pending Approval'),
      value: stats?.new_count ?? 0,
      icon: Clock,
      bgClass: 'bg-blue-500/10 dark:bg-blue-500/20',
      iconClass: 'text-blue-600 dark:text-blue-400',
      borderClass: 'border-blue-500/30',
    },
    {
      label: t('deptRepDashboard.stats.inProgress', 'In Progress'),
      value: stats?.in_progress_count ?? 0,
      icon: FileWarning,
      bgClass: 'bg-amber-500/10 dark:bg-amber-500/20',
      iconClass: 'text-amber-600 dark:text-amber-400',
      borderClass: 'border-amber-500/30',
    },
    {
      label: t('deptRepDashboard.stats.overdue', 'Overdue'),
      value: stats?.overdue_count ?? 0,
      icon: AlertTriangle,
      bgClass: 'bg-red-500/10 dark:bg-red-500/20',
      iconClass: 'text-red-600 dark:text-red-400',
      borderClass: 'border-red-500/30',
    },
    {
      label: t('deptRepDashboard.stats.total', 'Total Events'),
      value: stats?.total_count ?? 0,
      icon: CheckCircle2,
      bgClass: 'bg-green-500/10 dark:bg-green-500/20',
      iconClass: 'text-green-600 dark:text-green-400',
      borderClass: 'border-green-500/30',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {statItems.map((item) => (
        <Card key={item.label} className={`border ${item.borderClass} ${item.bgClass}`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{item.value}</p>
                <p className="text-sm text-muted-foreground">{item.label}</p>
              </div>
              <item.icon className={`h-8 w-8 ${item.iconClass}`} />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
