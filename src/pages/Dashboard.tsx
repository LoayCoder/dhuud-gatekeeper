import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, User } from 'lucide-react';
import { QuickActionsCard } from '@/components/dashboard/QuickActionsCard';
import { useModuleAccess } from '@/hooks/use-module-access';
import { useUserRoles } from '@/hooks/use-user-roles';
import { EnterprisePage } from '@/components/layout/EnterprisePage';
import { SectionHeader } from '@/components/ui/section-header';
import {
  MyQuickStats,
  MyActionsWidget,
  MyVisitorsWidget,
  MyGatePassesWidget,
  MyInspectionsWidget,
} from '@/components/dashboard/personal';

export default function Dashboard() {
  const { t } = useTranslation();
  const { user, profile } = useAuth();
  const { hasModule } = useModuleAccess();
  const { hasRole, hasRoleInCategory } = useUserRoles();

  // Module access checks
  const hasHSSEAccess = hasModule('hsse_core') || hasModule('incidents');
  const hasSecurityAccess = hasModule('security');
  const hasInspectionsAccess = hasModule('audits') || hasModule('hsse_core');

  // Role-based visibility
  const isSecurityRole = hasRole('security_guard') || hasRole('security_supervisor') || hasRole('security_manager');
  const isInspectorRole = hasRole('inspector') || hasRole('auditor') || hasRole('hsse_expert');
  const isHSSERole = hasRoleInCategory('hsse');
  const canSeeVisitors = hasSecurityAccess || isSecurityRole;
  const canSeeGatePasses = hasSecurityAccess;
  const canSeeInspections = hasInspectionsAccess || isInspectorRole;
  const canSeeActions = hasHSSEAccess || isHSSERole || hasRole('manager') || hasRole('department_representative');

  // Personalized greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    const name = profile?.full_name?.split(' ')[0] || '';
    
    if (hour < 12) {
      return t('dashboard.greetingMorning', 'Good morning{{name}}', { name: name ? `, ${name}` : '' });
    } else if (hour < 17) {
      return t('dashboard.greetingAfternoon', 'Good afternoon{{name}}', { name: name ? `, ${name}` : '' });
    } else {
      return t('dashboard.greetingEvening', 'Good evening{{name}}', { name: name ? `, ${name}` : '' });
    }
  };

  return (
    <EnterprisePage
      title={getGreeting()}
      description={t('dashboard.personalDescription', 'Your personal command center')}
    >
      {/* Section 1: My Quick Stats - KPI Strip */}
      <section className="space-y-3">
        <SectionHeader title={t('dashboard.personal.overview', 'Overview')} />
        <MyQuickStats />
      </section>

      {/* Section 2: Actions & Quick Actions */}
      <section className="space-y-3">
        <SectionHeader title={t('dashboard.personal.actionsTitle', 'Actions & Tasks')} />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {canSeeActions && <MyActionsWidget />}
          <QuickActionsCard />
        </div>
      </section>

      {/* Section 3: Visitors & Gate Passes (Security related) */}
      {(canSeeVisitors || canSeeGatePasses) && (
        <section className="space-y-3">
          <SectionHeader title={t('dashboard.personal.accessControl', 'Visitors & Access')} />
          <div className="grid gap-4 md:grid-cols-2">
            {canSeeVisitors && <MyVisitorsWidget />}
            {canSeeGatePasses && <MyGatePassesWidget />}
          </div>
        </section>
      )}

      {/* Section 4: My Inspections */}
      {canSeeInspections && (
        <section className="space-y-3">
          <SectionHeader title={t('dashboard.personal.inspections', 'My Inspections')} />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <MyInspectionsWidget />
          </div>
        </section>
      )}

      {/* Security Status Footer */}
      <Card variant="flat" status="completed" className="max-w-sm">
        <CardContent className="flex items-center gap-3 py-4">
          <div className="p-2 rounded-lg bg-success/10">
            <Shield className="h-5 w-5 text-success" />
          </div>
          <div>
            <p className="text-sm font-medium">{t('security.securityStatus')}</p>
            <p className="text-xs text-muted-foreground">{t('security.zeroTrustActive')}</p>
          </div>
        </CardContent>
      </Card>

      {/* User Profile Card */}
      <Card variant="flat" className="max-w-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">{t('dashboard.userProfile')}</CardTitle>
          </div>
          <CardDescription>{t('dashboard.accountInfo')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground">{t('auth.email')}</span>
            <p className="text-sm">{user?.email}</p>
          </div>
        </CardContent>
      </Card>
    </EnterprisePage>
  );
}
