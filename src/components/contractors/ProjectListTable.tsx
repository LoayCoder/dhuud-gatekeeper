import { useTranslation } from "react-i18next";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ContractorProject } from "@/hooks/contractor-management/use-contractor-projects";
import { format } from "date-fns";

interface ProjectListTableProps {
  projects: ContractorProject[];
  isLoading: boolean;
  onEdit: (project: ContractorProject) => void;
}

export function ProjectListTable({ projects, isLoading, onEdit }: ProjectListTableProps) {
  const { t } = useTranslation();

  if (isLoading) {
    return <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>;
  }

  if (projects.length === 0) {
    return <div className="text-center py-8 text-muted-foreground">{t("contractors.projects.noProjects", "No projects found")}</div>;
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      active: "default", planned: "secondary", completed: "outline", cancelled: "destructive",
    };
    return <Badge variant={variants[status] || "secondary"}>{t(`contractors.projectStatus.${status}`, status)}</Badge>;
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t("contractors.projects.code", "Code")}</TableHead>
          <TableHead>{t("contractors.projects.name", "Project Name")}</TableHead>
          <TableHead>{t("contractors.projects.company", "Company")}</TableHead>
          <TableHead>{t("contractors.projects.dates", "Dates")}</TableHead>
          <TableHead>{t("common.status", "Status")}</TableHead>
          <TableHead className="text-end">{t("common.actions", "Actions")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {projects.map((project) => (
          <TableRow key={project.id}>
            <TableCell className="font-mono text-sm">{project.project_code}</TableCell>
            <TableCell className="font-medium">{project.project_name}</TableCell>
            <TableCell>{project.company?.company_name || "-"}</TableCell>
            <TableCell className="text-sm">
              {format(new Date(project.start_date), "dd/MM/yyyy")} - {format(new Date(project.end_date), "dd/MM/yyyy")}
            </TableCell>
            <TableCell>{getStatusBadge(project.status)}</TableCell>
            <TableCell className="text-end">
              <Button variant="ghost" size="icon" onClick={() => onEdit(project)}><Pencil className="h-4 w-4" /></Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
