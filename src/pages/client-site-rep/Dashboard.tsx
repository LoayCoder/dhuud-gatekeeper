import { useTranslation } from "react-i18next";
import { Building2, Loader2 } from "lucide-react";
import { useClientSiteRepData } from "@/hooks/contractor-management/use-client-site-rep-data";
import { AssignedCompaniesCard } from "@/components/client-site-rep/AssignedCompaniesCard";
import { WorkersSummaryCard } from "@/components/client-site-rep/WorkersSummaryCard";
import { ProjectsSummaryCard } from "@/components/client-site-rep/ProjectsSummaryCard";
import { GatePassesSummaryCard } from "@/components/client-site-rep/GatePassesSummaryCard";
import { IncidentsSummaryCard } from "@/components/client-site-rep/IncidentsSummaryCard";
import { PersonnelCard } from "@/components/client-site-rep/PersonnelCard";
import { ViolationsCard } from "@/components/client-site-rep/ViolationsCard";
import { ClientSiteRepExport } from "@/components/client-site-rep/ClientSiteRepExport";
import { useAuth } from "@/contexts/AuthContext";

export default function ClientSiteRepDashboard() {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const {
    companies,
    companyIds,
    workerSummary,
    projectSummary,
    gatePassSummary,
    incidentSummary,
    violations,
    personnel,
    isLoading,
  } = useClientSiteRepData();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" />
            {t("clientSiteRep.dashboard", "Site Representative Dashboard")}
          </h1>
          <ClientSiteRepExport companyIds={companyIds} />
        </div>
        <p className="text-muted-foreground">
          {t("clientSiteRep.welcome", "Welcome")}, {profile?.full_name || t("common.user", "User")} — 
          {t("clientSiteRep.managingCompanies", "You manage {{count}} contractor companies", { count: companies.length })}
        </p>
      </div>

      {/* Main Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Companies Card - Full width on mobile */}
        <div className="md:col-span-2 lg:col-span-1">
          <AssignedCompaniesCard companies={companies} personnel={personnel} />
        </div>

        {/* Workers Summary with Safety Ratio */}
        <WorkersSummaryCard 
          summary={workerSummary} 
          safetyOfficerCount={personnel.safetyOfficers.length} 
        />

        {/* Gate Passes Summary */}
        <GatePassesSummaryCard summary={gatePassSummary} />

        {/* Projects Summary */}
        <ProjectsSummaryCard summary={projectSummary} />

        {/* HSSE Events Summary */}
        <IncidentsSummaryCard summary={incidentSummary} />

        {/* Personnel Overview */}
        <PersonnelCard personnel={personnel} />
      </div>

      {/* Violations Section - Full Width */}
      <ViolationsCard violations={violations} />
    </div>
  );
}
