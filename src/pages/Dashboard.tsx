import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, User } from 'lucide-react';
import { OverdueActionsWidget } from '@/components/dashboard/OverdueActionsWidget';
import { PendingClosureRequestsWidget } from '@/components/dashboard/PendingClosureRequestsWidget';
import { PTWActivePermitsWidget } from '@/components/dashboard/PTWActivePermitsWidget';
import { SecurityAlertsSummaryWidget } from '@/components/dashboard/SecurityAlertsSummaryWidget';
import { InspectionDueWidget } from '@/components/dashboard/InspectionDueWidget';
import { ContractorStatsWidget } from '@/components/dashboard/ContractorStatsWidget';
import { QuickActionsCard } from '@/components/dashboard/QuickActionsCard';
import { InstallAppCard } from '@/components/dashboard/InstallAppCard';
import { FleetHealthOverviewWidget } from '@/components/dashboard/FleetHealthOverviewWidget';
import { AtRiskAssetsWidget } from '@/components/dashboard/AtRiskAssetsWidget';
import { MaintenanceComplianceWidget } from '@/components/dashboard/MaintenanceComplianceWidget';
import { useModuleAccess } from '@/hooks/use-module-access';
import { useUserRoles } from '@/hooks/use-user-roles';
import { useDashboardStats } from '@/hooks/use-dashboard-stats';
import { EnterprisePage } from '@/components/layout/EnterprisePage';
import { SectionHeader } from '@/components/ui/section-header';

export default function Dashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { hasModule } = useModuleAccess();
  const { hasRole } = useUserRoles();
  const { data: stats, isLoading: statsLoading } = useDashboardStats();

  const hasHSSEAccess = hasModule('hsse_core') || hasModule('incidents');
  const hasPTWAccess = hasModule('ptw');
  const hasSecurityAccess = hasModule('security');
  const hasInspectionsAccess = hasModule('audits') || hasModule('hsse_core');
  const hasAssetAccess = hasModule('asset_management');

  return (
    <EnterprisePage
      title={t('dashboard.welcomeTitle')}
      description={t('dashboard.welcomeSubtitle')}
    >
      {/* Module Stats Summary */}
      <section className="space-y-3">
        <SectionHeader title={t('dashboard.operationalOverview', 'Operational Overview')} />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {hasPTWAccess && (
            <PTWActivePermitsWidget
              activePermits={stats?.ptw.active_permits || 0}
              pendingApprovals={stats?.ptw.pending_approvals || 0}
              expiringToday={stats?.ptw.expiring_today || 0}
              isLoading={statsLoading}
            />
          )}
          
          {hasSecurityAccess && (
            <SecurityAlertsSummaryWidget
              openAlerts={stats?.security.open_alerts || 0}
              criticalAlerts={stats?.security.critical_alerts || 0}
              visitorsOnSite={stats?.security.visitors_on_site || 0}
              isLoading={statsLoading}
            />
          )}
          
          {hasInspectionsAccess && (
            <InspectionDueWidget
              dueToday={stats?.inspections.due_today || 0}
              overdue={stats?.inspections.overdue || 0}
              completedThisWeek={stats?.inspections.completed_this_week || 0}
              isLoading={statsLoading}
            />
          )}
          
          <ContractorStatsWidget
            activeWorkers={stats?.contractors.active_workers || 0}
            pendingApprovals={stats?.contractors.pending_approvals || 0}
            expiringInductions={stats?.contractors.expiring_inductions || 0}
            isLoading={statsLoading}
          />
        </div>
      </section>

      {/* Quick Actions and Info Cards */}
      <section className="space-y-3">
        <SectionHeader title={t('dashboard.quickActions', 'Quick Actions')} />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <QuickActionsCard />
          <InstallAppCard />
          
          <Card variant="flat">
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
        </div>
      </section>

      {/* Security Status */}
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

      {/* Asset Health Widgets */}
      {hasAssetAccess && (
        <section className="space-y-3">
          <SectionHeader title={t('assets.fleetHealth', 'Asset Health')} />
          <div className="grid gap-4 md:grid-cols-3">
            <FleetHealthOverviewWidget />
            <AtRiskAssetsWidget />
            <MaintenanceComplianceWidget />
          </div>
        </section>
      )}

      {/* HSSE-Specific Widgets */}
      {hasHSSEAccess && (
        <section className="space-y-3">
          <SectionHeader title={t('hsseDashboard.actionsRequiringAttention', 'Actions Requiring Attention')} />
          <div className="grid gap-4 md:grid-cols-2">
            <OverdueActionsWidget />
            {(hasRole('hsse_manager') || hasRole('admin')) && <PendingClosureRequestsWidget />}
          </div>
        </section>
      )}
    </EnterprisePage>
  );
}
