import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
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
  AlertTriangle,
  MapPin,
  User,
  Loader2,
  Lock,
} from "lucide-react";
import { useMobilizationDetail, useMobilizationClearances, useApproveMobilizationCheck, useRejectMobilizationCheck } from "@/features/mobilization";
import { useEnsureMobilization, useUpdateMobilization } from "@/features/mobilization";
import { ClearanceCheckCard } from "@/features/ptw";
import { ClearanceBulkActions } from "@/features/ptw";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { toast } from "sonner";

const categoryIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  documentation: FileText,
  safety: Shield,
  personnel: Users,
  insurance: Briefcase,
};

export default function MobilizationDetail() {
  const { projectId } = useParams<{ projectId: string }>();
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar" || i18n.language === "ur";
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState("pre-checks");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { data: detail, isLoading: detailLoading } = useMobilizationDetail(projectId);
  const ensureMob = useEnsureMobilization();
  const updateMob = useUpdateMobilization();
  const approveCheck = useApproveMobilizationCheck();
  const rejectCheck = useRejectMobilizationCheck();

  const project = detail?.project;
  const mobilization = detail?.mobilization;

  // Auto-create mobilization on first visit if none exists
  useEffect(() => {
    if (project && !mobilization && !ensureMob.isPending && projectId) {
      ensureMob.mutate(projectId);
    }
  }, [project, mobilization, projectId]);

  const { data: clearances, isLoading: clearancesLoading } = useMobilizationClearances(mobilization?.id);

  // Stats
  const approvedCount = clearances?.filter((c: any) => c.status === "approved").length || 0;
  const pendingCount = clearances?.filter((c: any) => c.status === "pending").length || 0;
  const rejectedCount = clearances?.filter((c: any) => c.status === "rejected").length || 0;
  const totalCount = clearances?.length || 0;
  const progress = totalCount > 0 ? Math.round((approvedCount / totalCount) * 100) : 0;

  // Filter clearances
  const filteredClearances = clearances?.filter((c: any) =>
    statusFilter === "all" || c.status === statusFilter
  ) || [];

  // Group by category
  const groupedClearances = filteredClearances.reduce((acc: Record<string, any[]>, check: any) => {
    const category = check.category || "other";
    if (!acc[category]) acc[category] = [];
    acc[category].push(check);
    return acc;
  }, {} as Record<string, any[]>);

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) newSelected.delete(id);
    else newSelected.add(id);
    setSelectedIds(newSelected);
  };

  const handleApproveMobilization = async () => {
    if (!mobilization || !user?.id) return;
    try {
      await updateMob.mutateAsync({
        mobilizationId: mobilization.id,
        updates: {
          status: "approved",
          ptw_enabled: true,
          approved_by: user.id,
          approved_at: new Date().toISOString(),
        },
      });
      toast.success(t("mobilization.approved", "Mobilization approved — PTW is now enabled"));
    } catch {
      // error handled by hook
    }
  };

  const handleUpdateSiteClearance = async (approved: boolean) => {
    if (!mobilization) return;
    await updateMob.mutateAsync({
      mobilizationId: mobilization.id,
      updates: {
        site_clearance_approved: approved,
        status: "in_progress",
      },
    });
  };

  const handleUpdatePreChecks = async (completed: boolean) => {
    if (!mobilization) return;
    await updateMob.mutateAsync({
      mobilizationId: mobilization.id,
      updates: {
        pre_checks_completed: completed,
        status: "in_progress",
      },
    });
  };

  if (detailLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <AlertTriangle className="h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">{t("mobilization.projectNotFound", "Project not found")}</p>
        <Link to="/mobilization">
          <Button variant="outline">
            <ArrowLeft className="me-2 h-4 w-4 rtl:rotate-180" />
            {t("mobilization.backToList", "Back to Mobilization")}
          </Button>
        </Link>
      </div>
    );
  }

  const isApproved = mobilization?.status === "approved";
  const canApprove = mobilization?.pre_checks_completed && mobilization?.site_clearance_approved && !isApproved;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link to="/mobilization">
          <Button variant="ghost" size="icon" className="shrink-0">
            <ArrowLeft className="h-5 w-5 rtl:rotate-180" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">{project.project_name}</h1>
          <p className="text-muted-foreground">{project.project_code}</p>
        </div>
        <Badge
          variant={isApproved ? "default" : mobilization?.status === "rejected" ? "destructive" : "secondary"}
        >
          {mobilization?.status
            ? t(`mobilization.status.${mobilization.status}`, mobilization.status.replace(/_/g, " "))
            : t("mobilization.status.pending", "Pending")
          }
        </Badge>
      </div>

      {/* Project Context */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t("mobilization.contractor", "Contractor")}</p>
                <p className="font-medium text-sm">{(project as any).company?.company_name || t("common.na", "N/A")}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <MapPin className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t("mobilization.site", "Site")}</p>
                <p className="font-medium text-sm">{(project as any).site?.name || t("common.na", "N/A")}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t("mobilization.projectManager", "PM")}</p>
                <p className="font-medium text-sm">{(project as any).project_manager?.full_name || t("common.na", "N/A")}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t("mobilization.duration", "Duration")}</p>
                <p className="font-medium text-sm">
                  {format(new Date(project.start_date), "MMM d")} - {format(new Date(project.end_date), "MMM d, yyyy")}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabbed Interface */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="pre-checks" className="gap-1.5">
            <FileText className="h-4 w-4 hidden sm:block" />
            {t("mobilization.tabs.preChecks", "Pre-Checks")}
          </TabsTrigger>
          <TabsTrigger value="site-clearance" className="gap-1.5">
            <Shield className="h-4 w-4 hidden sm:block" />
            {t("mobilization.tabs.siteClearance", "Site Clearance")}
          </TabsTrigger>
          <TabsTrigger value="risk-assessment" className="gap-1.5">
            <AlertTriangle className="h-4 w-4 hidden sm:block" />
            {t("mobilization.tabs.riskAssessment", "Risk Assessment")}
          </TabsTrigger>
          <TabsTrigger value="ptw-readiness" className="gap-1.5">
            <CheckCircle2 className="h-4 w-4 hidden sm:block" />
            {t("mobilization.tabs.ptwReadiness", "PTW Readiness")}
          </TabsTrigger>
        </TabsList>

        {/* Pre-Mobilization Checks Tab */}
        <TabsContent value="pre-checks" className="space-y-4">
          {/* Progress */}
          {totalCount > 0 && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <Progress value={progress} className="flex-1 h-3" />
                  <span className="text-2xl font-bold">{progress}%</span>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  {approvedCount} / {totalCount} {t("mobilization.itemsApproved", "items approved")}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Clearance checks */}
          {clearancesLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
            </div>
          ) : totalCount === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  {t("mobilization.noClearanceItems", "No clearance items configured for this project.")}
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
                        {t(`mobilization.category.${category}`, category.replace(/_/g, " "))}
                      </h3>
                      <Badge variant="secondary" className="ms-2">
                        {(checks as any[]).filter((c: any) => c.status === "approved").length}/{(checks as any[]).length}
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      {(checks as any[]).map((check: any) => (
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

          {/* Mark pre-checks complete */}
          {totalCount > 0 && progress === 100 && !mobilization?.pre_checks_completed && (
            <Button onClick={() => handleUpdatePreChecks(true)} className="w-full">
              <CheckCircle2 className="me-2 h-4 w-4" />
              {t("mobilization.markPreChecksComplete", "Mark Pre-Checks as Complete")}
            </Button>
          )}
        </TabsContent>

        {/* Site Clearance Tab */}
        <TabsContent value="site-clearance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {t("mobilization.siteClearanceTitle", "Site Clearance Verification")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 p-4 rounded-lg border">
                {mobilization?.site_clearance_approved ? (
                  <CheckCircle2 className="h-8 w-8 text-green-500" />
                ) : (
                  <Clock className="h-8 w-8 text-amber-500" />
                )}
                <div className="flex-1">
                  <p className="font-medium">
                    {mobilization?.site_clearance_approved
                      ? t("mobilization.siteCleared", "Site has been cleared")
                      : t("mobilization.siteNotCleared", "Site clearance pending")
                    }
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t("mobilization.siteClearanceDesc", "Verify that the site is ready for work operations")}
                  </p>
                </div>
                {!mobilization?.site_clearance_approved && (
                  <Button onClick={() => handleUpdateSiteClearance(true)} size="sm">
                    {t("mobilization.approveSite", "Approve Site")}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Risk Assessment Tab */}
        <TabsContent value="risk-assessment" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {t("mobilization.riskAssessmentTitle", "Risk Assessment")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  {t("mobilization.riskAssessmentDesc", "Risk assessments linked to this project will appear here.")}
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  {t("mobilization.riskAssessmentNote", "Create risk assessments in the Risk Assessment module.")}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PTW Readiness Tab */}
        <TabsContent value="ptw-readiness" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {t("mobilization.ptwReadinessTitle", "PTW Readiness Summary")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Gate summary */}
              <div className="space-y-3">
                <GateRow
                  label={t("mobilization.gate.projectActive", "Project Active")}
                  passed={project.status === "active"}
                  detail={project.status}
                />
                <GateRow
                  label={t("mobilization.gate.preChecks", "Pre-Mobilization Checks")}
                  passed={!!mobilization?.pre_checks_completed}
                />
                <GateRow
                  label={t("mobilization.gate.siteClearance", "Site Clearance")}
                  passed={!!mobilization?.site_clearance_approved}
                />
                <GateRow
                  label={t("mobilization.gate.mobilizationApproved", "Mobilization Approved")}
                  passed={isApproved}
                />
                <GateRow
                  label={t("mobilization.gate.ptwEnabled", "PTW Enabled")}
                  passed={!!mobilization?.ptw_enabled}
                />
              </div>

              {/* Approve button */}
              {canApprove && (
                <Button onClick={handleApproveMobilization} className="w-full" disabled={updateMob.isPending}>
                  {updateMob.isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                  <CheckCircle2 className="me-2 h-4 w-4" />
                  {t("mobilization.approveAndEnablePTW", "Approve Mobilization & Enable PTW")}
                </Button>
              )}

              {isApproved && (
                <div className="flex items-center gap-3 p-4 rounded-lg border-green-500/50 bg-green-50 dark:bg-green-950/20 border">
                  <CheckCircle2 className="h-8 w-8 text-green-600" />
                  <div className="flex-1">
                    <p className="font-semibold text-green-700 dark:text-green-400">
                      {t("mobilization.readyForPermits", "Project Ready for PTW Permits")}
                    </p>
                    <p className="text-sm text-green-600 dark:text-green-500">
                      {t("mobilization.readyForPermitsDesc", "This project has completed all mobilization gates.")}
                    </p>
                  </div>
                  <Link to={`/ptw/create?projectId=${projectId}`}>
                    <Button size="sm">
                      {t("mobilization.createPermit", "Create Permit")}
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function GateRow({ label, passed, detail }: { label: string; passed: boolean; detail?: string }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border">
      {passed ? (
        <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
      ) : (
        <Lock className="h-5 w-5 text-muted-foreground shrink-0" />
      )}
      <span className={`flex-1 text-sm ${passed ? "font-medium" : "text-muted-foreground"}`}>{label}</span>
      {detail && (
        <Badge variant={passed ? "default" : "outline"} className="text-xs">{detail}</Badge>
      )}
    </div>
  );
}
