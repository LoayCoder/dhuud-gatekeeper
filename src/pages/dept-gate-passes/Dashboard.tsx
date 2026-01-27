import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MenuBasedAdminRoute } from "@/components/auth/MenuBasedAdminRoute";
import { 
  FileKey, 
  Clock, 
  CheckCircle2, 
  CalendarCheck,
  ArrowRight,
  AlertCircle
} from "lucide-react";
import { Link } from "react-router-dom";
import { useDeptGatePassStats, useDeptGatePasses } from "@/hooks/contractor-management/use-dept-gate-passes";
import { format } from "date-fns";

function DeptGatePassDashboardContent() {
  const { t } = useTranslation();
  const { data: stats, isLoading: statsLoading } = useDeptGatePassStats();
  const { data: recentPasses, isLoading: passesLoading } = useDeptGatePasses();

  const statCards = [
    {
      title: t("deptGatePasses.dashboard.totalPasses", "Total Passes"),
      value: stats?.total ?? 0,
      icon: FileKey,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: t("deptGatePasses.dashboard.pendingApproval", "Pending Approval"),
      value: stats?.pending ?? 0,
      icon: Clock,
      color: "text-warning",
      bgColor: "bg-warning/10",
    },
    {
      title: t("deptGatePasses.dashboard.approvedToday", "Approved Today"),
      value: stats?.approvedToday ?? 0,
      icon: CheckCircle2,
      color: "text-success",
      bgColor: "bg-success/10",
    },
    {
      title: t("deptGatePasses.dashboard.completedThisWeek", "Completed This Week"),
      value: stats?.completedThisWeek ?? 0,
      icon: CalendarCheck,
      color: "text-info",
      bgColor: "bg-info/10",
    },
  ];

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "success" | "warning" | "destructive"; label: string }> = {
      pending: { variant: "warning", label: t("gatePasses.status.pending", "Pending") },
      pm_approved: { variant: "secondary", label: t("gatePasses.status.pm_approved", "PM Approved") },
      approved: { variant: "success", label: t("gatePasses.status.approved", "Approved") },
      rejected: { variant: "destructive", label: t("gatePasses.status.rejected", "Rejected") },
      entry_verified: { variant: "default", label: t("gatePasses.status.entry_verified", "Entry Verified") },
      completed: { variant: "success", label: t("gatePasses.status.completed", "Completed") },
    };
    const config = variants[status] || { variant: "secondary" as const, label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight">
          {t("deptGatePasses.dashboard.title", "Gate Pass Dashboard")}
        </h1>
        <p className="text-muted-foreground">
          {t("deptGatePasses.dashboard.description", "Manage gate passes for your department")}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => (
          <Card key={index}>
            <CardContent className="pt-6">
              {statsLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-16" />
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.title}</p>
                    <p className="text-3xl font-bold">{stat.value}</p>
                  </div>
                  <div className={`p-3 rounded-full ${stat.bgColor}`}>
                    <stat.icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link to="/dept-gate-passes/approvals" className="block">
          <Card className="h-full hover:bg-accent/50 transition-colors cursor-pointer">
            <CardContent className="pt-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-warning" />
                <span className="font-medium">
                  {t("deptGatePasses.dashboard.reviewPending", "Review Pending")}
                </span>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground rtl:rotate-180" />
            </CardContent>
          </Card>
        </Link>
        
        <Link to="/dept-gate-passes/today" className="block">
          <Card className="h-full hover:bg-accent/50 transition-colors cursor-pointer">
            <CardContent className="pt-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CalendarCheck className="h-5 w-5 text-success" />
                <span className="font-medium">
                  {t("deptGatePasses.dashboard.viewToday", "View Today's Passes")}
                </span>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground rtl:rotate-180" />
            </CardContent>
          </Card>
        </Link>
        
        <Link to="/dept-gate-passes/list" className="block">
          <Card className="h-full hover:bg-accent/50 transition-colors cursor-pointer">
            <CardContent className="pt-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileKey className="h-5 w-5 text-primary" />
                <span className="font-medium">
                  {t("deptGatePasses.dashboard.viewAll", "View All Passes")}
                </span>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground rtl:rotate-180" />
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Recent Passes */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>{t("deptGatePasses.dashboard.recentPasses", "Recent Gate Passes")}</CardTitle>
            <CardDescription>
              {t("deptGatePasses.dashboard.recentPassesDesc", "Latest gate passes in your department")}
            </CardDescription>
          </div>
          <Button variant="outline" asChild>
            <Link to="/dept-gate-passes/list">
              {t("common.viewAll", "View All")}
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {passesLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : !recentPasses?.length ? (
            <div className="text-center py-8 text-muted-foreground">
              {t("deptGatePasses.dashboard.noRecentPasses", "No recent gate passes")}
            </div>
          ) : (
            <div className="space-y-3">
              {recentPasses.slice(0, 5).map(pass => (
                <div 
                  key={pass.id} 
                  className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{pass.reference_number}</span>
                      {getStatusBadge(pass.status)}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-1">
                      {pass.material_description}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {pass.project?.project_name} • {pass.pass_date && format(new Date(pass.pass_date), "PP")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function DeptGatePassDashboard() {
  return (
    <MenuBasedAdminRoute menuCode="dept_gate_pass_dashboard">
      <DeptGatePassDashboardContent />
    </MenuBasedAdminRoute>
  );
}
