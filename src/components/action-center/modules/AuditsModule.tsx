import { useTranslation } from 'react-i18next';
import {
  ShieldCheck,
  Plus,
  CheckSquare,
  ArrowUpRight,
  Eye,
  ClipboardList,
} from 'lucide-react';
import { ActionModuleCard } from '../ActionModuleCard';
import type { ActionCenterStats } from '@/features/incidents';

interface AuditsModuleProps {
  stats: ActionCenterStats['audits'];
}

export function AuditsModule({ stats }: AuditsModuleProps) {
  const { t } = useTranslation();

  return (
    <ActionModuleCard
      title={t('actionCenter.modules.audits.title', 'Audits')}
      description={t('actionCenter.modules.audits.description', 'Audit planning, execution, findings, and corrective action tracking')}
      icon={ShieldCheck}
      iconColorClass="text-primary"
      attentionCount={stats.openFindings}
      hasCritical={stats.overdue > 0}
      kpis={[
        { label: t('actionCenter.kpi.openFindings', 'Open Findings'), value: stats.openFindings, colorClass: 'text-warning' },
        { label: t('actionCenter.kpi.inProgress', 'In Progress'), value: stats.inProgress, colorClass: 'text-info' },
        { label: t('actionCenter.kpi.completed', 'Completed'), value: stats.completed, colorClass: 'text-success' },
        { label: t('actionCenter.kpi.total', 'Total'), value: stats.total },
      ]}
      actionLinks={[
        {
          label: t('actionCenter.actions.startAudit', 'Start Audit'),
          href: '/inspections/sessions',
          icon: Plus,
          variant: 'default',
        },
        {
          label: t('actionCenter.actions.viewAudits', 'View Audits'),
          href: '/inspections/sessions',
          icon: Eye,
        },
        {
          label: t('actionCenter.actions.openFindings', 'Open Findings'),
          href: '/inspections/my-actions',
          icon: ClipboardList,
          badge: stats.openFindings,
          badgeVariant: 'destructive',
          showOnlyWithBadge: true,
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
