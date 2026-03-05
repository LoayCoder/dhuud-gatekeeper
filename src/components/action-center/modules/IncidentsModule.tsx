import { useTranslation } from 'react-i18next';
import {
  AlertTriangle,
  Plus,
  Search,
  CheckSquare,
  ClipboardList,
  ArrowUpRight,
  Eye,
} from 'lucide-react';
import { ActionModuleCard } from '../ActionModuleCard';
import type { ActionCenterStats } from '@/features/incidents';

interface IncidentsModuleProps {
  stats: ActionCenterStats['incidents'];
}

export function IncidentsModule({ stats }: IncidentsModuleProps) {
  const { t } = useTranslation();

  return (
    <ActionModuleCard
      title={t('actionCenter.modules.incidents.title', 'Incidents Management')}
      description={t('actionCenter.modules.incidents.description', 'Report, investigate, track, and close incidents')}
      icon={AlertTriangle}
      iconColorClass="text-destructive"
      attentionCount={stats.overdue + stats.pendingApprovals}
      hasCritical={stats.overdue > 0}
      kpis={[
        { label: t('actionCenter.kpi.overdue', 'Overdue'), value: stats.overdue, colorClass: 'text-destructive' },
        { label: t('actionCenter.kpi.pending', 'Pending'), value: stats.pending, colorClass: 'text-warning' },
        { label: t('actionCenter.kpi.investigations', 'Investigations'), value: stats.openInvestigations, colorClass: 'text-info' },
        { label: t('actionCenter.kpi.total', 'Total'), value: stats.total },
      ]}
      actionLinks={[
        {
          label: t('actionCenter.actions.reportIncident', 'Report Incident'),
          href: '/incidents/report',
          icon: Plus,
          variant: 'default',
        },
        {
          label: t('actionCenter.actions.viewAll', 'View All'),
          href: '/incidents',
          icon: Eye,
        },
        {
          label: t('actionCenter.actions.myActions', 'My Actions'),
          href: '/incidents/my-actions',
          icon: CheckSquare,
          badge: stats.pending + stats.overdue,
          badgeVariant: stats.overdue > 0 ? 'destructive' : 'secondary',
        },
        {
          label: t('actionCenter.actions.investigate', 'Investigation Workspace'),
          href: '/incidents/investigate',
          icon: Search,
          badge: stats.openInvestigations,
          showOnlyWithBadge: true,
        },
        {
          label: t('actionCenter.actions.pendingApprovals', 'Pending Approvals'),
          href: '/incidents/my-actions',
          icon: ClipboardList,
          badge: stats.pendingApprovals,
          badgeVariant: 'destructive',
          showOnlyWithBadge: true,
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
