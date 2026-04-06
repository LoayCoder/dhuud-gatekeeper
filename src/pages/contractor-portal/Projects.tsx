import { useState } from "react";
import { useTranslation } from "react-i18next";
import { FolderKanban, Calendar, MapPin, Users, AlertCircle, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import ContractorPortalLayout from "@/components/contractor-portal/ContractorPortalLayout";
import { useContractorPortalData } from "@/hooks/contractor-management/index";
import { format } from "date-fns";
import { ContractorPortalRoute } from "@/components/access-control";
import { ProjectDetailDialog } from "@/features/contractors/components/ProjectDetailDialog";
import { ProjectFormDialog } from "@/features/contractors/components/ProjectFormDialog";
import type { ContractorPortalProject } from "@/features/contractors/hooks/use-contractor-portal";

function ContractorPortalProjectsContent() {
  const { t } = useTranslation();
  const { projects, isLoading, isError } = useContractorPortalData();
  const [selectedProject, setSelectedProject] = useState<ContractorPortalProject | null>(null);
  const [showAddProject, setShowAddProject] = useState(false);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active": return <Badge className="bg-success text-success-foreground">{t("common.active", "Active")}</Badge>;
      case "completed": return <Badge variant="secondary">{t("common.completed", "Completed")}</Badge>;
      case "on_hold": return <Badge variant="outline" className="text-warning border-warning">{t("common.onHold", "On Hold")}</Badge>;
      case "planned": return <Badge variant="outline" className="text-info border-info">{t("contractors.projectStatus.planned", "Planned")}</Badge>;
      case "cancelled": return <Badge variant="destructive">{t("contractors.projectStatus.cancelled", "Cancelled")}</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return <ContractorPortalLayout><div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div></ContractorPortalLayout>;
  }

  if (isError) {
    return (
      <ContractorPortalLayout>
        <Card>
          <CardContent className="py-8 text-center">
            <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
            <p className="text-destructive font-medium">{t("common.errorLoading", "Failed to load data")}</p>
            <p className="text-muted-foreground text-sm mt-1">{t("common.tryAgainLater", "Please try again later")}</p>
          </CardContent>
        </Card>
      </ContractorPortalLayout>
    );
  }

  return (
    <ContractorPortalLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <FolderKanban className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">{t("contractorPortal.projects.title", "Projects")}</h1>
            <p className="text-muted-foreground">{t("contractorPortal.projects.description", "View your assigned projects")}</p>
          </div>
        </div>

        {projects?.length === 0 ? (
          <Card><CardContent className="py-8 text-center text-muted-foreground">{t("contractorPortal.projects.noProjects", "No projects assigned")}</CardContent></Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {projects?.map((project) => (
              <Card
                key={project.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setSelectedProject(project as ContractorPortalProject)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{project.project_name}</CardTitle>
                      <p className="text-sm text-muted-foreground font-mono">{project.project_code}</p>
                    </div>
                    {getStatusBadge(project.status)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {format(new Date(project.start_date), "PP")} - {project.end_date ? format(new Date(project.end_date), "PP") : t("common.ongoing", "Ongoing")}
                    </span>
                  </div>
                  {project.location_description && (
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>{project.location_description}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>{project.assigned_workers_count} {t("contractors.workers.title", "Workers")}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <ProjectDetailDialog
        open={!!selectedProject}
        onOpenChange={(open) => !open && setSelectedProject(null)}
        project={selectedProject}
      />
    </ContractorPortalLayout>
  );
}

export default function ContractorPortalProjects() {
  return (
    <ContractorPortalRoute>
      <ContractorPortalProjectsContent />
    </ContractorPortalRoute>
  );
}
