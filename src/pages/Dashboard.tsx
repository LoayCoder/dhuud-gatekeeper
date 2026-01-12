import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { useModuleAccess } from '@/hooks/use-module-access';
import { useUserRoles } from '@/hooks/use-user-roles';
import { EnterprisePage } from '@/components/layout/EnterprisePage';
import { SectionHeader } from '@/components/ui/section-header';
import {
  DashboardHeader,
  HSEMessageCarousel,
  MyReportingStatsCard,
  MyRankCard,
  AIInsightsCard,
  QuickReportButtons,
  RecentActivityFeed,
  MyActionsWidget,
  MyVisitorsWidget,
  MyGatePassesWidget,
  MyInspectionsWidget,
  MyBadgesSection,
} from '@/components/dashboard/personal';

export default function Dashboard() {
  const { t } = useTranslation();
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

  return (
    <EnterprisePage
      title=""
      description=""
      className="space-y-6"
    >
      {/* Header with greeting */}
      <DashboardHeader />

      {/* HSE Message Carousel */}
      <HSEMessageCarousel />

      {/* My Stats Section */}
      <section className="space-y-3">
        <SectionHeader title={t('dashboard.stats.sectionTitle', 'My Statistics')} />
        <MyReportingStatsCard />
      </section>

      {/* Quick Actions */}
      <section className="space-y-3">
        <SectionHeader title={t('dashboard.quickActions.sectionTitle', 'Quick Actions')} />
        <QuickReportButtons />
      </section>

      {/* Recognition & Achievements - Side by Side */}
      <section className="space-y-3">
        <SectionHeader title={t('dashboard.recognition.sectionTitle', 'Recognition & Achievements')} />
        <div className="grid gap-4 md:grid-cols-2">
          <MyRankCard />
          <MyBadgesSection />
        </div>
      </section>

      {/* AI Insights */}
      <section className="space-y-3">
        <SectionHeader title={t('dashboard.insights.sectionTitle', 'AI Insights')} />
        <AIInsightsCard />
      </section>

      {/* Actions & Tasks (if user has access) */}
      {canSeeActions && (
        <section className="space-y-3">
          <SectionHeader title={t('dashboard.personal.actionsTitle', 'My Tasks')} />
          <div className="grid gap-4 md:grid-cols-2">
            <MyActionsWidget />
            <RecentActivityFeed />
          </div>
        </section>
      )}

      {/* Security Section */}
      {(canSeeVisitors || canSeeGatePasses) && (
        <section className="space-y-3">
          <SectionHeader title={t('dashboard.personal.accessControl', 'Visitors & Access')} />
          <div className="grid gap-4 md:grid-cols-2">
            {canSeeVisitors && <MyVisitorsWidget />}
            {canSeeGatePasses && <MyGatePassesWidget />}
          </div>
        </section>
      )}

      {/* Inspections */}
      {canSeeInspections && (
        <section className="space-y-3">
          <SectionHeader title={t('dashboard.personal.inspections', 'My Inspections')} />
          <MyInspectionsWidget />
        </section>
      )}
    </EnterprisePage>
  );
}
