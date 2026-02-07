import { useTranslation } from 'react-i18next';
import {
  Eye,
  Plus,
  CheckSquare,
  ArrowUpRight,
  ClipboardList,
} from 'lucide-react';
import { ActionModuleCard } from '../ActionModuleCard';
import type { ActionCenterStats } from '@/hooks/use-action-center-stats';

interface ObservationsModuleProps {
  stats: ActionCenterStats['observations'];
}

export function ObservationsModule({ stats }: ObservationsModuleProps) {
  const { t } = useTranslation();

  return (
    <ActionModuleCard
      title={t('actionCenter.modules.observations.title', 'Observations')}
      description={t('actionCenter.modules.observations.description', 'Submit, review, escalate, and close observations')}
      icon={Eye}
      iconColorClass="text-info"
      attentionCount={stats.overdue + stats.pending}
      hasCritical={stats.overdue > 0}
      kpis={[
        { label: t('actionCenter.kpi.overdue', 'Overdue'), value: stats.overdue, colorClass: 'text-destructive' },
        { label: t('actionCenter.kpi.pending', 'Pending'), value: stats.pending, colorClass: 'text-warning' },
        { label: t('actionCenter.kpi.inProgress', 'In Progress'), value: stats.inProgress, colorClass: 'text-info' },
        { label: t('actionCenter.kpi.completed', 'Completed'), value: stats.completed, colorClass: 'text-success' },
      ]}
      actionLinks={[
        {
          label: t('actionCenter.actions.reportObservation', 'Report Observation'),
          href: '/incidents/report',
          icon: Plus,
          variant: 'default',
        },
        {
          label: t('actionCenter.actions.reviewPending', 'Review Pending'),
          href: '/incidents/my-actions',
          icon: ClipboardList,
          badge: stats.pending,
          showOnlyWithBadge: true,
        },
        {
          label: t('actionCenter.actions.myActions', 'My Actions'),
          href: '/incidents/my-actions',
          icon: CheckSquare,
          badge: stats.overdue + stats.pending + stats.inProgress,
          badgeVariant: stats.overdue > 0 ? 'destructive' : 'secondary',
        },
        {
          label: t('actionCenter.actions.dashboard', 'Dashboard'),
          href: '/incidents/dashboard',
          icon: ArrowUpRight,
        },
      ]}
    />
  );
}
