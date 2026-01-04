import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  FileWarning, 
  ClipboardCheck, 
  Plus, 
  Flame,
  Construction,
  Radiation,
  Shovel,
  Zap,
  Shield,
  Mountain,
  Wrench
} from "lucide-react";
import { Link } from "react-router-dom";
import { usePTWPermits } from "@/hooks/ptw";
import { usePTWDashboardStats } from "@/hooks/ptw/use-ptw-dashboard-stats";
import { Skeleton } from "@/components/ui/skeleton";
import {
  PermitStatusChart,
  PermitTypeChart,
  PermitTrendChart,
  ExpiringPermitsWidget,
  PTWStatsRow,
} from "@/components/ptw/dashboard";
import { IntegrationAuditWidget } from "@/components/ptw/dashboard/IntegrationAuditWidget";
import { EnterprisePage } from "@/components/layout/EnterprisePage";

const permitTypeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  hot_work: Flame,
  lifting: Construction,
  radiography: Radiation,
  excavation: Shovel,
  confined_space: Shield,
  electrical: Zap,
  height: Mountain,
  cold_work: Wrench,
  general: FileWarning,
};

export default function PTWDashboard() {
  const { t } = useTranslation();
  const { data: permits, isLoading: permitsLoading } = usePTWPermits();
  const { stats, isLoading: statsLoading } = usePTWDashboardStats();

  const recentPermits = permits?.slice(0, 5) || [];
  const isLoading = permitsLoading || statsLoading;

  // Extract chart data from stats
  const statusData = stats?.statusBreakdown || [];
  const typeData = stats?.typeDistribution || [];
  const trendData = stats?.weeklyTrend || [];
  const expiringPermits = stats?.expiringPermits || [];

  return (
    <EnterprisePage
      title={t("ptw.dashboard.title", "Permit to Work")}
      description={t("ptw.dashboard.description", "Manage work permits and project mobilization")}
      primaryAction={{
        label: t("ptw.nav.createPermit", "New Permit"),
        href: "/ptw/create",
        icon: Plus,
      }}
      secondaryActions={[
        {
          label: t("ptw.nav.mobilization", "Mobilization"),
          href: "/ptw/mobilization",
          icon: ClipboardCheck,
        },
      ]}
    >

      {/* Enhanced Stats Row */}
      <PTWStatsRow
        activePermits={stats?.activePermits || 0}
        pendingPermits={stats?.pendingPermits || 0}
        expiringToday={stats?.expiringToday || 0}
        suspendedPermits={stats?.suspendedPermits || 0}
        extendedPermits={stats?.extendedPermits || 0}
        closedPermits={stats?.closedPermits || 0}
        isLoading={isLoading}
      />

      {/* Expiring Permits Alert */}
      <ExpiringPermitsWidget
        expiringToday={stats?.expiringToday || 0}
        expiringThisWeek={stats?.expiringThisWeek || 0}
        permits={expiringPermits}
        isLoading={isLoading}
      />

      {/* Charts Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <PermitStatusChart data={statusData} isLoading={isLoading} />
        <PermitTypeChart data={typeData} isLoading={isLoading} />
        <PermitTrendChart data={trendData} isLoading={isLoading} />
      </div>

      {/* Quick Actions & Recent Permits */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>{t("ptw.dashboard.quickActions", "Quick Actions")}</CardTitle>
            <CardDescription>
              {t("ptw.dashboard.quickActionsDesc", "Common permit to work operations")}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            <Button asChild variant="outline" className="justify-start">
              <Link to="/ptw/mobilization">
                <ClipboardCheck className="me-3 h-5 w-5" />
                {t("ptw.actions.viewMobilization", "View Project Mobilization")}
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-start">
              <Link to="/ptw/console">
                <FileWarning className="me-3 h-5 w-5" />
                {t("ptw.actions.permitConsole", "Permit Console (Map)")}
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-start">
              <Link to="/ptw/create">
                <Plus className="me-3 h-5 w-5" />
                {t("ptw.actions.requestPermit", "Request New Permit")}
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Recent Permits */}
        <Card>
          <CardHeader>
            <CardTitle>{t("ptw.dashboard.recentPermits", "Recent Permits")}</CardTitle>
            <CardDescription>
              {t("ptw.dashboard.recentPermitsDesc", "Latest permit requests")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {permitsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : recentPermits.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                {t("ptw.dashboard.noPermits", "No permits yet")}
              </p>
            ) : (
              <div className="space-y-3">
                {recentPermits.map((permit) => {
                  const IconComponent = permitTypeIcons[permit.permit_type?.code || "general"] || FileWarning;
                  return (
                    <Link 
                      key={permit.id} 
                      to={`/ptw/view/${permit.id}`}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors"
                    >
                      <div className="p-2 rounded-full bg-muted">
                        <IconComponent className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{permit.reference_id}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {permit.permit_type?.name} • {permit.project?.name}
                        </p>
                      </div>
                      <Badge 
                        variant={
                          permit.status === "active" || permit.status === "activated" ? "default" :
                          permit.status === "closed" ? "secondary" :
                          permit.status === "cancelled" || permit.status === "suspended" ? "destructive" :
                          "outline"
                        }
                      >
                        {permit.status}
                      </Badge>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Integration Audit Widget */}
      <IntegrationAuditWidget limit={10} />
    </EnterprisePage>
  );
}
