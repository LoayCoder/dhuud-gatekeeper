import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FileKey,
  Plus,
  ArrowUpRight,
  ClipboardList,
  Calendar,
  Eye,
} from 'lucide-react';
import { ActionModuleCard } from '../ActionModuleCard';
import { ActionListSheet } from '../ActionListSheet';
import { GatePassApprovalsList } from './GatePassApprovalsList';
import { usePendingGatePassApprovals } from '@/features/contractors/hooks/use-material-gate-passes';
import type { ActionCenterStats } from '@/features/incidents';

interface GatePassesModuleProps {
  stats: ActionCenterStats['gatePasses'];
}

type SheetType = 'approvals' | null;

export function GatePassesModule({ stats }: GatePassesModuleProps) {
  const { t } = useTranslation();
  const [openSheet, setOpenSheet] = useState<SheetType>(null);

  const { data: pendingApprovals } = usePendingGatePassApprovals();
  const pendingCount = (pendingApprovals || []).length;

  return (
    <>
      <ActionModuleCard
        title={t('actionCenter.modules.gatePasses.title', 'Gate Passes')}
        description={t('actionCenter.modules.gatePasses.description', 'People, vehicle, and material gate passes with approval workflows')}
        icon={FileKey}
        iconColorClass="text-primary"
        attentionCount={stats.pendingApprovals}
        hasCritical={false}
        kpis={[
          { label: t('actionCenter.kpi.pendingApproval', 'Pending'), value: pendingCount, colorClass: 'text-warning', onClick: () => setOpenSheet('approvals') },
          { label: t('actionCenter.kpi.active', 'Active'), value: stats.todayActive, colorClass: 'text-info' },
          { label: t('actionCenter.kpi.completed', 'Completed'), value: stats.completed, colorClass: 'text-success' },
          { label: t('actionCenter.kpi.total', 'Total'), value: stats.total },
        ]}
        actionLinks={[
          {
            label: t('actionCenter.actions.createGatePass', 'Create Gate Pass'),
            href: '/my-gate-passes/create',
            icon: Plus,
            variant: 'default',
          },
          {
            label: t('actionCenter.actions.myGatePasses', 'My Gate Passes'),
            href: '/my-gate-passes',
            icon: Eye,
          },
          {
            label: t('actionCenter.actions.pendingApprovals', 'Pending Approvals'),
            icon: ClipboardList,
            badge: pendingCount,
            badgeVariant: 'destructive',
            showOnlyWithBadge: false,
            onExpand: () => setOpenSheet(openSheet === 'approvals' ? null : 'approvals'),
            isExpanded: openSheet === 'approvals',
          },
          {
            label: t('actionCenter.actions.deptDashboard', 'Dept Dashboard'),
            href: '/dept-gate-passes',
            icon: ArrowUpRight,
          },
          {
            label: t('actionCenter.actions.todayPasses', "Today's Passes"),
            href: '/dept-gate-passes/today',
            icon: Calendar,
          },
          {
            label: t('actionCenter.actions.history', 'History'),
            href: '/my-gate-passes/history',
            icon: ClipboardList,
          },
        ]}
      />

      <ActionListSheet
        open={openSheet === 'approvals'}
        onOpenChange={(open) => setOpenSheet(open ? 'approvals' : null)}
        title={t('actionCenter.sheet.gatePassApprovals', 'Gate Pass Approvals')}
        description={t('actionCenter.sheet.gatePassApprovalsDesc', 'Gate passes awaiting your approval')}
        badge={pendingCount}
      >
        <GatePassApprovalsList />
      </ActionListSheet>
    </>
  );
}
