import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { 
  Plus, 
  Search, 
  Building2, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  XCircle,
  ChevronRight,
  ExternalLink
} from "lucide-react";
import { usePTWProjects } from "@/hooks/ptw";
import { Skeleton } from "@/components/ui/skeleton";
import { ProjectFormDialog } from "@/components/ptw/ProjectFormDialog";
import { ProjectClearanceDialog } from "@/components/ptw/ProjectClearanceDialog";
import { format } from "date-fns";

const statusColors: Record<string, string> = {
  pending_clearance: "bg-amber-500",
  active: "bg-green-500",
  suspended: "bg-red-500",
  completed: "bg-gray-500",
};

const statusBadgeVariants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending_clearance: "outline",
  active: "default",
  suspended: "destructive",
  completed: "secondary",
};

export default function ProjectMobilization() {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string | undefined>();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  const { data: projects, isLoading } = usePTWProjects({
    search,
    status: selectedStatus,
  });

  const statusFilters = [
    { value: undefined, label: t("common.all", "All") },
    { value: "pending_clearance", label: t("ptw.status.pendingClearance", "Pending Clearance") },
    { value: "active", label: t("ptw.status.active", "Active") },
    { value: "suspended", label: t("ptw.status.suspended", "Suspended") },
    { value: "completed", label: t("ptw.status.completed", "Completed") },
  ];

  // Group projects by status for Kanban view
  const projectsByStatus = {
    pending_clearance: projects?.filter(p => p.status === "pending_clearance") || [],
    active: projects?.filter(p => p.status === "active") || [],
    suspended: projects?.filter(p => p.status === "suspended") || [],
    completed: projects?.filter(p => p.status === "completed") || [],
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {t("ptw.mobilization.title", "Project Mobilization")}
          </h1>
          <p className="text-muted-foreground">
            {t("ptw.mobilization.description", "Manage project clearances and mobilization status")}
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="me-2 h-4 w-4" />
          {t("ptw.mobilization.newProject", "New Project")}
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t("ptw.mobilization.searchPlaceholder", "Search projects...")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ps-9"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {statusFilters.map((filter) => (
            <Button
              key={filter.value || "all"}
              variant={selectedStatus === filter.value ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedStatus(filter.value)}
            >
              {filter.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Kanban Board */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent className="space-y-3">
                {[1, 2].map((j) => (
                  <Skeleton key={j} className="h-24 w-full" />
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Pending Clearance Column */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className={`h-3 w-3 rounded-full ${statusColors.pending_clearance}`} />
                <CardTitle className="text-sm font-medium">
                  {t("ptw.status.pendingClearance", "Pending Clearance")}
                </CardTitle>
                <Badge variant="secondary" className="ms-auto">
                  {projectsByStatus.pending_clearance.length}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {projectsByStatus.pending_clearance.map((project) => (
                <ProjectCard 
                  key={project.id} 
                  project={project} 
                  onClick={() => setSelectedProjectId(project.id)}
                />
              ))}
              {projectsByStatus.pending_clearance.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {t("ptw.mobilization.noProjects", "No projects")}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Active Column */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className={`h-3 w-3 rounded-full ${statusColors.active}`} />
                <CardTitle className="text-sm font-medium">
                  {t("ptw.status.active", "Active")}
                </CardTitle>
                <Badge variant="secondary" className="ms-auto">
                  {projectsByStatus.active.length}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {projectsByStatus.active.map((project) => (
                <ProjectCard 
                  key={project.id} 
                  project={project} 
                  onClick={() => setSelectedProjectId(project.id)}
                />
              ))}
              {projectsByStatus.active.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {t("ptw.mobilization.noProjects", "No projects")}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Suspended Column */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className={`h-3 w-3 rounded-full ${statusColors.suspended}`} />
                <CardTitle className="text-sm font-medium">
                  {t("ptw.status.suspended", "Suspended")}
                </CardTitle>
                <Badge variant="secondary" className="ms-auto">
                  {projectsByStatus.suspended.length}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {projectsByStatus.suspended.map((project) => (
                <ProjectCard 
                  key={project.id} 
                  project={project} 
                  onClick={() => setSelectedProjectId(project.id)}
                />
              ))}
              {projectsByStatus.suspended.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {t("ptw.mobilization.noProjects", "No projects")}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Completed Column */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className={`h-3 w-3 rounded-full ${statusColors.completed}`} />
                <CardTitle className="text-sm font-medium">
                  {t("ptw.status.completed", "Completed")}
                </CardTitle>
                <Badge variant="secondary" className="ms-auto">
                  {projectsByStatus.completed.length}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {projectsByStatus.completed.map((project) => (
                <ProjectCard 
                  key={project.id} 
                  project={project} 
                  onClick={() => setSelectedProjectId(project.id)}
                />
              ))}
              {projectsByStatus.completed.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {t("ptw.mobilization.noProjects", "No projects")}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Dialogs */}
      <ProjectFormDialog 
        open={showCreateDialog} 
        onOpenChange={setShowCreateDialog} 
      />
      
      <ProjectClearanceDialog
        projectId={selectedProjectId}
        open={!!selectedProjectId}
        onOpenChange={(open) => !open && setSelectedProjectId(null)}
      />
    </div>
  );
}

interface ProjectCardProps {
  project: {
    id: string;
    reference_id: string;
    name: string;
    status: string;
    mobilization_percentage: number;
    start_date: string;
    end_date: string;
    contractor_company?: { company_name: string } | null;
    site?: { name: string } | null;
  };
  onClick: () => void;
}

function ProjectCard({ project, onClick }: ProjectCardProps) {
  const { t } = useTranslation();
  
  return (
    <div className="w-full text-start p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
      <button
        onClick={onClick}
        className="w-full text-start"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="font-medium text-sm truncate">{project.name}</p>
            <p className="text-xs text-muted-foreground">{project.reference_id}</p>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 rtl:rotate-180" />
        </div>
        
        {project.contractor_company && (
          <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
            <Building2 className="h-3 w-3" />
            <span className="truncate">{project.contractor_company.company_name}</span>
          </div>
        )}
        
        <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
          <Calendar className="h-3 w-3" />
          <span>{format(new Date(project.start_date), "MMM d")} - {format(new Date(project.end_date), "MMM d, yyyy")}</span>
        </div>
        
        {project.status === "pending_clearance" && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-muted-foreground">
                {t("ptw.mobilization.progress", "Mobilization")}
              </span>
              <span className="font-medium">{project.mobilization_percentage}%</span>
            </div>
            <Progress value={project.mobilization_percentage} className="h-1.5" />
          </div>
        )}
      </button>
      
      {/* Full Page Link */}
      <Link 
        to={`/ptw/projects/${project.id}/clearance`}
        className="flex items-center justify-center gap-1 mt-3 pt-2 border-t text-xs text-primary hover:underline"
        onClick={(e) => e.stopPropagation()}
      >
        <ExternalLink className="h-3 w-3" />
        {t("ptw.mobilization.viewFullPage", "View Full Page")}
      </Link>
    </div>
  );
}
