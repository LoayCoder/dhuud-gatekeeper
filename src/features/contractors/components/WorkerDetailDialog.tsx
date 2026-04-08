import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, QrCode, Video, CheckCircle, Clock, AlertTriangle, Send, FolderOpen, UserCheck, Loader2, CreditCard, Globe, Phone, MapPin } from "lucide-react";
import { format } from "date-fns";
import { ContractorWorker } from "@/features/contractors/hooks/use-contractor-workers";
import { WorkerQRCode } from "./WorkerQRCode";
import { ContractorDocumentUpload } from "./ContractorDocumentUpload";
import { WorkerPhotoGate } from "./WorkerPhotoGate";
import { IDCardActionButton } from '@/features/admin';
import { useWorkerInductions } from "@/features/contractors/hooks/use-worker-inductions";
import { useInductionVideos } from "@/features/contractors/hooks/use-induction-videos";
import { useContractorProjects } from "@/features/contractors/hooks/use-contractor-projects";
import { useOnboardWorker } from "@/features/contractors/hooks/use-worker-onboarding";
import { useWorkerQRCode } from "@/features/contractors/hooks/use-worker-qr-codes";
import { useWorkerProjectAssignment } from "@/features/contractors/hooks/use-worker-project-assignment";
import { WorkerOverviewTab } from "./shared/WorkerOverviewTab";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface WorkerDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  worker: ContractorWorker | null;
  readOnly?: boolean;
}

/** Shared read-only project display when a worker already has an assigned project */
function AssignedProjectBadge({ projectName, t }: { projectName: string; t: (key: string, fallback: string) => string }) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{t("contractors.workers.assignedProject", "Assigned Project")}</label>
      <div className="flex items-center gap-2 p-2 rounded-md border bg-muted/50">
        <MapPin className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">{projectName}</span>
        <Badge variant="outline" className="ms-auto text-xs">{t("contractors.workers.autoLinked", "Auto-linked")}</Badge>
      </div>
    </div>
  );
}

