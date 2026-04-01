import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ClipboardCheck,
  Plus,
  CheckSquare,
  ArrowUpRight,
  Calendar,
  Eye,
  ClipboardList,
} from 'lucide-react';
import { ActionModuleCard } from '../ActionModuleCard';
import { ActionListSheet } from '../ActionListSheet';
import { InspectionActionsList } from './InspectionActionsList';
import { InspectionApprovalsList } from './InspectionApprovalsList';
import { useMyInspectionActions } from '@/features/incidents';
import { usePendingActionApprovals } from '@/hooks/use-pending-approvals';
import type { ActionCenterStats } from '@/features/incidents';

interface InspectionsModuleProps {
  stats: ActionCenterStats['inspections'];
}

type SheetType = 'my-actions' | 'approvals' | null;

export function InspectionsModule({ stats }: InspectionsModuleProps) {
  const { t } = useTranslation();
  const [openSheet, setOpenSheet] = useState<SheetType>(null);

  const { data: inspectionActions } = useMyInspectionActions('inspection');
  const openActions = (inspectionActions || []).filter(
    (a) => a.status !== 'completed' && a.status !== 'verified' && a.status !== 'closed'
  );

  // Count inspection-sourced actions pending verification
  const { data: allPendingActions } = usePendingActionApprovals();
  const inspectionApprovalCount = (allPendingActions || []).filter((a) => a.session_id != null).length;

  return (
    <>
      <ActionModuleCard
        title={t('actionCenter.modules.inspections.title', 'Inspections')}
        description={t('actionCenter.modules.inspections.description', 'Scheduled and ad-hoc inspections with follow-up actions')}
        icon={ClipboardCheck}
        iconColorClass="text-success"
        attentionCount={stats.overdue + stats.pendingActions + inspectionApprovalCount}
        hasCritical={stats.overdue > 0}
        kpis={[
          { label: t('actionCenter.kpi.overdue', 'Overdue'), value: stats.overdue, colorClass: 'text-destructive' },
          { label: t('actionCenter.kpi.scheduled', 'Scheduled'), value: stats.scheduled, colorClass: 'text-warning' },
          { label: t('actionCenter.kpi.pendingActions', 'Pending Actions'), value: stats.pendingActions, colorClass: 'text-info', onClick: () => setOpenSheet('my-actions') },
          { label: t('actionCenter.kpi.pendingVerification', 'Pending Verification'), value: inspectionApprovalCount, colorClass: 'text-warning', onClick: () => setOpenSheet('approvals') },
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
            icon: CheckSquare,
            badge: openActions.length,
            showOnlyWithBadge: false,
            onExpand: () => setOpenSheet(openSheet === 'my-actions' ? null : 'my-actions'),
            isExpanded: openSheet === 'my-actions',
          },
          {
            label: t('actionCenter.actions.pendingApprovals', 'Pending Approvals'),
            icon: ClipboardList,
            badge: inspectionApprovalCount,
            badgeVariant: 'destructive',
            showOnlyWithBadge: false,
            onExpand: () => setOpenSheet(openSheet === 'approvals' ? null : 'approvals'),
            isExpanded: openSheet === 'approvals',
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

      <ActionListSheet
        open={openSheet === 'my-actions'}
        onOpenChange={(open) => setOpenSheet(open ? 'my-actions' : null)}
        title={t('actionCenter.sheet.myInspectionActions', 'My Inspection Actions')}
        description={t('actionCenter.sheet.myInspectionActionsDesc', 'Corrective actions from inspections assigned to you')}
        badge={openActions.length}
      >
        <InspectionActionsList sourceType="inspection" />
      </ActionListSheet>

      <ActionListSheet
        open={openSheet === 'approvals'}
        onOpenChange={(open) => setOpenSheet(open ? 'approvals' : null)}
        title={t('actionCenter.sheet.inspectionApprovals', 'Inspection Action Approvals')}
        description={t('actionCenter.sheet.inspectionApprovalsDesc', 'Inspection actions pending your verification')}
        badge={inspectionApprovalCount}
        badgeVariant="destructive"
      >
        <InspectionApprovalsList />
      </ActionListSheet>
    </>
  );
}
