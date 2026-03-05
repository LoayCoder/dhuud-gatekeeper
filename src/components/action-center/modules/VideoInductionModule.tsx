import { useTranslation } from 'react-i18next';
import {
  Video,
  Eye,
  CheckSquare,
  ArrowUpRight,
  ClipboardList,
  Settings,
} from 'lucide-react';
import { ActionModuleCard } from '../ActionModuleCard';
import type { ActionCenterStats } from '@/features/incidents';

interface VideoInductionModuleProps {
  stats: ActionCenterStats['videoInductions'];
}

export function VideoInductionModule({ stats }: VideoInductionModuleProps) {
  const { t } = useTranslation();

  return (
    <ActionModuleCard
      title={t('actionCenter.modules.videoInduction.title', 'Company Video Induction')}
      description={t('actionCenter.modules.videoInduction.description', 'Assignment, tracking, and verification of mandatory video inductions')}
      icon={Video}
      iconColorClass="text-info"
      attentionCount={stats.pending + stats.overdue}
      hasCritical={stats.overdue > 0}
      kpis={[
        { label: t('actionCenter.kpi.overdue', 'Overdue'), value: stats.overdue, colorClass: 'text-destructive' },
        { label: t('actionCenter.kpi.pending', 'Pending'), value: stats.pending, colorClass: 'text-warning' },
        { label: t('actionCenter.kpi.completed', 'Completed'), value: stats.completed, colorClass: 'text-success' },
        { label: t('actionCenter.kpi.totalAssigned', 'Total'), value: stats.totalAssigned },
      ]}
      actionLinks={[
        {
          label: t('actionCenter.actions.viewInductions', 'View Inductions'),
          href: '/contractors/induction-videos',
          icon: Eye,
          variant: 'default',
        },
        {
          label: t('actionCenter.actions.pendingVerification', 'Pending Verification'),
          href: '/contractors/induction-videos',
          icon: ClipboardList,
          badge: stats.pending,
          showOnlyWithBadge: true,
        },
        {
          label: t('actionCenter.actions.completionTracking', 'Completion Tracking'),
          href: '/contractors/induction-videos',
          icon: CheckSquare,
        },
        {
          label: t('actionCenter.actions.manageVideos', 'Manage Videos'),
          href: '/contractors/induction-videos',
          icon: Settings,
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
