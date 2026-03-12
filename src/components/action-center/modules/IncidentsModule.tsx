import { useState } from 'react';
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
import { ActionListSheet } from '../ActionListSheet';
import { InlineActionsPanel } from './InlineActionsPanel';
import { IncidentApprovalsList } from './IncidentApprovalsList';
import { IncidentInvestigationsList } from './IncidentInvestigationsList';
import { useMyCorrectiveActions } from '@/features/incidents';
import type { ActionCenterStats } from '@/features/incidents';
import { usePendingIncidentApprovals } from '@/hooks/use-pending-approvals';

interface IncidentsModuleProps {
  stats: ActionCenterStats['incidents'];
}

type SheetType = 'my-actions' | 'approvals' | 'investigations' | null;

export function IncidentsModule({ stats }: IncidentsModuleProps) {
  const { t } = useTranslation();
  const [openSheet, setOpenSheet] = useState<SheetType>(null);

  // Fetch user-specific count for the badge
  const { data: myActions } = useMyCorrectiveActions();
  const { data: pendingApprovals } = usePendingIncidentApprovals();
  const myOpenActions = ((myActions || []) as Array<{ status: string }>).filter(
    (a) => a.status !== 'completed' && a.status !== 'verified' && a.status !== 'closed'
  );
  const pendingApprovalsCount = (pendingApprovals || []).length;

  const handleKpiClick = (kpiLabel: string) => {
    if (kpiLabel === t('actionCenter.kpi.overdue', 'Overdue')) {
      setOpenSheet('my-actions'); // Overdue maps to user's own actions
    } else if (kpiLabel === t('actionCenter.kpi.pending', 'Pending')) {
      setOpenSheet('approvals');
    } else if (kpiLabel === t('actionCenter.kpi.investigations', 'Investigations')) {
      setOpenSheet('investigations');
    }
  };

  return (
    <>
      <ActionModuleCard
        title={t('actionCenter.modules.incidents.title', 'Incidents Management')}
        description={t('actionCenter.modules.incidents.description', 'Report, investigate, track, and close incidents')}
        icon={AlertTriangle}
        iconColorClass="text-destructive"
        attentionCount={stats.overdue + pendingApprovalsCount}
        hasCritical={stats.overdue > 0}
        kpis={[
          { label: t('actionCenter.kpi.overdue', 'Overdue'), value: stats.overdue, colorClass: 'text-destructive', onClick: () => handleKpiClick(t('actionCenter.kpi.overdue', 'Overdue')) },
          { label: t('actionCenter.kpi.pending', 'Pending'), value: pendingApprovalsCount, colorClass: 'text-warning', onClick: () => setOpenSheet('approvals') },
          { label: t('actionCenter.kpi.investigations', 'Investigations'), value: stats.openInvestigations, colorClass: 'text-info', onClick: () => setOpenSheet('investigations') },
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
            icon: CheckSquare,
            badge: myOpenActions.length,
            badgeVariant: myOpenActions.some((a) => a.status === 'overdue') ? 'destructive' : 'secondary',
            onExpand: () => setOpenSheet(openSheet === 'my-actions' ? null : 'my-actions'),
            isExpanded: openSheet === 'my-actions',
          },
          {
            label: t('actionCenter.actions.investigate', 'Investigation Workspace'),
            icon: Search,
            badge: stats.openInvestigations,
            showOnlyWithBadge: true,
            onExpand: () => setOpenSheet(openSheet === 'investigations' ? null : 'investigations'),
            isExpanded: openSheet === 'investigations',
          },
          {
            label: t('actionCenter.actions.pendingApprovals', 'Pending Approvals'),
            icon: ClipboardList,
            badge: stats.pendingApprovals,
            badgeVariant: 'destructive',
            showOnlyWithBadge: true,
            onExpand: () => setOpenSheet(openSheet === 'approvals' ? null : 'approvals'),
            isExpanded: openSheet === 'approvals',
          },
          {
            label: t('actionCenter.actions.dashboard', 'Dashboard'),
            href: '/incidents/dashboard',
            icon: ArrowUpRight,
          },
        ]}
      />

      {/* Sheets */}
      <ActionListSheet
        open={openSheet === 'my-actions'}
        onOpenChange={(open) => setOpenSheet(open ? 'my-actions' : null)}
        title={t('actionCenter.sheet.myActions', 'My Actions')}
        description={t('actionCenter.sheet.myActionsDesc', 'Corrective actions assigned to you')}
        badge={myOpenActions.length}
      >
        <InlineActionsPanel />
      </ActionListSheet>

      <ActionListSheet
        open={openSheet === 'approvals'}
        onOpenChange={(open) => setOpenSheet(open ? 'approvals' : null)}
        title={t('actionCenter.sheet.pendingApprovals', 'Pending Approvals')}
        description={t('actionCenter.sheet.pendingApprovalsDesc', 'Incidents awaiting your review')}
      >
        <IncidentApprovalsList />
      </ActionListSheet>

      <ActionListSheet
        open={openSheet === 'investigations'}
        onOpenChange={(open) => setOpenSheet(open ? 'investigations' : null)}
        title={t('actionCenter.sheet.investigations', 'My Investigations')}
        description={t('actionCenter.sheet.investigationsDesc', 'Investigations assigned to you')}
      >
        <IncidentInvestigationsList />
      </ActionListSheet>
    </>
  );
}
