import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Eye,
  Plus,
  CheckSquare,
  ArrowUpRight,
  ClipboardList,
} from 'lucide-react';
import { ActionModuleCard } from '../ActionModuleCard';
import { ActionListSheet } from '../ActionListSheet';
import { InlineActionsPanel } from './InlineActionsPanel';
import { IncidentApprovalsList } from './IncidentApprovalsList';
import { useMyCorrectiveActions } from '@/features/incidents';
import type { ActionCenterStats } from '@/features/incidents';
import { usePendingIncidentApprovals } from '@/hooks/use-pending-approvals';

interface ObservationsModuleProps {
  stats: ActionCenterStats['observations'];
}

type SheetType = 'my-actions' | 'approvals' | null;

export function ObservationsModule({ stats }: ObservationsModuleProps) {
  const { t } = useTranslation();
  const [openSheet, setOpenSheet] = useState<SheetType>(null);

  // Fetch user-specific counts — filter to observations only
  const { data: myActions } = useMyCorrectiveActions();
  const { data: pendingApprovals } = usePendingIncidentApprovals();

  const myOpenActions = ((myActions || []) as Array<{ status: string; incident?: { event_type?: string | null } }>).filter(
    (a) => a.status !== 'completed' && a.status !== 'verified' && a.status !== 'closed' && (a as any).incident?.event_type === 'observation'
  );
  const pendingApprovalsCount = (pendingApprovals || []).filter((a) => a.event_type === 'observation').length;

  return (
    <>
      <ActionModuleCard
        title={t('actionCenter.modules.observations.title', 'Observations Management')}
        description={t('actionCenter.modules.observations.description', 'Submit, review, escalate, and close observations')}
        icon={Eye}
        iconColorClass="text-info"
        attentionCount={stats.overdue + stats.pending}
        hasCritical={stats.overdue > 0}
        kpis={[
          { label: t('actionCenter.kpi.overdue', 'Overdue'), value: stats.overdue, colorClass: 'text-destructive' },
          { label: t('actionCenter.kpi.pending', 'Pending'), value: pendingApprovalsCount, colorClass: 'text-warning', onClick: () => setOpenSheet('approvals') },
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
            label: t('actionCenter.actions.pendingApprovals', 'Pending Approvals'),
            icon: ClipboardList,
            badge: pendingApprovalsCount,
            badgeVariant: 'destructive',
            showOnlyWithBadge: false,
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
        <InlineActionsPanel eventTypeFilter="observation" />
      </ActionListSheet>

      <ActionListSheet
        open={openSheet === 'approvals'}
        onOpenChange={(open) => setOpenSheet(open ? 'approvals' : null)}
        title={t('actionCenter.sheet.pendingApprovals', 'Pending Approvals')}
        description={t('actionCenter.sheet.pendingApprovalsDesc', 'Observations awaiting your review')}
      >
        <IncidentApprovalsList eventTypeFilter="observation" />
      </ActionListSheet>
    </>
  );
}
