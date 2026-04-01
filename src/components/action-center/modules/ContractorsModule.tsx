import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Briefcase,
  Plus,
  ArrowUpRight,
  ClipboardList,
  Eye,
  Users,
  FileKey,
} from 'lucide-react';
import { ActionModuleCard } from '../ActionModuleCard';
import { ActionListSheet } from '../ActionListSheet';
import { ContractorApprovalsList } from './ContractorApprovalsList';
import { usePendingCompanyApprovals } from '@/features/contractors/hooks/use-contractor-companies';
import type { ActionCenterStats } from '@/features/incidents';

interface ContractorsModuleProps {
  stats: ActionCenterStats['contractors'];
}

type SheetType = 'approvals' | null;

export function ContractorsModule({ stats }: ContractorsModuleProps) {
  const { t } = useTranslation();
  const [openSheet, setOpenSheet] = useState<SheetType>(null);

  const { data: pendingCompanies } = usePendingCompanyApprovals();
  const pendingCount = (pendingCompanies || []).length;

  return (
    <>
      <ActionModuleCard
        title={t('actionCenter.modules.contractors.title', 'Contractors Management')}
        description={t('actionCenter.modules.contractors.description', 'Contractor registration, approval, and compliance monitoring')}
        icon={Briefcase}
        iconColorClass="text-primary"
        attentionCount={stats.pendingApprovals}
        hasCritical={stats.pendingApprovals > 0}
        kpis={[
          { label: t('actionCenter.kpi.pendingApproval', 'Pending'), value: pendingCount, colorClass: 'text-warning', onClick: () => setOpenSheet('approvals') },
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
            icon: ClipboardList,
            badge: pendingCount,
            badgeVariant: 'destructive',
            showOnlyWithBadge: false,
            onExpand: () => setOpenSheet(openSheet === 'approvals' ? null : 'approvals'),
            isExpanded: openSheet === 'approvals',
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

      <ActionListSheet
        open={openSheet === 'approvals'}
        onOpenChange={(open) => setOpenSheet(open ? 'approvals' : null)}
        title={t('actionCenter.sheet.contractorApprovals', 'Contractor Approvals')}
        description={t('actionCenter.sheet.contractorApprovalsDesc', 'Companies awaiting approval')}
        badge={pendingCount}
      >
        <ContractorApprovalsList />
      </ActionListSheet>
    </>
  );
}
