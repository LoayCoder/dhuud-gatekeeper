import { useTranslation } from "react-i18next";
import { Building2, FolderKanban, HardHat, Ticket, TrendingUp, AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useContractorCompanies } from "@/hooks/contractor-management/use-contractor-companies";
import { useContractorProjects } from "@/hooks/contractor-management/use-contractor-projects";
import { useContractorWorkers, usePendingWorkerApprovals } from "@/hooks/contractor-management/use-contractor-workers";
import { usePendingGatePassApprovals } from "@/hooks/contractor-management/use-material-gate-passes";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function ContractorDashboard() {
  const { t } = useTranslation();

  const { data: companies = [] } = useContractorCompanies();
  const { data: projects = [] } = useContractorProjects();
  const { data: workers = [] } = useContractorWorkers();
  const { data: pendingWorkers = [] } = usePendingWorkerApprovals();
  const { data: pendingPasses = [] } = usePendingGatePassApprovals();

  const activeCompanies = companies.filter((c) => c.status === "active").length;
  const activeProjects = projects.filter((p) => p.status === "active").length;
  const approvedWorkers = workers.filter((w) => w.approval_status === "approved").length;

  const stats = [
    {
      title: t("contractors.dashboard.activeCompanies", "Active Companies"),
      value: activeCompanies,
      total: companies.length,
      icon: Building2,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
      link: "/contractors/companies",
    },
    {
      title: t("contractors.dashboard.activeProjects", "Active Projects"),
      value: activeProjects,
      total: projects.length,
      icon: FolderKanban,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
      link: "/contractors/projects",
    },
    {
      title: t("contractors.dashboard.approvedWorkers", "Approved Workers"),
      value: approvedWorkers,
      total: workers.length,
      icon: HardHat,
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
      link: "/contractors/workers",
    },
    {
      title: t("contractors.dashboard.pendingApprovals", "Pending Approvals"),
      value: pendingWorkers.length + pendingPasses.length,
      icon: Clock,
      color: "text-yellow-500",
      bgColor: "bg-yellow-500/10",
      link: "/contractors/workers",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {t("contractors.dashboard.title", "Contractor Management")}
        </h1>
        <p className="text-muted-foreground">
          {t("contractors.dashboard.description", "Overview of contractor companies, projects, and workers")}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Link key={stat.title} to={stat.link}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div className={`p-2 rounded-full ${stat.bgColor}`}>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                {stat.total !== undefined && (
                  <p className="text-xs text-muted-foreground">
                    {t("contractors.dashboard.of", "of")} {stat.total} {t("contractors.dashboard.total", "total")}
                  </p>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Pending Worker Approvals */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              {t("contractors.dashboard.pendingWorkerApprovals", "Pending Worker Approvals")}
            </CardTitle>
            <Link to="/contractors/workers">
              <Button variant="ghost" size="sm">
                {t("common.viewAll", "View All")}
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {pendingWorkers.length === 0 ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <CheckCircle className="h-4 w-4 text-green-500" />
                {t("contractors.dashboard.noWorkersToApprove", "No pending worker approvals")}
              </div>
            ) : (
              <div className="space-y-2">
                {pendingWorkers.slice(0, 5).map((worker) => (
                  <div key={worker.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                    <div>
                      <p className="font-medium">{worker.full_name}</p>
                      <p className="text-sm text-muted-foreground">{worker.company?.company_name}</p>
                    </div>
                    <Clock className="h-4 w-4 text-yellow-500" />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending Gate Pass Approvals */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Ticket className="h-5 w-5 text-blue-500" />
              {t("contractors.dashboard.pendingGatePasses", "Pending Gate Passes")}
            </CardTitle>
            <Link to="/contractors/gate-passes">
              <Button variant="ghost" size="sm">
                {t("common.viewAll", "View All")}
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {pendingPasses.length === 0 ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <CheckCircle className="h-4 w-4 text-green-500" />
                {t("contractors.dashboard.noPassesToApprove", "No pending gate passes")}
              </div>
            ) : (
              <div className="space-y-2">
                {pendingPasses.slice(0, 5).map((pass) => (
                  <div key={pass.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                    <div>
                      <p className="font-medium">{pass.pass_number}</p>
                      <p className="text-sm text-muted-foreground">{pass.material_description}</p>
                    </div>
                    <Clock className="h-4 w-4 text-yellow-500" />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {t("contractors.dashboard.quickActions", "Quick Actions")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Link to="/contractors/companies">
              <Button variant="outline">
                <Building2 className="h-4 w-4 me-2" />
                {t("contractors.dashboard.addCompany", "Add Company")}
              </Button>
            </Link>
            <Link to="/contractors/projects">
              <Button variant="outline">
                <FolderKanban className="h-4 w-4 me-2" />
                {t("contractors.dashboard.addProject", "Add Project")}
              </Button>
            </Link>
            <Link to="/contractors/workers">
              <Button variant="outline">
                <HardHat className="h-4 w-4 me-2" />
                {t("contractors.dashboard.addWorker", "Add Worker")}
              </Button>
            </Link>
            <Link to="/contractors/gate-passes">
              <Button variant="outline">
                <Ticket className="h-4 w-4 me-2" />
                {t("contractors.dashboard.createGatePass", "Create Gate Pass")}
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
