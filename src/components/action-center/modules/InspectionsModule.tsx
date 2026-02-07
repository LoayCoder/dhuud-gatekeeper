import { useTranslation } from 'react-i18next';
import {
  ClipboardCheck,
  Plus,
  CheckSquare,
  ArrowUpRight,
  Calendar,
  Eye,
} from 'lucide-react';
import { ActionModuleCard } from '../ActionModuleCard';
import type { ActionCenterStats } from '@/hooks/use-action-center-stats';

interface InspectionsModuleProps {
  stats: ActionCenterStats['inspections'];
}

export function InspectionsModule({ stats }: InspectionsModuleProps) {
  const { t } = useTranslation();

  return (
    <ActionModuleCard
      title={t('actionCenter.modules.inspections.title', 'Inspections')}
      description={t('actionCenter.modules.inspections.description', 'Scheduled and ad-hoc inspections with follow-up actions')}
      icon={ClipboardCheck}
      iconColorClass="text-success"
      attentionCount={stats.overdue + stats.pendingActions}
      hasCritical={stats.overdue > 0}
      kpis={[
        { label: t('actionCenter.kpi.overdue', 'Overdue'), value: stats.overdue, colorClass: 'text-destructive' },
        { label: t('actionCenter.kpi.scheduled', 'Scheduled'), value: stats.scheduled, colorClass: 'text-warning' },
        { label: t('actionCenter.kpi.pendingActions', 'Pending Actions'), value: stats.pendingActions, colorClass: 'text-info' },
        { label: t('actionCenter.kpi.total', 'Total'), value: stats.total },
      ]}
      actionLinks={[
        {
          label: t('actionCenter.actions.startInspection', 'Start Inspection'),
          href: '/inspections/sessions',
          icon: Plus,
          variant: 'default',
        },
        {
          label: t('actionCenter.actions.viewSessions', 'Active Sessions'),
          href: '/inspections/sessions',
          icon: Eye,
        },
        {
          label: t('actionCenter.actions.myInspectionActions', 'My Actions'),
          href: '/inspections/my-actions',
          icon: CheckSquare,
          badge: stats.pendingActions,
          showOnlyWithBadge: true,
        },
        {
          label: t('actionCenter.actions.schedules', 'Schedules'),
          href: '/inspections/schedules',
          icon: Calendar,
        },
        {
          label: t('actionCenter.actions.dashboard', 'Dashboard'),
          href: '/inspections/dashboard',
          icon: ArrowUpRight,
        },
      ]}
    />
  );
}