export function WorkerDetailDialog({ open, onOpenChange, worker, readOnly = false }: WorkerDetailDialogProps) {
  const { t } = useTranslation();
  const [isGeneratingQR, setIsGeneratingQR] = useState(false);
  const [isSendingInduction, setIsSendingInduction] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");

  const { data: inductions = [] } = useWorkerInductions({ workerId: worker?.id });
  const { data: videos = [] } = useInductionVideos();
  const { data: allProjects = [] } = useContractorProjects({ companyId: worker?.company_id });
  const projects = allProjects.filter(p => p.status === 'active');
  const { data: existingQRCode, refetch: refetchQRCode } = useWorkerQRCode(worker?.id || "");
  const onboardWorker = useOnboardWorker();
  const { data: projectAssignment } = useWorkerProjectAssignment(worker?.id);

  // Auto-link project when worker has an existing assignment
  const hasAutoLinkedProject = !!projectAssignment?.project_id;
  const autoLinkedProjectName = projectAssignment?.project?.project_name || "";
  const effectiveProjectId = hasAutoLinkedProject ? projectAssignment.project_id : selectedProjectId;

  useEffect(() => {
    if (projectAssignment?.project_id && !selectedProjectId) {
      setSelectedProjectId(projectAssignment.project_id);
    }
  }, [projectAssignment?.project_id]);

  useEffect(() => {
    const fetchPhotoUrl = async () => {
      if (!worker?.photo_path) { setPhotoUrl(null); return; }
      const { data } = await supabase.storage.from("worker-photos").createSignedUrl(worker.photo_path, 3600);
      if (data?.signedUrl) setPhotoUrl(data.signedUrl);
    };
    fetchPhotoUrl();
  }, [worker?.photo_path]);

  if (!worker) return null;

  const statusVariant = {
    pending: "secondary",
    approved: "default",
    rejected: "destructive",
  }[worker.approval_status] as "secondary" | "default" | "destructive";

  const latestInduction = inductions[0];
  const hasCompletedInduction = latestInduction?.status === "completed" || !!latestInduction?.acknowledged_at;
  const isInductionExpired = latestInduction?.expires_at ? new Date(latestInduction.expires_at) < new Date() : false;
  const isPhotoVerified = !!worker.photo_path && !!worker.photo_verified_at;
  const isApprovedOrSecurityApproved = worker.approval_status === "approved" || worker.security_approval_status === "approved";
  const needsPhotoGate = isApprovedOrSecurityApproved && !isPhotoVerified;

  const handleGenerateQR = async () => {
    if (!effectiveProjectId) {
      toast.error(t("contractors.messages.selectProject", "Please select a project first"));
      return;
    }
    setIsGeneratingQR(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase.from("profiles").select("tenant_id").eq("id", user?.id).single();
      if (!profile?.tenant_id) throw new Error("Could not determine tenant");
      const { error } = await supabase.functions.invoke("generate-worker-qr", {
        body: { worker_id: worker.id, project_id: effectiveProjectId, tenant_id: profile.tenant_id },
      });
      if (error) throw error;
      toast.success(t("contractors.messages.qrGenerated", "QR code generated successfully"));
    } catch (error) {
      console.error("Error generating QR:", error);
      toast.error(t("contractors.messages.qrError", "Failed to generate QR code"));
    } finally {
      setIsGeneratingQR(false);
    }
  };

  const handleSendInduction = async () => {
    if (!effectiveProjectId) {
      toast.error(t("contractors.messages.selectProjectForInduction", "Please select a project first"));
      return;
    }
    setIsSendingInduction(true);
    try {
      // Use send-induction-video which delegates to shared induction-sender module
      // No need to manually select video — the shared module handles language-based selection
      const { error } = await supabase.functions.invoke("send-induction-video", {
        body: { workerId: worker.id, projectId: effectiveProjectId },
      });
      if (error) throw error;
      toast.success(t("contractors.messages.inductionSent", "Induction video sent successfully"));
    } catch (error) {
      console.error("Error sending induction:", error);
      toast.error(t("contractors.messages.inductionError", "Failed to send induction video"));
    } finally {
      setIsSendingInduction(false);
    }
  };

  const getInductionStatusBadge = () => {
    if (!latestInduction) return <Badge variant="secondary">{t("contractors.induction.notSent", "Not Sent")}</Badge>;
    if (isInductionExpired) return <Badge variant="destructive">{t("contractors.induction.expired", "Expired")}</Badge>;
    switch (latestInduction.status) {
      case "completed": return <Badge variant="default" className="bg-green-500">{t("contractors.induction.completed", "Completed")}</Badge>;
      case "viewed": return <Badge variant="secondary" className="bg-blue-500 text-white">{t("contractors.induction.viewed", "Viewed")}</Badge>;
      case "sent": return <Badge variant="outline">{t("contractors.induction.sent", "Sent")}</Badge>;
      default: return <Badge variant="secondary">{t("contractors.induction.pending", "Pending")}</Badge>;
    }
  };

  const getInitials = (name: string) => name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={photoUrl || undefined} alt={worker.full_name} />
              <AvatarFallback>{getInitials(worker.full_name)}</AvatarFallback>
            </Avatar>
            <div>
              <DialogTitle className="text-start">{worker.full_name}</DialogTitle>
              <p className="text-sm text-muted-foreground">{worker.company?.company_name}</p>
            </div>
            <Badge variant={statusVariant} className="ms-auto">
              {t(`contractors.workers.status.${worker.approval_status}`, worker.approval_status)}
            </Badge>
          </div>
        </DialogHeader>

        <Tabs defaultValue="details" className="mt-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="details">{t("contractors.workers.details", "Details")}</TabsTrigger>
            <TabsTrigger value="documents">{t("contractors.workers.documents", "Documents")}</TabsTrigger>
            <TabsTrigger value="qr">{t("contractors.workers.qrCode", "QR Code")}</TabsTrigger>
            <TabsTrigger value="induction">{t("contractors.workers.induction", "Induction")}</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="mt-4">
            <WorkerOverviewTab worker={worker} photoUrl={photoUrl} />
          </TabsContent>

          <TabsContent value="documents" className="mt-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <FolderOpen className="h-4 w-4" />
                  {t("contractors.documents.workerDocuments", "Worker Documents")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ContractorDocumentUpload workerId={worker.id} canManage={!readOnly} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="qr" className="mt-4 space-y-4">
            {needsPhotoGate && !readOnly ? (
              <WorkerPhotoGate worker={worker} onVerified={() => onOpenChange(false)} />
            ) : worker.approval_status === "approved" ? (
              <>
                {!readOnly && (
                <Card className="border-primary/20 bg-primary/5">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <UserCheck className="h-4 w-4" />
                      {t("contractors.workers.quickOnboard", "Quick Onboard")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      {t("contractors.workers.onboardDescription", "Send induction video and generate QR code in one step.")}
                    </p>
                    {hasAutoLinkedProject ? (
                      <AssignedProjectBadge projectName={autoLinkedProjectName} t={t} />
                    ) : (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        {t("contractors.workers.selectProjectForQR", "Select Project")}
                      </label>
                      <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                        <SelectTrigger>
                          <SelectValue placeholder={t("contractors.workers.selectProject", "Select a project...")} />
                        </SelectTrigger>
                        <SelectContent>
                          {projects.map((project) => (
                            <SelectItem key={project.id} value={project.id}>{project.project_name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {projects.length === 0 && (
                        <p className="text-sm text-muted-foreground">{t("contractors.workers.noProjects", "No projects assigned to this company")}</p>
                      )}
                    </div>
                    )}
                    <Button
                      onClick={() => onboardWorker.mutate({ workerId: worker.id, projectId: selectedProjectId }, { onSuccess: () => refetchQRCode() })}
                      disabled={!selectedProjectId || onboardWorker.isPending}
                      className="w-full"
                    >
                      {onboardWorker.isPending ? <Loader2 className="h-4 w-4 me-2 animate-spin" /> : <UserCheck className="h-4 w-4 me-2" />}
                      {t("contractors.workers.onboardWorker", "Onboard Worker")}
                    </Button>
                  </CardContent>
                </Card>
                )}

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4" />
                        {t("contractors.workers.idCard", "ID Card")}
                      </span>
                      {existingQRCode && !readOnly && (
                        <IDCardActionButton
                          cardType="worker"
                          entityId={worker.id}
                          personData={{
                            id: worker.id, fullName: worker.full_name, fullNameAr: worker.full_name_ar || undefined,
                            photo: photoUrl || undefined, company: worker.company?.company_name,
                            role: worker.worker_type || t("contractors.workers.worker", "Worker"),
                            nationalId: worker.national_id, project: existingQRCode.project_name,
                            validUntil: existingQRCode.expires_at, qrToken: existingQRCode.qr_token,
                            qrUrl: `https://www.dhuud.com/worker-access/${existingQRCode.qr_token}`,
                            inductionCompleted: hasCompletedInduction,
                          }}
                          tenantId={worker.tenant_id}
                          tenantData={{ id: worker.tenant_id, name: '' }}
                          recipientPhone={worker.mobile_number}
                        />
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-2">
                    <WorkerQRCode
                      workerId={worker.id} workerName={worker.full_name}
                      qrData={existingQRCode ? { token: existingQRCode.qr_token, expires_at: existingQRCode.expires_at, is_active: existingQRCode.is_active, project_name: existingQRCode.project_name } : null}
                      onGenerateQR={handleGenerateQR} isGenerating={isGeneratingQR} disabled={!selectedProjectId || readOnly}
                    />
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <QrCode className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-sm text-muted-foreground">
                    {t("contractors.workers.approvalRequiredForQr", "Worker must be approved before QR code can be generated")}
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="induction" className="mt-4 space-y-4">
            {needsPhotoGate && !readOnly ? (
              <WorkerPhotoGate worker={worker} onVerified={() => window.location.reload()} />
            ) : (
            <>
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">{t("contractors.induction.status", "Induction Status")}</CardTitle>
                  {getInductionStatusBadge()}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {latestInduction ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Send className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">{t("contractors.induction.sentAt", "Sent")}:</span>
                      <span>{format(new Date(latestInduction.sent_at), "PPp")}</span>
                    </div>
                    {latestInduction.viewed_at && (
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-blue-500" />
                        <span className="text-muted-foreground">{t("contractors.induction.viewedAt", "Viewed")}:</span>
                        <span>{format(new Date(latestInduction.viewed_at), "PPp")}</span>
                      </div>
                    )}
                    {latestInduction.acknowledged_at && (
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-muted-foreground">{t("contractors.induction.completedAt", "Completed")}:</span>
                        <span>{format(new Date(latestInduction.acknowledged_at), "PPp")}</span>
                      </div>
                    )}
                    {latestInduction.expires_at && (
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">{t("contractors.induction.expiresAt", "Expires")}:</span>
                        <span className={isInductionExpired ? "text-destructive font-medium" : ""}>
                          {format(new Date(latestInduction.expires_at), "PPp")}
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <AlertTriangle className="h-4 w-4" />
                    {t("contractors.induction.noInductionSent", "No induction has been sent to this worker yet.")}
                  </div>
                )}
              </CardContent>
            </Card>

            {!readOnly && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">{t("contractors.induction.sendVideo", "Send Induction Video")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  {t("contractors.induction.description", "Send safety induction video to worker via WhatsApp based on their preferred language.")}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t("contractors.workers.selectProjectForInduction", "Select Project")}</label>
                  <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                    <SelectTrigger>
                      <SelectValue placeholder={t("contractors.workers.selectProject", "Select a project...")} />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>{project.project_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {projects.length === 0 && (
                    <p className="text-sm text-muted-foreground">{t("contractors.workers.noProjects", "No projects assigned to this company")}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{t("contractors.workers.preferredLanguage", "Language")}:</span>
                  <Badge variant="outline">{worker.preferred_language?.toUpperCase() ?? "—"}</Badge>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{t("contractors.workers.mobile", "Mobile")}:</span>
                  <span dir="ltr">{worker.mobile_number}</span>
                </div>
                <Button onClick={handleSendInduction} disabled={isSendingInduction || !selectedProjectId}>
                  <Video className={`h-4 w-4 me-2 ${isSendingInduction ? "animate-pulse" : ""}`} />
                  {latestInduction
                    ? t("contractors.induction.resend", "Resend Induction Video")
                    : t("contractors.induction.send", "Send Induction Video")}
                </Button>
              </CardContent>
            </Card>
            )}
            </>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
