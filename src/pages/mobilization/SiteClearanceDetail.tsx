import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft, Building2, Calendar, CheckCircle2, Clock,
  XCircle, FileText, Shield, Users, Briefcase,
  AlertTriangle, MapPin, User, Loader2, Lock,
  Upload, Trash2, Eye, Zap, Wrench, Droplets,
  Construction, Wifi, HardHat, ShieldCheck, PenLine,
  History, Download, Ban,
} from "lucide-react";
import { useMobilizationDetail } from "@/features/mobilization/hooks/use-mobilization-detail";
import { useEnsureMobilization, useUpdateMobilization } from "@/features/mobilization/hooks/use-mobilizations";
import {
  useSiteSignoffs, useEnsureSignoffs, useSignDiscipline, useRevokeSignoff,
  useUpdateSiteRiskVerification,
  useClearanceAttachments, useUploadClearanceAttachment, useDeleteClearanceAttachment,
  useClearanceAuditLogs,
  useSiteClearanceRisks, useAddSiteClearanceRisk, useDeleteSiteClearanceRisk,
} from "@/features/mobilization/hooks/use-site-clearance";
import { DISCIPLINES } from "@/features/mobilization/services/siteClearanceService";
import { NativeSelect } from "@/components/ui/native-select";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { toast } from "sonner";
import { useDropzone } from "react-dropzone";

const disciplineIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  electrical: Zap,
  mechanical: Wrench,
  irrigation_water: Droplets,
  underground_civil: Construction,
  it_communication: Wifi,
  area_owner: HardHat,
  hsse: ShieldCheck,
};

