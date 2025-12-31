import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Building2, Plus, Search, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CompanyListTable } from "@/components/contractors/CompanyListTable";
import { CompanyFormDialog } from "@/components/contractors/CompanyFormDialog";
import { CompanyDetailDialog } from "@/components/contractors/CompanyDetailDialog";
import { ContractorCompanyKPICards } from "@/components/contractors/ContractorCompanyKPICards";
import { WorkersByCompanyChart } from "@/components/contractors/WorkersByCompanyChart";
import { StatusByBranchChart } from "@/components/contractors/StatusByBranchChart";
import { useContractorCompanies, ContractorCompany } from "@/hooks/contractor-management/use-contractor-companies";
import { useContractorCompanyStats } from "@/hooks/contractor-management/use-contractor-company-stats";

export default function Companies() {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<ContractorCompany | null>(null);
  const [editingCompany, setEditingCompany] = useState<ContractorCompany | null>(null);

  // Fetch stats for KPI cards and charts
  const { data: stats, isLoading: statsLoading } = useContractorCompanyStats();

  // Build status filter based on active tab
  const getStatusForTab = () => {
    if (statusFilter !== "all") return statusFilter;
    switch (activeTab) {
      case "active":
        return "active";
      case "expiring":
        return undefined; // Will be filtered client-side
      case "attention":
        return undefined; // Will be filtered client-side
      default:
        return undefined;
    }
  };

  const { data: companies = [], isLoading } = useContractorCompanies({
    search: search || undefined,
    status: getStatusForTab(),
  });

  // Filter companies based on tab
  const getFilteredCompanies = () => {
    if (activeTab === "expiring") {
      const now = new Date();
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      return companies.filter((c: ContractorCompany & { contract_end_date?: string }) => {
        if (!c.contract_end_date) return false;
        const endDate = new Date(c.contract_end_date);
        return endDate > now && endDate <= thirtyDaysFromNow;
      });
    }
    if (activeTab === "attention") {
      return companies.filter(
        (c: ContractorCompany) => c.status === "suspended" || c.status === "inactive" || c.status === "expired"
      );
    }
    return companies;
  };

  const filteredCompanies = getFilteredCompanies();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Building2 className="h-6 w-6" />
            {t("contractors.companies.title", "Contractor Companies")}
          </h1>
          <p className="text-muted-foreground">
            {t("contractors.companies.description", "Manage contractor companies and their information")}
          </p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="h-4 w-4 me-2" />
          {t("contractors.companies.addCompany", "Add Company")}
        </Button>
      </div>

      {/* KPI Cards */}
      <ContractorCompanyKPICards stats={stats} isLoading={statsLoading} />

      {/* Charts Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <WorkersByCompanyChart
          data={stats?.topCompaniesByWorkers || []}
          isLoading={statsLoading}
        />
        <StatusByBranchChart
          data={stats?.statusByBranch || []}
          isLoading={statsLoading}
        />
      </div>

      {/* Table Section with Tabs */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold">
            {t("contractors.companies.list", "Companies List")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <TabsList>
                <TabsTrigger value="all">
                  {t("common.all", "All")}
                  <span className="ms-1.5 text-xs bg-muted px-1.5 py-0.5 rounded">
                    {stats?.totalCompanies || 0}
                  </span>
                </TabsTrigger>
                <TabsTrigger value="active">
                  {t("contractors.status.active", "Active")}
                  <span className="ms-1.5 text-xs bg-chart-3/20 text-chart-3 px-1.5 py-0.5 rounded">
                    {stats?.activeCompanies || 0}
                  </span>
                </TabsTrigger>
                <TabsTrigger value="expiring">
                  {t("contractors.stats.expiring", "Expiring")}
                  {(stats?.expiringContracts || 0) > 0 && (
                    <span className="ms-1.5 text-xs bg-destructive/20 text-destructive px-1.5 py-0.5 rounded">
                      {stats?.expiringContracts || 0}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="attention">
                  {t("contractors.stats.needsAttention", "Needs Attention")}
                  {((stats?.suspendedCompanies || 0) + (stats?.inactiveCompanies || 0)) > 0 && (
                    <span className="ms-1.5 text-xs bg-warning/20 text-warning px-1.5 py-0.5 rounded">
                      {(stats?.suspendedCompanies || 0) + (stats?.inactiveCompanies || 0)}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>

              {/* Search and Filter */}
              <div className="flex gap-2">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t("contractors.companies.searchPlaceholder", "Search companies...")}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="ps-9"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[150px]">
                    <Filter className="h-4 w-4 me-2" />
                    <SelectValue placeholder={t("common.status", "Status")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("common.all", "All")}</SelectItem>
                    <SelectItem value="active">{t("contractors.status.active", "Active")}</SelectItem>
                    <SelectItem value="suspended">{t("contractors.status.suspended", "Suspended")}</SelectItem>
                    <SelectItem value="inactive">{t("contractors.status.inactive", "Inactive")}</SelectItem>
                    <SelectItem value="expired">{t("contractors.status.expired", "Expired")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <TabsContent value="all" className="mt-4">
              <CompanyListTable
                companies={filteredCompanies}
                isLoading={isLoading}
                onView={(company) => setSelectedCompany(company)}
                onEdit={(company) => setEditingCompany(company)}
              />
            </TabsContent>
            <TabsContent value="active" className="mt-4">
              <CompanyListTable
                companies={filteredCompanies}
                isLoading={isLoading}
                onView={(company) => setSelectedCompany(company)}
                onEdit={(company) => setEditingCompany(company)}
              />
            </TabsContent>
            <TabsContent value="expiring" className="mt-4">
              <CompanyListTable
                companies={filteredCompanies}
                isLoading={isLoading}
                onView={(company) => setSelectedCompany(company)}
                onEdit={(company) => setEditingCompany(company)}
              />
            </TabsContent>
            <TabsContent value="attention" className="mt-4">
              <CompanyListTable
                companies={filteredCompanies}
                isLoading={isLoading}
                onView={(company) => setSelectedCompany(company)}
                onEdit={(company) => setEditingCompany(company)}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <CompanyFormDialog
        open={isCreateOpen || !!editingCompany}
        onOpenChange={(open) => {
          if (!open) {
            setIsCreateOpen(false);
            setEditingCompany(null);
          }
        }}
        company={editingCompany}
      />

      <CompanyDetailDialog
        company={selectedCompany}
        open={!!selectedCompany}
        onOpenChange={(open) => !open && setSelectedCompany(null)}
        onEdit={(company) => {
          setSelectedCompany(null);
          setEditingCompany(company);
        }}
      />
    </div>
  );
}
