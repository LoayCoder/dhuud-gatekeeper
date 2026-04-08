import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import {
  Search, Building2, Calendar, CheckCircle2,
  ChevronRight, HardHat, Ban, Clock, Shield,
} from "lucide-react";
import { useProjectsWithMobilization } from "@/features/mobilization";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

const statusBadgeVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "outline",
  in_progress: "secondary",
  approved: "default",
  rejected: "destructive",
};

export default function SiteClearanceDashboard() {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string | undefined>();

  const { data: projects, isLoading } = useProjectsWithMobilization({ search });

  const filteredProjects = projects?.filter((p: any) => {
    if (!selectedStatus) return true;
    const mobStatus = p.mobilization?.status || "none";
    return mobStatus === selectedStatus;
  }) || [];

  const statusFilters = [
    { value: undefined, label: "All" },
    { value: "none", label: "Not Started" },
    { value: "pending", label: "Pending" },
    { value: "in_progress", label: "In Progress" },
    { value: "approved", label: "Cleared" },
    { value: "rejected", label: "Rejected" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {t("siteClearance.title", "Site Clearance")}
        </h1>
        <p className="text-muted-foreground">
          {t("siteClearance.description", "Pre-work authorization: verify site safety, confirm utilities, and ensure discipline sign-offs")}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search projects..."
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
          {[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="h-48 w-full" />)}
        </div>
      ) : filteredProjects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Shield className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              No projects found. Create projects in Contractor Management first.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredProjects.map((project: any) => (
            <ClearanceProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </div>
  );
}

function ClearanceProjectCard({ project }: { project: any }) {
  const mob = project.mobilization;
  const mobStatus = mob?.status || "none";
  const isApproved = mobStatus === "approved";
  const projectName = typeof project.project_name === 'string' ? project.project_name : '';
  const projectCode = typeof project.project_code === 'string' ? project.project_code : '';

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <CardTitle className="text-sm font-medium break-words">{projectName}</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">{projectCode}</p>
          </div>
          {/* GO / NO-GO badge */}
          <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-bold ${
            isApproved
              ? "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400"
              : "bg-muted text-muted-foreground"
          }`}>
            {isApproved ? <><CheckCircle2 className="h-3 w-3" /> GO</> : <><Ban className="h-3 w-3" /> NO-GO</>}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
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
        {project.start_date && project.end_date && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span>
              {format(new Date(project.start_date), "MMM d")} - {format(new Date(project.end_date), "MMM d, yyyy")}
            </span>
          </div>
        )}

        {/* Status badge */}
        <Badge variant={statusBadgeVariant[mobStatus] || "outline"} className="text-xs">
          {mobStatus === "none" ? "Not Started" : mobStatus === "approved" ? "Cleared" : mobStatus.replace(/_/g, " ")}
        </Badge>

        {/* Action link */}
        <Link
          to={`/site-clearance/${project.id}`}
          className="flex items-center justify-center gap-1 pt-3 border-t text-xs text-primary hover:underline"
        >
          {mob ? "View Clearance" : "Start Clearance"}
          <ChevronRight className="h-3 w-3 rtl:rotate-180" />
        </Link>
      </CardContent>
    </Card>
  );
}
