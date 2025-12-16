import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  FileWarning, 
  ClipboardCheck, 
  Plus, 
  Clock, 
  CheckCircle2, 
  AlertTriangle,
  Flame,
  Construction,
  Radiation,
  Shovel,
  Zap,
  Shield
} from "lucide-react";
import { Link } from "react-router-dom";
import { usePTWProjects } from "@/hooks/ptw";
import { usePTWPermits } from "@/hooks/ptw";
import { Skeleton } from "@/components/ui/skeleton";

const permitTypeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  hot_work: Flame,
  lifting: Construction,
  radiography: Radiation,
  excavation: Shovel,
  confined_space: Shield,
  electrical: Zap,
  general: FileWarning,
};

export default function PTWDashboard() {
  const { t } = useTranslation();
  const { data: projects, isLoading: projectsLoading } = usePTWProjects();
  const { data: permits, isLoading: permitsLoading } = usePTWPermits();

  const stats = {
    activeProjects: projects?.filter(p => p.status === "active").length || 0,
    pendingMobilization: projects?.filter(p => p.status === "pending_clearance").length || 0,
    activePermits: permits?.filter(p => ["active", "issued"].includes(p.status)).length || 0,
    pendingPermits: permits?.filter(p => ["requested", "endorsed"].includes(p.status)).length || 0,
  };

  const recentPermits = permits?.slice(0, 5) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {t("ptw.dashboard.title", "Permit to Work")}
          </h1>
          <p className="text-muted-foreground">
            {t("ptw.dashboard.description", "Manage work permits and project mobilization")}
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link to="/ptw/mobilization">
              <ClipboardCheck className="me-2 h-4 w-4" />
              {t("ptw.nav.mobilization", "Mobilization")}
            </Link>
          </Button>
          <Button asChild>
            <Link to="/ptw/create">
              <Plus className="me-2 h-4 w-4" />
              {t("ptw.nav.createPermit", "New Permit")}
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("ptw.stats.activeProjects", "Active Projects")}
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            {projectsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{stats.activeProjects}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("ptw.stats.pendingMobilization", "Pending Mobilization")}
            </CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            {projectsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{stats.pendingMobilization}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("ptw.stats.activePermits", "Active Permits")}
            </CardTitle>
            <FileWarning className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            {permitsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{stats.activePermits}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("ptw.stats.pendingApproval", "Pending Approval")}
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            {permitsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{stats.pendingPermits}</div>
            )}
          </CardContent>
        </Card>
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
                          permit.status === "active" ? "default" :
                          permit.status === "closed" ? "secondary" :
                          permit.status === "cancelled" ? "destructive" :
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
    </div>
  );
}
