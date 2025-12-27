import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield } from 'lucide-react';
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
    <div className="flex flex-1 flex-col gap-4">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">{t('dashboard.welcomeTitle')}</h2>
        <p className="text-muted-foreground">
          {t('dashboard.welcomeSubtitle')}
        </p>
      </div>

      {/* Module Stats Grid */}
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

      {/* Quick Actions and Info Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <QuickActionsCard />
        <InstallAppCard />
        
        <Card>
          <CardHeader>
            <CardTitle>{t('dashboard.userProfile')}</CardTitle>
            <CardDescription>{t('dashboard.accountInfo')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div>
                <span className="text-sm font-medium">{t('auth.email')}:</span>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('security.securityStatus')}</CardTitle>
            <CardDescription>{t('security.zeroTrustActive')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-green-600">
              <Shield className="h-5 w-5" />
              <span className="font-medium">{t('security.protected')}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Asset Health Widgets */}
      {hasAssetAccess && (
        <div className="grid gap-4 md:grid-cols-3">
          <FleetHealthOverviewWidget />
          <AtRiskAssetsWidget />
          <MaintenanceComplianceWidget />
        </div>
      )}

      {/* HSSE-Specific Widgets */}
      {hasHSSEAccess && (
        <div className="grid gap-4 md:grid-cols-2">
          <OverdueActionsWidget />
          {(hasRole('hsse_manager') || hasRole('admin')) && <PendingClosureRequestsWidget />}
        </div>
      )}

      <div className="min-h-[100px] flex-1 rounded-xl bg-muted/50" />
    </div>
  );
}
