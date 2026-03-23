import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ShieldCheck,
  Plus,
  ArrowUpRight,
  Eye,
  ClipboardList,
} from 'lucide-react';
import { ActionModuleCard } from '../ActionModuleCard';
import { ActionListSheet } from '../ActionListSheet';
import { InspectionActionsList } from './InspectionActionsList';
import { useMyInspectionActions } from '@/features/incidents';
import type { ActionCenterStats } from '@/features/incidents';

interface AuditsModuleProps {
  stats: ActionCenterStats['audits'];
}

type SheetType = 'findings' | null;

export function AuditsModule({ stats }: AuditsModuleProps) {
  const { t } = useTranslation();
  const [openSheet, setOpenSheet] = useState<SheetType>(null);

  const { data: inspectionActions } = useMyInspectionActions('audit');
  const openFindings = (inspectionActions || []).filter(
    (a) => a.status !== 'completed' && a.status !== 'verified' && a.status !== 'closed'
  );

  return (
    <>
      <ActionModuleCard
        title={t('actionCenter.modules.audits.title', 'Audits')}
        description={t('actionCenter.modules.audits.description', 'Audit planning, execution, findings, and corrective action tracking')}
        icon={ShieldCheck}
        iconColorClass="text-primary"
        attentionCount={stats.openFindings}
        hasCritical={stats.overdue > 0}
        kpis={[
          { label: t('actionCenter.kpi.openFindings', 'Open Findings'), value: stats.openFindings, colorClass: 'text-warning', onClick: () => setOpenSheet('findings') },
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
            icon: ClipboardList,
            badge: openFindings.length,
            badgeVariant: 'destructive',
            showOnlyWithBadge: false,
            onExpand: () => setOpenSheet(openSheet === 'findings' ? null : 'findings'),
            isExpanded: openSheet === 'findings',
          },
          {
            label: t('actionCenter.actions.dashboard', 'Dashboard'),
            href: '/inspections/dashboard',
            icon: ArrowUpRight,
          },
        ]}
      />

      <ActionListSheet
        open={openSheet === 'findings'}
        onOpenChange={(open) => setOpenSheet(open ? 'findings' : null)}
        title={t('actionCenter.sheet.openFindings', 'Open Findings')}
        description={t('actionCenter.sheet.openFindingsDesc', 'Audit findings requiring corrective action')}
        badge={openFindings.length}
      >
        <InspectionActionsList sourceType="audit" />
      </ActionListSheet>
    </>
  );
}