export default function SiteClearanceDetail() {
  const { projectId } = useParams<{ projectId: string }>();
  const { t } = useTranslation();
  const { user, profile } = useAuth();
  const tenantId = profile?.tenant_id;

  const [activeTab, setActiveTab] = useState("risk-verification");
  const [newRiskDesc, setNewRiskDesc] = useState("");
  const [newRiskSeverity, setNewRiskSeverity] = useState("medium");
  const [newRiskControls, setNewRiskControls] = useState("");

  const { data: detail, isLoading: detailLoading } = useMobilizationDetail(projectId);
  const ensureMob = useEnsureMobilization();
  const updateMob = useUpdateMobilization();

  const project = detail?.project;
  const mob = detail?.mobilization;

  // Auto-create mobilization
  useEffect(() => {
    if (project && !mob && !ensureMob.isPending && !ensureMob.isSuccess && projectId) {
      ensureMob.mutate(projectId);
    }
  }, [project, mob, projectId]);

  // Ensure discipline sign-offs exist
  const ensureSignoffs = useEnsureSignoffs(mob?.id, tenantId);
  useEffect(() => {
    if (mob?.id && tenantId) {
      ensureSignoffs.mutate();
    }
  }, [mob?.id, tenantId]);

  // Hooks
  const { data: signoffs, isLoading: signoffsLoading } = useSiteSignoffs(mob?.id);
  const signDiscipline = useSignDiscipline();
  const revokeSignoff = useRevokeSignoff();
  const updateVerification = useUpdateSiteRiskVerification();
  const { data: risks } = useSiteClearanceRisks(mob?.id);
  const addRisk = useAddSiteClearanceRisk();
  const deleteRisk = useDeleteSiteClearanceRisk();
  const { data: attachments } = useClearanceAttachments(mob?.id);
  const uploadAttachment = useUploadClearanceAttachment();
  const deleteAttachment = useDeleteClearanceAttachment();
  const { data: auditLogs } = useClearanceAuditLogs(mob?.id);

  // File drop
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'image/*': [], 'application/pdf': [] },
    maxSize: 10 * 1024 * 1024,
    onDrop: (files) => {
      if (mob?.id) {
        files.forEach(file => uploadAttachment.mutate({ mobilizationId: mob.id, file }));
      }
    },
  });

  // Computed states
  const requiredSignoffs = signoffs?.filter((s: any) => s.is_required) || [];
  const allRequiredSigned = requiredSignoffs.length > 0 && requiredSignoffs.every((s: any) => !!s.signed_at);
  const allSigned = (signoffs || []).every((s: any) => !s.is_required || !!s.signed_at);
  const utilityVerified = !!mob?.utility_verified;
  const allVerificationsPassed = utilityVerified && !!mob?.underground_utilities_identified && !!mob?.high_risk_zones_marked && !!mob?.work_boundaries_defined;
  
  const isGoReady = allVerificationsPassed && allRequiredSigned && project?.status === "active";
  const isApproved = mob?.status === "approved";

  const handleApprove = async () => {
    if (!mob || !user?.id) return;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (mob.validity_days || 30));
    await updateMob.mutateAsync({
      mobilizationId: mob.id,
      updates: {
        status: "approved",
        site_clearance_approved: true,
        ptw_enabled: true,
        approved_by: user.id,
        approved_at: new Date().toISOString(),
        clearance_expires_at: expiresAt.toISOString(),
      },
    });
    toast.success("Site Clearance approved — PTW enabled");
  };

  if (detailLoading) {
    return <div className="space-y-6"><Skeleton className="h-10 w-64" /><Skeleton className="h-48 w-full" /></div>;
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <AlertTriangle className="h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">Project not found</p>
        <Link to="/site-clearance"><Button variant="outline"><ArrowLeft className="me-2 h-4 w-4 rtl:rotate-180" />Back</Button></Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link to="/site-clearance">
          <Button variant="ghost" size="icon" className="shrink-0">
            <ArrowLeft className="h-5 w-5 rtl:rotate-180" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">{project.project_name}</h1>
          <p className="text-muted-foreground">{project.project_code}</p>
        </div>
        {/* GO / NO-GO Indicator */}
        <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 font-bold text-sm ${
          isApproved
            ? "border-green-500 bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400"
            : isGoReady
              ? "border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400"
              : "border-destructive bg-destructive/10 text-destructive"
        }`}>
          {isApproved ? (
            <><CheckCircle2 className="h-5 w-5" /> GO</>
          ) : isGoReady ? (
            <><Clock className="h-5 w-5" /> READY</>
          ) : (
            <><Ban className="h-5 w-5" /> NO-GO</>
          )}
        </div>
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
                <p className="text-xs text-muted-foreground">Contractor</p>
                <p className="font-medium text-sm">{(project as any).company?.company_name || "N/A"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <MapPin className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Site</p>
                <p className="font-medium text-sm">{(project as any).site?.name || "N/A"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">PM</p>
                <p className="font-medium text-sm">{(project as any).project_manager?.full_name || "N/A"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Duration</p>
                <p className="font-medium text-sm">
                  {format(new Date(project.start_date), "MMM d")} - {format(new Date(project.end_date), "MMM d, yyyy")}
                </p>
              </div>
            </div>
          </div>
          {/* Validity / Expiry */}
          {isApproved && mob?.clearance_expires_at && (
            <div className="mt-4 flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Valid until:</span>
              <span className="font-medium">{format(new Date(mob.clearance_expires_at), "PPP")}</span>
              {new Date(mob.clearance_expires_at) < new Date() && (
                <Badge variant="destructive">Expired</Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabbed Interface — 4 Sections */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="risk-verification" className="gap-1.5 text-xs sm:text-sm">
            <Shield className="h-4 w-4 hidden sm:block" />
            Site Risks
          </TabsTrigger>
          <TabsTrigger value="discipline-signoff" className="gap-1.5 text-xs sm:text-sm">
            <PenLine className="h-4 w-4 hidden sm:block" />
            Sign-Offs
          </TabsTrigger>
          <TabsTrigger value="risks-controls" className="gap-1.5 text-xs sm:text-sm">
            <AlertTriangle className="h-4 w-4 hidden sm:block" />
            Risks
          </TabsTrigger>
          <TabsTrigger value="work-readiness" className="gap-1.5 text-xs sm:text-sm">
            <CheckCircle2 className="h-4 w-4 hidden sm:block" />
            Readiness
          </TabsTrigger>
        </TabsList>

        {/* ==================== TAB 1: Site Risk Verification ==================== */}
        <TabsContent value="risk-verification" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Site Risk Verification</CardTitle>
              <CardDescription>Verify site safety conditions before work authorization</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { key: "utility_verified", notesKey: "utility_verified_notes", label: "Utility Verification", desc: "All utilities have been located and verified", required: true, icon: Zap },
                { key: "underground_utilities_identified", notesKey: "underground_utilities_notes", label: "Underground Utilities Identified", desc: "All underground services have been identified and marked", icon: Construction },
                { key: "high_risk_zones_marked", notesKey: "high_risk_zones_notes", label: "High-Risk Zones Marked", desc: "All high-risk areas are clearly marked and barricaded", icon: AlertTriangle },
                { key: "work_boundaries_defined", notesKey: "work_boundaries_notes", label: "Work Boundaries Defined", desc: "Work area boundaries are clearly established", icon: MapPin },
              ].map(item => {
                const checked = !!mob?.[item.key as keyof typeof mob];
                const notesValue = (mob as any)?.[item.notesKey] || "";
                const IconComp = item.icon;
                return (
                  <div key={item.key} className={`p-4 rounded-lg border transition-colors ${checked ? "border-green-500/50 bg-green-50/50 dark:bg-green-950/20" : "border-border"}`}>
                    <div className="flex items-start gap-4">
                      <Checkbox
                        id={item.key}
                        checked={checked}
                        disabled={isApproved || updateVerification.isPending}
                        onCheckedChange={(val) => {
                          if (mob?.id) {
                            updateVerification.mutate({ mobilizationId: mob.id, fields: { [item.key]: !!val } });
                          }
                        }}
                      />
                      <div className="flex-1">
                        <Label htmlFor={item.key} className="flex items-center gap-2 cursor-pointer">
                          <IconComp className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{item.label}</span>
                          {item.required && <Badge variant="outline" className="text-[10px]">Required</Badge>}
                        </Label>
                        <p className="text-sm text-muted-foreground mt-1">{item.desc}</p>
                      </div>
                      {checked ? <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" /> : isApproved ? <Lock className="h-5 w-5 text-muted-foreground shrink-0" /> : <XCircle className="h-5 w-5 text-muted-foreground/40 shrink-0" />}
                    </div>
                    <div className="mt-3 ps-8">
                      <Input
                        placeholder="Add notes..."
                        defaultValue={notesValue}
                        disabled={isApproved}
                        onBlur={(e) => {
                          if (mob?.id && e.target.value !== notesValue) {
                            updateVerification.mutate({ mobilizationId: mob.id, fields: { [item.notesKey]: e.target.value } });
                          }
                        }}
                        className="text-sm"
                      />
                    </div>
                  </div>
                );
              })}

              {!utilityVerified && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span className="font-medium">Utility verification is mandatory. Approval is blocked until completed.</span>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ==================== TAB 2: Discipline Sign-Off ==================== */}
        <TabsContent value="discipline-signoff" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Discipline Sign-Offs</CardTitle>
              <CardDescription>All required disciplines must sign off before clearance</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {signoffsLoading ? (
                <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>
              ) : (
                signoffs?.map((signoff: any) => {
                  const disc = DISCIPLINES.find(d => d.key === signoff.discipline);
                  const IconComp = disciplineIcons[signoff.discipline] || Shield;
                  const isSigned = !!signoff.signed_at;
                  const signerName = signoff.signer?.full_name;

                  return (
                    <div key={signoff.id} className={`flex items-center gap-4 p-4 rounded-lg border transition-colors ${isSigned ? "border-green-500/50 bg-green-50/50 dark:bg-green-950/20" : "border-border"}`}>
                      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${isSigned ? "bg-green-500/10" : "bg-muted"}`}>
                        <IconComp className={`h-5 w-5 ${isSigned ? "text-green-600" : "text-muted-foreground"}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{disc?.label || signoff.discipline}</span>
                          {!signoff.is_required && <Badge variant="outline" className="text-[10px]">Optional</Badge>}
                        </div>
                        {isSigned ? (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Signed by {signerName} · {format(new Date(signoff.signed_at), "MMM d, yyyy HH:mm")}
                          </p>
                        ) : (
                          <p className="text-xs text-muted-foreground mt-0.5">Awaiting signature</p>
                        )}
                        {signoff.comments && <p className="text-xs text-muted-foreground italic mt-1">"{signoff.comments}"</p>}
                      </div>
                      <div>
                        {isSigned ? (
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                            {!isApproved && (
                              <Button
                                variant="ghost" size="sm"
                                onClick={() => revokeSignoff.mutate(signoff.id)}
                                disabled={revokeSignoff.isPending}
                              >
                                <XCircle className="h-4 w-4 text-muted-foreground" />
                              </Button>
                            )}
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => signDiscipline.mutate({ signoffId: signoff.id })}
                            disabled={isApproved || signDiscipline.isPending}
                          >
                            {signDiscipline.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign Off"}
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}

              {/* Summary */}
              {signoffs && signoffs.length > 0 && (
                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {requiredSignoffs.filter((s: any) => !!s.signed_at).length} / {requiredSignoffs.length} required signatures completed
                    </span>
                    {allRequiredSigned ? (
                      <Badge className="bg-green-500">All Required Signed</Badge>
                    ) : (
                      <Badge variant="outline">Incomplete</Badge>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="risks-controls" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Known Risks & Control Measures</CardTitle>
              <CardDescription>Document identified risks with severity and control measures</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add Risk Form */}
              {!isApproved && (
                <div className="space-y-3 p-4 rounded-lg border border-dashed border-muted-foreground/30">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Severity</Label>
                      <NativeSelect
                        value={newRiskSeverity}
                        onChange={setNewRiskSeverity}
                        options={[
                          { value: "low", label: "Low" },
                          { value: "medium", label: "Medium" },
                          { value: "high", label: "High" },
                          { value: "critical", label: "Critical" },
                        ]}
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Risk Description</Label>
                    <Textarea
                      placeholder="Describe the risk..."
                      value={newRiskDesc}
                      onChange={(e) => setNewRiskDesc(e.target.value)}
                      rows={2}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Control Measures</Label>
                    <Textarea
                      placeholder="Describe mitigation / control measures..."
                      value={newRiskControls}
                      onChange={(e) => setNewRiskControls(e.target.value)}
                      rows={2}
                    />
                  </div>
                  <Button
                    size="sm"
                    disabled={!newRiskDesc.trim() || !mob?.id || addRisk.isPending}
                    onClick={() => {
                      if (mob?.id) {
                        addRisk.mutate({
                          mobilizationId: mob.id,
                          risk: { risk_description: newRiskDesc.trim(), severity: newRiskSeverity, control_measures: newRiskControls.trim() || undefined },
                        });
                        setNewRiskDesc("");
                        setNewRiskControls("");
                        setNewRiskSeverity("medium");
                      }
                    }}
                  >
                    {addRisk.isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                    Add Risk
                  </Button>
                </div>
              )}

              {/* Risks List */}
              {risks && risks.length > 0 ? (
                <div className="space-y-2">
                  {risks.map((risk: any) => (
                    <div key={risk.id} className="flex items-start gap-3 p-3 rounded-lg border">
                      <SeverityBadge severity={risk.severity} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{risk.risk_description}</p>
                        {risk.control_measures && (
                          <p className="text-xs text-muted-foreground mt-1">
                            <span className="font-medium">Controls:</span> {risk.control_measures}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {risk.creator?.full_name} · {format(new Date(risk.created_at), "MMM d, yyyy")}
                        </p>
                      </div>
                      {!isApproved && (
                        <Button
                          variant="ghost" size="icon"
                          onClick={() => mob?.id && deleteRisk.mutate({ riskId: risk.id, mobilizationId: mob.id })}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No risks documented yet.</p>
              )}
            </CardContent>
          </Card>

          {/* Attachments */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Attachments</CardTitle>
              <CardDescription>Upload photos, drawings, or supporting documents</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!isApproved && (
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                    isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
                  }`}
                >
                  <input {...getInputProps()} />
                  <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    {isDragActive ? "Drop files here..." : "Drag & drop files or click to browse"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Images & PDFs, max 10MB</p>
                </div>
              )}

              {attachments && attachments.length > 0 && (
                <div className="space-y-2">
                  {attachments.map((att: any) => (
                    <div key={att.id} className="flex items-center gap-3 p-3 rounded-lg border">
                      <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{att.file_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {att.uploader?.full_name} · {format(new Date(att.created_at), "MMM d, yyyy")}
                          {att.file_size && ` · ${(att.file_size / 1024).toFixed(0)} KB`}
                        </p>
                      </div>
                      {!isApproved && (
                        <Button
                          variant="ghost" size="icon"
                          onClick={() => mob?.id && deleteAttachment.mutate({ attachmentId: att.id, mobilizationId: mob.id })}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ==================== TAB 4: Work Readiness ==================== */}
        <TabsContent value="work-readiness" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Work Readiness — GO / NO-GO</CardTitle>
              <CardDescription>All gates must pass before site clearance can be approved</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Gate checks */}
              <div className="space-y-3">
                <GateRow label="Project Active" passed={project.status === "active"} detail={project.status} />
                <GateRow label="Utility Verified" passed={utilityVerified} critical={!utilityVerified} />
                <GateRow label="Underground Utilities Identified" passed={!!mob?.underground_utilities_identified} />
                <GateRow label="High-Risk Zones Marked" passed={!!mob?.high_risk_zones_marked} />
                <GateRow label="Work Boundaries Defined" passed={!!mob?.work_boundaries_defined} />
                <Separator />
                {DISCIPLINES.filter(d => d.required).map(d => {
                  const signoff = signoffs?.find((s: any) => s.discipline === d.key);
                  return <GateRow key={d.key} label={`${d.label} Sign-Off`} passed={!!signoff?.signed_at} />;
                })}
                <Separator />
                <GateRow label="Site Clearance Approved" passed={isApproved} />
                <GateRow label="PTW Enabled" passed={!!mob?.ptw_enabled} />
              </div>

              {/* Approve button */}
              {isGoReady && !isApproved && (
                <Button onClick={handleApprove} className="w-full" disabled={updateMob.isPending}>
                  {updateMob.isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                  <CheckCircle2 className="me-2 h-4 w-4" />
                  Approve Site Clearance & Enable PTW
                </Button>
              )}

              {!isGoReady && !isApproved && (
                <div className="flex items-center gap-3 p-4 rounded-lg border border-destructive/50 bg-destructive/5">
                  <Ban className="h-6 w-6 text-destructive shrink-0" />
                  <div>
                    <p className="font-semibold text-destructive">NO-GO — Clearance cannot be granted</p>
                    <p className="text-sm text-muted-foreground">Complete all required verifications and discipline sign-offs above.</p>
                  </div>
                </div>
              )}

              {isApproved && (
                <div className="flex items-center gap-3 p-4 rounded-lg border-green-500/50 bg-green-50 dark:bg-green-950/20 border">
                  <CheckCircle2 className="h-8 w-8 text-green-600 shrink-0" />
                  <div className="flex-1">
                    <p className="font-semibold text-green-700 dark:text-green-400">GO — Site Cleared for Work</p>
                    <p className="text-sm text-green-600 dark:text-green-500">PTW permits can now be issued for this project.</p>
                  </div>
                  <Link to={`/ptw/create?projectId=${projectId}`}>
                    <Button size="sm">Create Permit</Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Audit Trail */}
          {auditLogs && auditLogs.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Audit Trail
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {auditLogs.map((log: any) => (
                    <div key={log.id} className="flex items-start gap-3 p-2 text-sm">
                      <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground mt-2 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <span className="font-medium">{log.actor?.full_name}</span>
                        <span className="text-muted-foreground"> {log.action.replace(/_/g, " ")}</span>
                        {log.discipline && <span className="text-muted-foreground"> ({log.discipline.replace(/_/g, " ")})</span>}
                        <p className="text-xs text-muted-foreground">{format(new Date(log.created_at), "MMM d, yyyy HH:mm")}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function GateRow({ label, passed, detail, critical }: { label: string; passed: boolean; detail?: string; critical?: boolean }) {
  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg border ${critical ? "border-destructive/50 bg-destructive/5" : ""}`}>
      {passed ? (
        <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
      ) : critical ? (
        <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
      ) : (
        <Lock className="h-5 w-5 text-muted-foreground shrink-0" />
      )}
      <span className={`flex-1 text-sm ${passed ? "font-medium" : "text-muted-foreground"}`}>{label}</span>
      {detail && <Badge variant={passed ? "default" : "outline"} className="text-xs">{detail}</Badge>}
    </div>
  );
}

const SEVERITY_COLORS: Record<string, string> = {
  low: "bg-green-100 text-green-800 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800",
  medium: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800",
  high: "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-800",
  critical: "bg-red-100 text-red-800 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800",
};

function SeverityBadge({ severity }: { severity: string }) {
  return (
    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold capitalize shrink-0 ${SEVERITY_COLORS[severity] || SEVERITY_COLORS.medium}`}>
      {severity}
    </span>
  );
}
