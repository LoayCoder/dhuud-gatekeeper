import { useTranslation } from 'react-i18next';
import {
  Users,
  Plus,
  Settings,
  ArrowUpRight,
  Shield,
  Network,
} from 'lucide-react';
import { ActionModuleCard } from '../ActionModuleCard';
import type { ActionCenterStats } from '@/features/incidents';

interface UserManagementModuleProps {
  stats: ActionCenterStats['users'];
}

export function UserManagementModule({ stats }: UserManagementModuleProps) {
  const { t } = useTranslation();

  return (
    <ActionModuleCard
      title={t('actionCenter.modules.users.title', 'User Management')}
      description={t('actionCenter.modules.users.description', 'User creation, role assignment, and access control')}
      icon={Users}
      iconColorClass="text-primary"
      attentionCount={stats.pendingInvites}
      defaultExpanded={true}
      kpis={[
        { label: t('actionCenter.kpi.totalUsers', 'Total Users'), value: stats.totalUsers },
        { label: t('actionCenter.kpi.activeUsers', 'Active'), value: stats.activeUsers, colorClass: 'text-success' },
        { label: t('actionCenter.kpi.pendingInvites', 'Pending'), value: stats.pendingInvites, colorClass: 'text-warning' },
      ]}
      actionLinks={[
        {
          label: t('actionCenter.actions.manageUsers', 'Manage Users'),
          href: '/admin/users',
          icon: Users,
          variant: 'default',
        },
        {
          label: t('actionCenter.actions.roleAssignment', 'Role Assignment'),
          href: '/admin/users',
          icon: Shield,
        },
        {
          label: t('actionCenter.actions.menuAccess', 'Menu Access'),
          href: '/admin/menu-access',
          icon: Settings,
        },
        {
          label: t('actionCenter.actions.orgStructure', 'Org Structure'),
          href: '/admin/org-structure',
          icon: Network,
        },
        {
          label: t('actionCenter.actions.auditLog', 'Security Audit'),
          href: '/admin/security-audit',
          icon: ArrowUpRight,
        },
      ]}
    />
  );
}
