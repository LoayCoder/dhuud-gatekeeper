import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  ArrowLeft,
  Building2, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  XCircle,
  FileText,
  Shield,
  Users,
  Briefcase,
  Filter,
  AlertTriangle,
  MapPin,
  User
} from "lucide-react";
import { usePTWProjects, usePTWProjectClearances } from "@/hooks/ptw";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { ClearanceCheckCard } from "@/components/ptw/ClearanceCheckCard";
import { ClearanceBulkActions } from "@/components/ptw/ClearanceBulkActions";

const categoryIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  documentation: FileText,
  safety: Shield,
  personnel: Users,
  insurance: Briefcase,
};

export default function ProjectClearance() {
  const { projectId } = useParams<{ projectId: string }>();
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar" || i18n.language === "ur";
  
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  const { data: projects } = usePTWProjects({});
  const project = projects?.find(p => p.id === projectId);
  
  const { data: clearances, isLoading } = usePTWProjectClearances(projectId);
  
  // Calculate stats
  const approvedCount = clearances?.filter(c => c.status === "approved").length || 0;
  const pendingCount = clearances?.filter(c => c.status === "pending").length || 0;
  const rejectedCount = clearances?.filter(c => c.status === "rejected").length || 0;
  const totalCount = clearances?.length || 0;
  const progress = totalCount > 0 ? Math.round((approvedCount / totalCount) * 100) : 0;
  
  // Filter clearances
  const filteredClearances = clearances?.filter(c => 
    statusFilter === "all" || c.status === statusFilter
  ) || [];
  
  // Group by category
  const groupedClearances = filteredClearances.reduce((acc, check) => {
    const category = check.category || "other";
    if (!acc[category]) acc[category] = [];
    acc[category].push(check);
    return acc;
  }, {} as Record<string, typeof filteredClearances>);

  // Selection handlers
  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const selectAllPending = () => {
    const pendingIds = clearances?.filter(c => c.status === "pending").map(c => c.id) || [];
    setSelectedIds(new Set(pendingIds));
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  if (!project && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <AlertTriangle className="h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">{t("ptw.clearance.projectNotFound", "Project not found")}</p>
        <Link to="/ptw/projects">
          <Button variant="outline">
            <ArrowLeft className="me-2 h-4 w-4 rtl:rotate-180" />
            {t("ptw.clearance.backToProjects", "Back to Projects")}
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Back Button */}
      <div className="flex items-start gap-4">
        <Link to="/ptw/projects">
          <Button variant="ghost" size="icon" className="shrink-0">
            <ArrowLeft className="h-5 w-5 rtl:rotate-180" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">
            {project?.name || <Skeleton className="h-8 w-64" />}
          </h1>
          <p className="text-muted-foreground">
            {project?.reference_id || <Skeleton className="h-4 w-32 mt-1" />}
          </p>
        </div>
        <Badge 
          variant={project?.status === "active" ? "default" : "secondary"}
          className="text-sm"
        >
          {project?.status && t(`ptw.status.${project.status}`, project.status.replace(/_/g, " "))}
        </Badge>
      </div>

      {/* Project Context Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t("ptw.clearance.contractor", "Contractor")}</p>
                <p className="font-medium text-sm">
                  {project?.contractor_company?.company_name || t("common.na", "N/A")}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <MapPin className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t("ptw.clearance.site", "Site")}</p>
                <p className="font-medium text-sm">
                  {project?.site?.name || t("common.na", "N/A")}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t("ptw.clearance.projectManager", "Project Manager")}</p>
                <p className="font-medium text-sm">
                  {project?.project_manager?.full_name || t("common.na", "N/A")}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t("ptw.clearance.duration", "Duration")}</p>
                <p className="font-medium text-sm">
                  {project?.start_date && project?.end_date 
                    ? `${format(new Date(project.start_date), "MMM d")} - ${format(new Date(project.end_date), "MMM d, yyyy")}`
                    : t("common.na", "N/A")
                  }
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Progress Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              {t("ptw.clearance.mobilizationProgress", "Mobilization Progress")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Progress value={progress} className="flex-1 h-3" />
              <span className="text-2xl font-bold">{progress}%</span>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              {approvedCount} of {totalCount} {t("ptw.clearance.itemsApproved", "items approved")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-500" />
              {t("ptw.clearance.pending", "Pending")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{pendingCount}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <XCircle className="h-4 w-4 text-destructive" />
              {t("ptw.clearance.rejected", "Rejected")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-destructive">{rejectedCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <ClearanceBulkActions 
          selectedIds={selectedIds}
          onClearSelection={clearSelection}
          projectId={projectId!}
        />
      )}

      {/* Filter Tabs */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={statusFilter} onValueChange={setStatusFilter} className="w-full sm:w-auto">
          <TabsList>
            <TabsTrigger value="all">
              {t("common.all", "All")} ({totalCount})
            </TabsTrigger>
            <TabsTrigger value="pending">
              {t("ptw.clearance.pending", "Pending")} ({pendingCount})
            </TabsTrigger>
            <TabsTrigger value="approved">
              {t("ptw.clearance.approved", "Approved")} ({approvedCount})
            </TabsTrigger>
            <TabsTrigger value="rejected">
              {t("ptw.clearance.rejected", "Rejected")} ({rejectedCount})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {pendingCount > 0 && (
          <Button variant="outline" size="sm" onClick={selectAllPending}>
            <CheckCircle2 className="me-2 h-4 w-4" />
            {t("ptw.clearance.selectAllPending", "Select All Pending")}
          </Button>
        )}
      </div>

      {/* Clearance List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : filteredClearances.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {t("ptw.clearance.noItemsFound", "No clearance items found")}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedClearances).map(([category, checks]) => {
            const IconComponent = categoryIcons[category] || FileText;
            return (
              <div key={category} className="space-y-3">
                <div className="flex items-center gap-2">
                  <IconComponent className="h-5 w-5 text-muted-foreground" />
                  <h3 className="font-semibold capitalize">
                    {t(`ptw.clearance.category.${category}`, category.replace(/_/g, " "))}
                  </h3>
                  <Badge variant="secondary" className="ms-2">
                    {checks.filter(c => c.status === "approved").length}/{checks.length}
                  </Badge>
                </div>
                
                <div className="space-y-2">
                  {checks.map((check) => (
                    <ClearanceCheckCard
                      key={check.id}
                      check={check}
                      isSelected={selectedIds.has(check.id)}
                      onToggleSelect={() => toggleSelection(check.id)}
                      isRTL={isRTL}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Completion Banner */}
      {progress === 100 && (
        <Card className="border-green-500/50 bg-green-500/10">
          <CardContent className="flex items-center gap-4 py-6">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
            <div>
              <p className="font-semibold text-green-700 dark:text-green-400">
                {t("ptw.clearance.allApproved", "All Clearances Approved!")}
              </p>
              <p className="text-sm text-green-600 dark:text-green-500">
                {t("ptw.clearance.readyForActivation", "This project is now ready for permit creation.")}
              </p>
            </div>
            <Link to={`/ptw/create?projectId=${projectId}`} className="ms-auto">
              <Button>
                {t("ptw.clearance.createPermit", "Create Permit")}
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
