import { useTranslation } from 'react-i18next';
import {
  FileKey,
  Plus,
  CheckSquare,
  ArrowUpRight,
  ClipboardList,
  Calendar,
  Eye,
} from 'lucide-react';
import { ActionModuleCard } from '../ActionModuleCard';
import type { ActionCenterStats } from '@/features/incidents';

interface GatePassesModuleProps {
  stats: ActionCenterStats['gatePasses'];
}

export function GatePassesModule({ stats }: GatePassesModuleProps) {
  const { t } = useTranslation();

  return (
    <ActionModuleCard
      title={t('actionCenter.modules.gatePasses.title', 'Gate Passes')}
      description={t('actionCenter.modules.gatePasses.description', 'People, vehicle, and material gate passes with approval workflows')}
      icon={FileKey}
      iconColorClass="text-primary"
      attentionCount={stats.pendingApprovals}
      hasCritical={false}
      kpis={[
        { label: t('actionCenter.kpi.pendingApproval', 'Pending'), value: stats.pendingApprovals, colorClass: 'text-warning' },
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
          href: '/dept-gate-passes/approvals',
          icon: ClipboardList,
          badge: stats.pendingApprovals,
          badgeVariant: 'destructive',
          showOnlyWithBadge: true,
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
  );
}
