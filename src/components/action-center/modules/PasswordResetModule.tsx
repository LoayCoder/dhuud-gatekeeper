import { useTranslation } from 'react-i18next';
import {
  Key,
  Lock,
  ShieldCheck,
  ArrowUpRight,
  Users,
} from 'lucide-react';
import { ActionModuleCard } from '../ActionModuleCard';

export function PasswordResetModule() {
  const { t } = useTranslation();

  return (
    <ActionModuleCard
      title={t('actionCenter.modules.passwordReset.title', 'Password Reset')}
      description={t('actionCenter.modules.passwordReset.description', 'Secure self-service and admin-controlled password reset')}
      icon={Key}
      iconColorClass="text-warning"
      defaultExpanded={true}
      actionLinks={[
        {
          label: t('actionCenter.actions.resetPassword', 'Self-Service Reset'),
          href: '/forgot-password',
          icon: Lock,
          variant: 'default',
        },
        {
          label: t('actionCenter.actions.adminReset', 'Admin Reset (Manage Users)'),
          href: '/admin/users',
          icon: Users,
        },
        {
          label: t('actionCenter.actions.securityDashboard', 'Security Dashboard'),
          href: '/admin/security-dashboard',
          icon: ShieldCheck,
        },
        {
          label: t('actionCenter.actions.auditLog', 'Audit Log'),
          href: '/admin/security-audit',
          icon: ArrowUpRight,
        },
      ]}
    />
  );
}
