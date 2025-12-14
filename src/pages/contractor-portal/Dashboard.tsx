import { useTranslation } from "react-i18next";
import { Users, FolderKanban, Truck, CheckCircle, AlertTriangle, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import ContractorPortalLayout from "@/components/contractor-portal/ContractorPortalLayout";
import { useContractorPortalData, useContractorGatePasses } from "@/hooks/contractor-management";

export default function ContractorPortalDashboard() {
  const { t } = useTranslation();
  const { company, projects, workers, isLoading } = useContractorPortalData();
  const { data: gatePasses } = useContractorGatePasses(company?.id);

  const activeProjects = projects?.filter(p => p.status === "active") || [];
  const approvedWorkers = workers?.filter(w => w.approval_status === "approved") || [];
  const pendingWorkers = workers?.filter(w => w.approval_status === "pending") || [];
  const pendingGatePasses = gatePasses?.filter(gp => gp.status === "pending_pm_approval" || gp.status === "pending_safety_approval") || [];

  if (isLoading) {
    return (
      <ContractorPortalLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </ContractorPortalLayout>
    );
  }

  return (
    <ContractorPortalLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">
            {t("contractorPortal.dashboard.welcome", "Welcome")}, {company?.company_name}
          </h1>
          <p className="text-muted-foreground">
            {t("contractorPortal.dashboard.overview", "Overview of your company's operations")}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                {t("contractorPortal.dashboard.activeProjects", "Active Projects")}
              </CardTitle>
              <FolderKanban className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeProjects.length}</div>
              <p className="text-xs text-muted-foreground">
                {t("contractorPortal.dashboard.ofMaxProjects", "of 3 max allowed")}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                {t("contractorPortal.dashboard.approvedWorkers", "Approved Workers")}
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{approvedWorkers.length}</div>
              {pendingWorkers.length > 0 && (
                <p className="text-xs text-warning flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {pendingWorkers.length} {t("contractorPortal.dashboard.pendingApproval", "pending")}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                {t("contractorPortal.dashboard.gatePasses", "Gate Passes")}
              </CardTitle>
              <Truck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{gatePasses?.length || 0}</div>
              {pendingGatePasses.length > 0 && (
                <p className="text-xs text-warning flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {pendingGatePasses.length} {t("contractorPortal.dashboard.awaitingApproval", "awaiting")}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                {t("contractorPortal.dashboard.complianceStatus", "Compliance")}
              </CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                {company?.status === "active" ? (
                  <>
                    <Badge variant="default" className="bg-green-500">
                      {t("common.active", "Active")}
                    </Badge>
                  </>
                ) : (
                  <>
                    <Badge variant="destructive">
                      {company?.status}
                    </Badge>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity / Alerts */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FolderKanban className="h-5 w-5" />
                {t("contractorPortal.dashboard.yourProjects", "Your Projects")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activeProjects.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  {t("contractorPortal.dashboard.noActiveProjects", "No active projects")}
                </p>
              ) : (
                <div className="space-y-3">
                  {activeProjects.slice(0, 5).map((project) => (
                    <div key={project.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{project.project_name}</p>
                        <p className="text-sm text-muted-foreground">{project.project_code}</p>
                      </div>
                      <Badge variant="outline">
                        {project.assigned_workers_count} {t("contractors.workers.title", "Workers")}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                {t("contractorPortal.dashboard.pendingActions", "Pending Actions")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {pendingWorkers.length > 0 && (
                  <div className="flex items-center justify-between p-3 border border-warning/50 bg-warning/10 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-warning" />
                      <span>{t("contractorPortal.dashboard.workersAwaitingApproval", "Workers awaiting approval")}</span>
                    </div>
                    <Badge variant="outline">{pendingWorkers.length}</Badge>
                  </div>
                )}
                {pendingGatePasses.length > 0 && (
                  <div className="flex items-center justify-between p-3 border border-warning/50 bg-warning/10 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Truck className="h-4 w-4 text-warning" />
                      <span>{t("contractorPortal.dashboard.gatePassesPending", "Gate passes pending")}</span>
                    </div>
                    <Badge variant="outline">{pendingGatePasses.length}</Badge>
                  </div>
                )}
                {pendingWorkers.length === 0 && pendingGatePasses.length === 0 && (
                  <p className="text-muted-foreground text-sm">
                    {t("contractorPortal.dashboard.noPendingActions", "No pending actions")}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </ContractorPortalLayout>
  );
}
