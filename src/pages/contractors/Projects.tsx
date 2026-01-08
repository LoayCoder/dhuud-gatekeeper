import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { FolderKanban, Plus, Search, Filter, Database, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ProjectListTable } from "@/components/contractors/ProjectListTable";
import { ProjectFormDialog } from "@/components/contractors/ProjectFormDialog";
import { useContractorProjects, ContractorProject } from "@/hooks/contractor-management/use-contractor-projects";
import { useContractorCompanies } from "@/hooks/contractor-management/use-contractor-companies";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

export default function Projects() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const initialStatus = searchParams.get("status") || "all";
  
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>(initialStatus);
  
  // Sync with URL changes
  useEffect(() => {
    const urlStatus = searchParams.get("status");
    if (urlStatus && urlStatus !== statusFilter) {
      setStatusFilter(urlStatus);
    }
  }, [searchParams]);
  const [companyFilter, setCompanyFilter] = useState<string>("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<ContractorProject | null>(null);
  const [isSeeding, setIsSeeding] = useState(false);

  const handleSeedData = async () => {
    setIsSeeding(true);
    try {
      const { data, error } = await supabase.functions.invoke("seed-comprehensive-test-data");
      if (error) throw error;
      toast.success(t("common.seedSuccess", `Seeded ${data.results?.contractors?.projects || 0} test projects`));
      queryClient.invalidateQueries({ queryKey: ["contractor-projects"] });
    } catch (error) {
      console.error("Seed error:", error);
      toast.error(t("common.seedError", "Failed to seed test data"));
    } finally {
      setIsSeeding(false);
    }
  };

  const { data: projects = [], isLoading } = useContractorProjects({
    search: search || undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
    companyId: companyFilter !== "all" ? companyFilter : undefined,
  });

  const { data: companies = [] } = useContractorCompanies({ status: "active" });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <FolderKanban className="h-6 w-6" />
            {t("contractors.projects.title", "Contractor Projects")}
          </h1>
          <p className="text-muted-foreground">
            {t("contractors.projects.description", "Manage contractor projects and assignments")}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleSeedData} disabled={isSeeding}>
            {isSeeding ? <Loader2 className="h-4 w-4 me-2 animate-spin" /> : <Database className="h-4 w-4 me-2" />}
            {t("common.seedTestData", "Seed Test Data")}
          </Button>
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="h-4 w-4 me-2" />
            {t("contractors.projects.addProject", "Add Project")}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("contractors.projects.searchPlaceholder", "Search projects...")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="ps-9"
              />
            </div>
            <div className="flex gap-2">
              <Select value={companyFilter} onValueChange={setCompanyFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder={t("contractors.projects.company", "Company")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("common.all", "All Companies")}</SelectItem>
                  {companies.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.company_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <Filter className="h-4 w-4 me-2" />
                  <SelectValue placeholder={t("common.status", "Status")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("common.all", "All")}</SelectItem>
                  <SelectItem value="planned">{t("contractors.projectStatus.planned", "Planned")}</SelectItem>
                  <SelectItem value="active">{t("contractors.projectStatus.active", "Active")}</SelectItem>
                  <SelectItem value="completed">{t("contractors.projectStatus.completed", "Completed")}</SelectItem>
                  <SelectItem value="cancelled">{t("contractors.projectStatus.cancelled", "Cancelled")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ProjectListTable
            projects={projects}
            isLoading={isLoading}
            onEdit={(project) => setEditingProject(project)}
          />
        </CardContent>
      </Card>

      <ProjectFormDialog
        open={isCreateOpen || !!editingProject}
        onOpenChange={(open) => {
          if (!open) {
            setIsCreateOpen(false);
            setEditingProject(null);
          }
        }}
        project={editingProject}
      />
    </div>
  );
}
