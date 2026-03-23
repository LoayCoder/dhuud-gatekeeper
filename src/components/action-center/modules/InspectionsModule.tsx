import { useState } from 'react';
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
import { ActionListSheet } from '../ActionListSheet';
import { InspectionActionsList } from './InspectionActionsList';
import { useMyInspectionActions } from '@/features/incidents';
import type { ActionCenterStats } from '@/features/incidents';

interface InspectionsModuleProps {
  stats: ActionCenterStats['inspections'];
}

type SheetType = 'my-actions' | null;

export function InspectionsModule({ stats }: InspectionsModuleProps) {
  const { t } = useTranslation();
  const [openSheet, setOpenSheet] = useState<SheetType>(null);

  const { data: inspectionActions } = useMyInspectionActions('inspection');
  const openActions = (inspectionActions || []).filter(
    (a) => a.status !== 'completed' && a.status !== 'verified' && a.status !== 'closed'
  );

  return (
    <>
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
          { label: t('actionCenter.kpi.pendingActions', 'Pending Actions'), value: stats.pendingActions, colorClass: 'text-info', onClick: () => setOpenSheet('my-actions') },
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
    </>
  );
}
