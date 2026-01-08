import { useTranslation } from "react-i18next";
import { Building2, FolderKanban, HardHat, Ticket, Clock, Users, Shield } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EnterprisePage } from "@/components/layout/EnterprisePage";
import { SectionHeader } from "@/components/ui/section-header";
import { Skeleton } from "@/components/ui/skeleton";
import { useContractorDashboardStats } from "@/hooks/contractor-management/use-contractor-dashboard-stats";
import { InductionComplianceWidget } from "@/components/contractors/InductionComplianceWidget";
import { SafetyOfficerCoverageCard } from "@/components/contractors/dashboard/SafetyOfficerCoverageCard";
import { HSSEEventsSummaryCard } from "@/components/contractors/dashboard/HSSEEventsSummaryCard";
import { BlacklistSummaryCard } from "@/components/contractors/dashboard/BlacklistSummaryCard";
import { PTWStatusCard } from "@/components/contractors/dashboard/PTWStatusCard";
import { RiskAssessmentCard } from "@/components/contractors/dashboard/RiskAssessmentCard";
import { OnsiteWorkersCard } from "@/components/contractors/dashboard/OnsiteWorkersCard";
import { ProjectStatusCard } from "@/components/contractors/dashboard/ProjectStatusCard";

export default function ContractorDashboard() {
  const { t } = useTranslation();
  const { data: stats, isLoading } = useContractorDashboardStats();

  const kpiCards = [
    {
      title: t("contractors.dashboard.activeCompanies", "Active Companies"),
      value: stats?.companies?.active ?? 0,
      total: stats?.companies?.total ?? 0,
      icon: Building2,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: t("contractors.dashboard.activeProjects", "Active Projects"),
      value: stats?.projects?.active ?? 0,
      total: stats?.projects?.total ?? 0,
      icon: FolderKanban,
      color: "text-success",
      bgColor: "bg-success/10",
    },
    {
      title: t("contractors.dashboard.approvedWorkers", "Approved Workers"),
      value: stats?.workers?.approved ?? 0,
      total: stats?.workers?.total ?? 0,
      icon: HardHat,
      color: "text-warning",
      bgColor: "bg-warning/10",
    },
    {
      title: t("contractors.dashboard.onsiteWorkers", "Onsite Workers"),
      value: stats?.onsiteWorkers?.count ?? 0,
      icon: Users,
      color: "text-info",
      bgColor: "bg-info/10",
    },
    {
      title: t("contractors.dashboard.pendingApprovals", "Pending Approvals"),
      value: (stats?.workers?.pending ?? 0) + (stats?.gatePasses?.pending ?? 0),
      icon: Clock,
      color: "text-amber-500",
      bgColor: "bg-amber-500/10",
    },
    {
      title: t("contractors.dashboard.gatePassesApproved", "Gate Passes"),
      value: stats?.gatePasses?.approved ?? 0,
      total: stats?.gatePasses?.total ?? 0,
      icon: Ticket,
      color: "text-violet-500",
      bgColor: "bg-violet-500/10",
    },
  ];

  return (
    <EnterprisePage
      title={t("contractors.dashboard.title", "Contractor Operations Dashboard")}
      description={t("contractors.dashboard.description", "Centralized overview of contractor operations, safety coverage, and compliance")}
    >
      {/* Section 1: Key Metrics */}
      <section className="space-y-3">
        <SectionHeader title={t("contractors.dashboard.keyMetrics", "Key Metrics")} />
        <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
          {isLoading
            ? Array.from({ length: 6 }).map((_, i) => (
                <Card key={i}>
                  <CardHeader className="pb-2">
                    <Skeleton className="h-4 w-24" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-8 w-16" />
                    <Skeleton className="h-3 w-20 mt-1" />
                  </CardContent>
                </Card>
              ))
            : kpiCards.map((stat) => (
                <Card key={stat.title} variant="summary">
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
              ))}
        </div>
      </section>

      {/* Section 2: Safety Officer Coverage */}
      <section className="space-y-3">
        <SectionHeader title={t("contractors.dashboard.safetyOfficerCoverage", "Safety Officer Coverage")} />
        <SafetyOfficerCoverageCard
          total={stats?.safetyOfficers?.total ?? 0}
          ratio={stats?.safetyOfficers?.ratio ?? 0}
          ratioDisplay={stats?.safetyOfficers?.ratioDisplay ?? "N/A"}
          coveragePercent={stats?.safetyOfficers?.coveragePercent ?? 0}
          status={stats?.safetyOfficers?.status ?? "warning"}
          workerCount={stats?.workers?.approved ?? 0}
        />
      </section>

      {/* Section 3: HSSE and Compliance */}
      <section className="space-y-3">
        <SectionHeader title={t("contractors.dashboard.hsseCompliance", "HSSE & Compliance")} />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <HSSEEventsSummaryCard
            open={stats?.hsseEvents?.open ?? 0}
            investigating={stats?.hsseEvents?.investigating ?? 0}
            closed={stats?.hsseEvents?.closed ?? 0}
            total={stats?.hsseEvents?.total ?? 0}
          />
          <BlacklistSummaryCard
            total={stats?.blacklist?.total ?? 0}
            recentCount={stats?.blacklist?.recentCount ?? 0}
          />
          <PTWStatusCard
            active={stats?.permits?.active ?? 0}
            pending={stats?.permits?.pending ?? 0}
            expired={stats?.permits?.expired ?? 0}
            total={stats?.permits?.total ?? 0}
          />
          <RiskAssessmentCard
            approved={stats?.riskAssessments?.approved ?? 0}
            pending={stats?.riskAssessments?.pending ?? 0}
            expired={stats?.riskAssessments?.expired ?? 0}
            highRisk={stats?.riskAssessments?.highRisk ?? 0}
            total={stats?.riskAssessments?.total ?? 0}
          />
        </div>
      </section>

      {/* Section 4: Induction Compliance */}
      <section className="space-y-3">
        <SectionHeader title={t("contractors.dashboard.inductionCompliance", "Induction Compliance")} />
        <InductionComplianceWidget />
      </section>

      {/* Section 5: Workforce & Projects */}
      <section className="space-y-3">
        <SectionHeader title={t("contractors.dashboard.workforceProjects", "Workforce & Projects")} />
        <div className="grid gap-4 md:grid-cols-2">
          <OnsiteWorkersCard count={stats?.onsiteWorkers?.count ?? 0} />
          <ProjectStatusCard
            active={stats?.projects?.active ?? 0}
            planned={stats?.projects?.planned ?? 0}
            completed={stats?.projects?.completed ?? 0}
            suspended={stats?.projects?.suspended ?? 0}
            total={stats?.projects?.total ?? 0}
          />
        </div>
      </section>

      {/* Security Status Footer */}
      <Card variant="flat" status="completed" className="max-w-sm">
        <CardContent className="flex items-center gap-3 py-4">
          <div className="p-2 rounded-lg bg-success/10">
            <Shield className="h-5 w-5 text-success" />
          </div>
          <div>
            <p className="text-sm font-medium">{t("contractors.dashboard.safetyStatus", "Safety Status")}</p>
            <p className="text-xs text-muted-foreground">{t("contractors.dashboard.allSystemsOperational", "All systems operational")}</p>
          </div>
        </CardContent>
      </Card>
    </EnterprisePage>
  );
}
