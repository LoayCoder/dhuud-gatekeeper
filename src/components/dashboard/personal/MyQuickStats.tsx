import { useTranslation } from 'react-i18next';
import { CheckCircle2, Clock, AlertTriangle, Users, FileText, ClipboardCheck } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { usePersonalDashboard } from '@/hooks/use-personal-dashboard';
import { useModuleAccess } from '@/hooks/use-module-access';
import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  variant?: 'default' | 'warning' | 'danger' | 'success';
  show?: boolean;
}

function StatCard({ label, value, icon, variant = 'default', show = true }: StatCardProps) {
  if (!show) return null;

  const variantStyles = {
    default: 'text-muted-foreground',
    warning: 'text-yellow-600 dark:text-yellow-400',
    danger: 'text-destructive',
    success: 'text-success',
  };

  const bgVariantStyles = {
    default: 'bg-muted/50',
    warning: 'bg-yellow-50 dark:bg-yellow-950/30',
    danger: 'bg-destructive/10',
    success: 'bg-success/10',
  };

  return (
    <Card className={cn('border-none shadow-none', bgVariantStyles[variant])}>
      <CardContent className="flex items-center gap-3 p-3">
        <div className={cn('shrink-0', variantStyles[variant])}>
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className={cn('text-2xl font-bold tabular-nums', variantStyles[variant])}>
            {value}
          </p>
          <p className="text-xs text-muted-foreground truncate">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export function MyQuickStats() {
  const { t } = useTranslation();
  const { data: stats, isLoading } = usePersonalDashboard();
  const { hasModule } = useModuleAccess();

  if (isLoading) {
    return (
      <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
    );
  }

  if (!stats) return null;

  const hasHSSEAccess = hasModule('hsse_core') || hasModule('incidents');
  const hasSecurityAccess = hasModule('security');
  const hasInspectionsAccess = hasModule('audits') || hasModule('hsse_core');

  const totalOverdue = stats.actions.overdue + stats.inspections.overdue;
  const totalPending = stats.actions.pending + stats.actions.in_progress;

  return (
    <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
      <StatCard
        label={t('dashboard.personal.myOverdueItems', 'Overdue Items')}
        value={totalOverdue}
        icon={<AlertTriangle className="h-5 w-5" />}
        variant={totalOverdue > 0 ? 'danger' : 'success'}
        show={hasHSSEAccess || hasInspectionsAccess}
      />
      <StatCard
        label={t('dashboard.personal.myPendingActions', 'Pending Actions')}
        value={totalPending}
        icon={<Clock className="h-5 w-5" />}
        variant={totalPending > 5 ? 'warning' : 'default'}
        show={hasHSSEAccess}
      />
      <StatCard
        label={t('dashboard.personal.completedThisWeek', 'Completed This Week')}
        value={stats.actions.completed_this_week + stats.inspections.completed_this_week}
        icon={<CheckCircle2 className="h-5 w-5" />}
        variant="success"
        show={hasHSSEAccess || hasInspectionsAccess}
      />
      <StatCard
        label={t('dashboard.personal.visitorsOnSite', 'Visitors On Site')}
        value={stats.visitors.on_site}
        icon={<Users className="h-5 w-5" />}
        variant={stats.visitors.on_site > 0 ? 'default' : 'default'}
        show={hasSecurityAccess}
      />
      <StatCard
        label={t('dashboard.personal.myGatePasses', 'My Gate Passes')}
        value={stats.gate_passes.my_pending + stats.gate_passes.approved_today}
        icon={<FileText className="h-5 w-5" />}
        show={hasSecurityAccess}
      />
      <StatCard
        label={t('dashboard.personal.myInspections', 'Active Inspections')}
        value={stats.inspections.assigned_pending}
        icon={<ClipboardCheck className="h-5 w-5" />}
        variant={stats.inspections.overdue > 0 ? 'warning' : 'default'}
        show={hasInspectionsAccess}
      />
    </div>
  );
}
