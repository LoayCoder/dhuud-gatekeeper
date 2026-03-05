import { useTranslation } from 'react-i18next';
import {
  Briefcase,
  Plus,
  CheckSquare,
  ArrowUpRight,
  ClipboardList,
  Eye,
  Users,
  FileKey,
} from 'lucide-react';
import { ActionModuleCard } from '../ActionModuleCard';
import type { ActionCenterStats } from '@/features/incidents';

interface ContractorsModuleProps {
  stats: ActionCenterStats['contractors'];
}

export function ContractorsModule({ stats }: ContractorsModuleProps) {
  const { t } = useTranslation();

  return (
    <ActionModuleCard
      title={t('actionCenter.modules.contractors.title', 'Contractors Management')}
      description={t('actionCenter.modules.contractors.description', 'Contractor registration, approval, and compliance monitoring')}
      icon={Briefcase}
      iconColorClass="text-primary"
      attentionCount={stats.pendingApprovals}
      hasCritical={stats.pendingApprovals > 0}
      kpis={[
        { label: t('actionCenter.kpi.pendingApproval', 'Pending'), value: stats.pendingApprovals, colorClass: 'text-warning' },
        { label: t('actionCenter.kpi.approved', 'Approved'), value: stats.completed, colorClass: 'text-success' },
        { label: t('actionCenter.kpi.expiring', 'Expiring'), value: stats.expiringCompliance, colorClass: 'text-destructive' },
        { label: t('actionCenter.kpi.total', 'Total'), value: stats.total },
      ]}
      actionLinks={[
        {
          label: t('actionCenter.actions.registerContractor', 'Register Contractor'),
          href: '/contractors/companies',
          icon: Plus,
          variant: 'default',
        },
        {
          label: t('actionCenter.actions.viewCompanies', 'View Companies'),
          href: '/contractors/companies',
          icon: Eye,
        },
        {
          label: t('actionCenter.actions.pendingApprovals', 'Pending Approvals'),
          href: '/contractors/companies',
          icon: ClipboardList,
          badge: stats.pendingApprovals,
          badgeVariant: 'destructive',
          showOnlyWithBadge: true,
        },
        {
          label: t('actionCenter.actions.manageWorkers', 'Workers'),
          href: '/contractors/workers',
          icon: Users,
        },
        {
          label: t('actionCenter.actions.contractorGatePasses', 'Gate Passes'),
          href: '/contractors/gate-passes',
          icon: FileKey,
        },
        {
          label: t('actionCenter.actions.analytics', 'Analytics'),
          href: '/contractors/analytics',
          icon: ArrowUpRight,
        },
      ]}
    />
  );
}
