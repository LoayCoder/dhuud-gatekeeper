import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import {
  Search,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  XCircle,
  ChevronRight,
  HardHat,
  AlertTriangle,
} from "lucide-react";
import { useProjectsWithMobilization } from "@/features/mobilization";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

const mobilizationStatusColors: Record<string, string> = {
  pending: "bg-amber-500",
  in_progress: "bg-blue-500",
  approved: "bg-green-500",
  rejected: "bg-red-500",
};

const mobilizationStatusBadge: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "outline",
  in_progress: "secondary",
  approved: "default",
  rejected: "destructive",
};

export default function MobilizationDashboard() {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string | undefined>();

  const { data: projects, isLoading } = useProjectsWithMobilization({ search });

  // Filter by mobilization status
  const filteredProjects = projects?.filter((p: any) => {
    if (!selectedStatus) return true;
    const mobStatus = p.mobilization?.status || "none";
    return mobStatus === selectedStatus;
  }) || [];

  const statusFilters = [
    { value: undefined, label: t("common.all", "All") },
    { value: "none", label: t("mobilization.status.notStarted", "Not Started") },
    { value: "pending", label: t("mobilization.status.pending", "Pending") },
    { value: "in_progress", label: t("mobilization.status.inProgress", "In Progress") },
    { value: "approved", label: t("mobilization.status.approved", "Approved") },
    { value: "rejected", label: t("mobilization.status.rejected", "Rejected") },
  ];

  return (
    <div className="space-y-6">
      {/* Header — no create button; projects come from /contractors/projects */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {t("mobilization.title", "Site Mobilization")}
        </h1>
        <p className="text-muted-foreground">
          {t("mobilization.description", "Manage site clearance and readiness validation before PTW activation")}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t("mobilization.searchPlaceholder", "Search projects...")}
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

      {/* Project List */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      ) : filteredProjects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <HardHat className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {t("mobilization.noProjects", "No projects found. Create projects in Contractor Management first.")}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredProjects.map((project: any) => (
            <MobilizationProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </div>
  );
}

function MobilizationProjectCard({ project }: { project: any }) {
  const { t } = useTranslation();
  const mob = project.mobilization;
  const mobStatus = mob?.status || "none";
  const percentage = mob?.mobilization_percentage || 0;

  const projectName = typeof project.project_name === 'string' ? project.project_name : '';
  const projectCode = typeof project.project_code === 'string' ? project.project_code : '';

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <CardTitle className="text-sm font-medium break-words">
              {projectName}
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">{projectCode}</p>
          </div>
          <Badge variant={mobilizationStatusBadge[mobStatus] || "outline"}>
            {mobStatus === "none"
              ? t("mobilization.status.notStarted", "Not Started")
              : t(`mobilization.status.${mobStatus}`, mobStatus.replace(/_/g, " "))
            }
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Project info */}
        {project.company && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Building2 className="h-3 w-3" />
            <span className="truncate">{project.company.company_name}</span>
          </div>
        )}
        {project.site && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <HardHat className="h-3 w-3" />
            <span>{project.site.name}</span>
          </div>
        )}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Calendar className="h-3 w-3" />
          <span>
            {format(new Date(project.start_date), "MMM d")} - {format(new Date(project.end_date), "MMM d, yyyy")}
          </span>
        </div>

        {/* Mobilization progress */}
        {mob && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{t("mobilization.progress", "Mobilization")}</span>
              <span className="font-medium">{percentage}%</span>
            </div>
            <Progress value={percentage} className="h-1.5" />
          </div>
        )}

        {/* Gates summary */}
        {mob && (
          <div className="flex gap-2 flex-wrap">
            {mob.pre_checks_completed && (
              <Badge variant="outline" className="text-xs gap-1">
                <CheckCircle2 className="h-3 w-3 text-green-500" />
                {t("mobilization.preChecks", "Pre-Checks")}
              </Badge>
            )}
            {mob.site_clearance_approved && (
              <Badge variant="outline" className="text-xs gap-1">
                <CheckCircle2 className="h-3 w-3 text-green-500" />
                {t("mobilization.siteClearance", "Site Clear")}
              </Badge>
            )}
            {mob.ptw_enabled && (
              <Badge variant="outline" className="text-xs gap-1">
                <CheckCircle2 className="h-3 w-3 text-green-500" />
                {t("mobilization.ptwEnabled", "PTW Ready")}
              </Badge>
            )}
          </div>
        )}

        {/* Action link */}
        <Link
          to={`/mobilization/${project.id}`}
          className="flex items-center justify-center gap-1 pt-3 border-t text-xs text-primary hover:underline"
        >
          {mob
            ? t("mobilization.viewDetail", "View Mobilization")
            : t("mobilization.startMobilization", "Start Mobilization")
          }
          <ChevronRight className="h-3 w-3 rtl:rotate-180" />
        </Link>
      </CardContent>
    </Card>
  );
}
