import { useTranslation } from "react-i18next";
import { FolderKanban, Calendar, MapPin, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import ContractorPortalLayout from "@/components/contractor-portal/ContractorPortalLayout";
import { useContractorPortalData } from "@/hooks/contractor-management";
import { format } from "date-fns";

export default function ContractorPortalProjects() {
  const { t } = useTranslation();
  const { projects, isLoading } = useContractorPortalData();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active": return <Badge className="bg-green-500">{t("common.active", "Active")}</Badge>;
      case "completed": return <Badge variant="secondary">{t("common.completed", "Completed")}</Badge>;
      case "on_hold": return <Badge variant="outline" className="text-warning border-warning">{t("common.onHold", "On Hold")}</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return <ContractorPortalLayout><div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div></ContractorPortalLayout>;
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
              <Card key={project.id}>
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
                    <span>{format(new Date(project.start_date), "PP")} - {format(new Date(project.end_date), "PP")}</span>
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
    </ContractorPortalLayout>
  );
}
