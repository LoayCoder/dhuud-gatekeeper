import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, Phone, Globe, Calendar, FileText, QrCode, Video, CheckCircle, Clock, AlertTriangle, Send, FolderOpen, UserCheck, Loader2, CreditCard, Camera, Lock, User, Mail, Shield, HeartPulse, GraduationCap, FileWarning, BookOpen, X, Check } from "lucide-react";
import { format } from "date-fns";
import { ContractorWorker } from "@/features/contractors/hooks/use-contractor-workers";
import { WorkerQRCode } from "./WorkerQRCode";
import { ContractorDocumentUpload } from "./ContractorDocumentUpload";
import { WorkerPhotoGate } from "./WorkerPhotoGate";
import { IDCardActionButton } from '@/features/admin';
import { useWorkerInductions } from "@/features/contractors/hooks/use-worker-inductions";
import { useInductionVideos } from "@/features/contractors/hooks/use-induction-videos";
import { useContractorProjects } from "@/features/contractors/hooks/use-contractor-projects";
import { useWorkerProjectAssignment } from "@/features/contractors/hooks/use-worker-project-assignment";
import { useOnboardWorker } from "@/features/contractors/hooks/use-worker-onboarding";
import { useWorkerQRCode } from "@/features/contractors/hooks/use-worker-qr-codes";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface WorkerDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  worker: ContractorWorker | null;
  readOnly?: boolean;
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
  // Filter to only show active projects for onboarding
  const projects = allProjects.filter(p => p.status === 'active');
  const { data: existingQRCode, refetch: refetchQRCode } = useWorkerQRCode(worker?.id || "");
  const onboardWorker = useOnboardWorker();
  const { data: projectAssignment } = useWorkerProjectAssignment(worker?.id);

  // Fetch photo URL
  useEffect(() => {
    const fetchPhotoUrl = async () => {
      if (!worker?.photo_path) {
        setPhotoUrl(null);
        return;
      }
      const { data } = await supabase.storage
        .from("worker-photos")
        .createSignedUrl(worker.photo_path, 3600);
      if (data?.signedUrl) {
        setPhotoUrl(data.signedUrl);
      }
    };
    fetchPhotoUrl();
  }, [worker?.photo_path]);

  if (!worker) return null;

  const statusVariant = {
    pending: "secondary",
    approved: "default",
    rejected: "destructive",
  }[worker.approval_status] as "secondary" | "default" | "destructive";

  // Find the latest induction for this worker
  const latestInduction = inductions[0];
  const hasCompletedInduction = latestInduction?.status === "completed" || !!latestInduction?.acknowledged_at;
  const isInductionExpired = latestInduction?.expires_at 
    ? new Date(latestInduction.expires_at) < new Date() 
    : false;

  // Photo gate: worker must have a verified photo before induction/QR/ID
  const isPhotoVerified = !!worker.photo_path && !!worker.photo_verified_at;
  const isApprovedOrSecurityApproved = worker.approval_status === "approved" || worker.security_approval_status === "approved";
  const needsPhotoGate = isApprovedOrSecurityApproved && !isPhotoVerified;

  const handleGenerateQR = async () => {
    if (!selectedProjectId) {
      toast.error(t("contractors.messages.selectProject", "Please select a project first"));
      return;
    }

    setIsGeneratingQR(true);
    try {
      // Get tenant_id from user profile
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from("profiles")
        .select("tenant_id")
        .eq("id", user?.id)
        .single();

      if (!profile?.tenant_id) {
        throw new Error("Could not determine tenant");
      }

      const { error } = await supabase.functions.invoke("generate-worker-qr", {
        body: { 
          worker_id: worker.id,
          project_id: selectedProjectId,
          tenant_id: profile.tenant_id
        },
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
    // Require project selection for induction
    if (!selectedProjectId) {
      toast.error(t("contractors.messages.selectProjectForInduction", "Please select a project first"));
      return;
    }

    setIsSendingInduction(true);
    try {
      // Find the appropriate video for the worker's preferred language
      const languageVideo = videos.find((v) => v.language === worker.preferred_language && v.is_active);
      const defaultVideo = videos.find((v) => v.language === "en" && v.is_active);
      const videoToSend = languageVideo || defaultVideo;

      if (!videoToSend) {
        toast.error(t("contractors.messages.noVideoAvailable", "No induction video available for this language"));
        return;
      }

      const { error } = await supabase.functions.invoke("send-induction-video", {
        body: { 
          workerId: worker.id, 
          videoId: videoToSend.id,
          projectId: selectedProjectId,
          mobileNumber: worker.mobile_number,
          language: worker.preferred_language,
        },
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
    if (!latestInduction) {
      return <Badge variant="secondary">{t("contractors.induction.notSent", "Not Sent")}</Badge>;
    }
    if (isInductionExpired) {
      return <Badge variant="destructive">{t("contractors.induction.expired", "Expired")}</Badge>;
    }
    switch (latestInduction.status) {
      case "completed":
        return <Badge variant="default" className="bg-green-500">{t("contractors.induction.completed", "Completed")}</Badge>;
      case "viewed":
        return <Badge variant="secondary" className="bg-blue-500 text-white">{t("contractors.induction.viewed", "Viewed")}</Badge>;
      case "sent":
        return <Badge variant="outline">{t("contractors.induction.sent", "Sent")}</Badge>;
      default:
        return <Badge variant="secondary">{t("contractors.induction.pending", "Pending")}</Badge>;
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

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

          <TabsContent value="details" className="mt-4 space-y-4">
            {/* Compliance Flags */}
            {(() => {
              const complianceFlags = getComplianceFlags(worker, t);
              return complianceFlags.length > 0 ? (
                <div className="space-y-2">
                  {complianceFlags.map((flag, i) => (
                    <Alert key={i} variant={flag.level === "critical" ? "destructive" : "default"}
                      className={flag.level === "warning" ? "border-warning bg-warning/10" : ""}>
                      <flag.icon className="h-4 w-4" />
                      <AlertDescription className="text-sm">{flag.message}</AlertDescription>
                    </Alert>
                  ))}
                </div>
              ) : null;
            })()}

            {/* Photo + Basic Info */}
            <div className="flex items-start gap-4">
              <Avatar className="h-20 w-20 border-2 border-border">
                <AvatarImage src={photoUrl || undefined} />
                <AvatarFallback className="text-xl">{worker.full_name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-1">
                <h3 className="text-base font-semibold">{worker.full_name}</h3>
                {worker.full_name_ar && (
                  <p className="text-sm text-muted-foreground" dir="rtl">{worker.full_name_ar}</p>
                )}
                <p className="text-sm text-muted-foreground">{worker.company?.company_name}</p>
                {worker.worker_role && (
                  <Badge variant="secondary" className="mt-1">{worker.worker_role}</Badge>
                )}
              </div>
            </div>

            <Separator />

            {/* Personal Info Grid */}
            <Card>
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm">{t("contractors.workers.personalInfo", "Personal Information")}</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <DetailInfoRow icon={Shield} label={t("contractors.workers.idType", "ID Type")} value={worker.id_type || "-"} />
                  <DetailInfoRow icon={Shield} label={t("contractors.workers.nationalId", "National ID")} value={worker.national_id} mono />
                  <DetailInfoRow icon={Calendar} label={t("contractors.workers.dateOfBirth", "Date of Birth")}
                    value={worker.date_of_birth ? format(new Date(worker.date_of_birth), "PP") : "-"} />
                  <DetailInfoRow icon={User} label={t("contractors.workers.gender", "Gender")} value={worker.gender || "-"} />
                  <DetailInfoRow icon={Globe} label={t("contractors.workers.nationality", "Nationality")} value={worker.nationality || "-"} />
                  <DetailInfoRow icon={Phone} label={t("contractors.workers.mobile", "Mobile")} value={worker.mobile_number} dir="ltr" />
                  <DetailInfoRow icon={Mail} label={t("common.email", "Email")} value={worker.email || "-"} />
                  <DetailInfoRow icon={Globe} label={t("contractors.workers.language", "Language")} value={worker.preferred_language === "ar" ? "العربية" : "English"} />
                </div>
              </CardContent>
            </Card>

            {/* Emergency Contact */}
            {(worker.emergency_contact_name || worker.emergency_contact_phone) && (
              <Card>
                <CardHeader className="py-3 px-4">
                  <CardTitle className="text-sm">{t("contractors.workers.emergencyContact", "Emergency Contact")}</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4 text-sm">
                  <div className="grid grid-cols-2 gap-3">
                    <DetailInfoRow icon={User} label={t("common.name", "Name")} value={worker.emergency_contact_name || "-"} />
                    <DetailInfoRow icon={Phone} label={t("common.phone", "Phone")} value={worker.emergency_contact_phone || "-"} dir="ltr" />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Fitness to Work */}
            <Card>
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm flex items-center gap-2">
                  <HeartPulse className="h-4 w-4" />
                  {t("contractors.workers.fitnessToWork", "Fitness to Work")}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 text-sm space-y-2">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-muted-foreground">{t("common.status", "Status")}</span>
                    <div className="mt-1">
                      <DetailFitnessBadge status={worker.fitness_to_work} />
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t("contractors.workers.acknowledged", "Acknowledged")}</span>
                    <div className="mt-1">
                      {worker.fitness_acknowledged ? (
                        <Badge variant="outline" className="text-success border-success/30">
                          <Check className="h-3 w-3 me-1" /> {t("common.yes", "Yes")}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-warning border-warning/30">
                          <X className="h-3 w-3 me-1" /> {t("common.no", "No")}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <DetailInfoRow icon={Calendar} label={t("contractors.workers.medicalCheckDate", "Medical Check")}
                    value={worker.medical_check_date ? format(new Date(worker.medical_check_date), "PP") : "-"} />
                  <DetailInfoRow icon={Calendar} label={t("contractors.workers.fitnessExpiry", "Fitness Expiry")}
                    value={worker.fitness_expiry_date ? format(new Date(worker.fitness_expiry_date), "PP") : "-"} />
                </div>
              </CardContent>
            </Card>

            {/* Assigned Project */}
            {(() => {
              const projData = projectAssignment?.project as { project_name: string; status: string } | null;
              return (
                <Card>
                  <CardHeader className="py-3 px-4">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      {t("contractors.projects.assignedProject", "Assigned Project")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4 text-sm">
                    {projData ? (
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{projData.project_name}</span>
                        <Badge variant="outline">{projData.status}</Badge>
                      </div>
                    ) : (
                      <p className="text-muted-foreground">
                        {t("contractors.workers.noProjectAssigned", "No project assigned yet")}
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })()}

            {/* Training Certifications */}
            {worker.training_certifications && worker.training_certifications.length > 0 && (
              <Card>
                <CardHeader className="py-3 px-4">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <GraduationCap className="h-4 w-4" />
                    {t("contractors.workers.trainingCertifications", "Training Certifications")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <div className="flex flex-wrap gap-2">
                    {worker.training_certifications.map((cert, i) => (
                      <Badge key={i} variant="secondary">{cert}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {worker.rejection_reason && (
              <Card className="border-destructive">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-destructive">
                    {t("contractors.workers.rejectionReason", "Rejection Reason")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{worker.rejection_reason}</p>
                </CardContent>
              </Card>
            )}

            <p className="text-xs text-muted-foreground">
              {t("common.submitted", "Submitted")}: {format(new Date(worker.created_at), "PPp")}
            </p>
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
                {/* Quick Onboard Card - hidden in readOnly mode */}
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
                            <SelectItem key={project.id} value={project.id}>
                              {project.project_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {projects.length === 0 && (
                        <p className="text-sm text-muted-foreground">
                          {t("contractors.workers.noProjects", "No projects assigned to this company")}
                        </p>
                      )}
                    </div>
                    <Button 
                      onClick={() => onboardWorker.mutate(
                        { workerId: worker.id, projectId: selectedProjectId },
                        { onSuccess: () => refetchQRCode() }
                      )}
                      disabled={!selectedProjectId || onboardWorker.isPending}
                      className="w-full"
                    >
                      {onboardWorker.isPending ? (
                        <Loader2 className="h-4 w-4 me-2 animate-spin" />
                      ) : (
                        <UserCheck className="h-4 w-4 me-2" />
                      )}
                      {t("contractors.workers.onboardWorker", "Onboard Worker")}
                    </Button>
                  </CardContent>
                </Card>
                )}

                {/* ID Card & QR Code Display */}
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
                            id: worker.id,
                            fullName: worker.full_name,
                            fullNameAr: worker.full_name_ar || undefined,
                            photo: photoUrl || undefined,
                            company: worker.company?.company_name,
                            role: worker.worker_type || t("contractors.workers.worker", "Worker"),
                            nationalId: worker.national_id,
                            project: existingQRCode.project_name,
                            validUntil: existingQRCode.expires_at,
                            qrToken: existingQRCode.qr_token,
                            qrUrl: `https://www.dhuud.com/worker-access/${existingQRCode.qr_token}`,
                            inductionCompleted: hasCompletedInduction,
                          }}
                          tenantId={worker.tenant_id}
                          tenantData={{
                            id: worker.tenant_id,
                            name: '',
                          }}
                          recipientPhone={worker.mobile_number}
                        />
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-2">
                    <WorkerQRCode
                      workerId={worker.id}
                      workerName={worker.full_name}
                      qrData={existingQRCode ? {
                        token: existingQRCode.qr_token,
                        expires_at: existingQRCode.expires_at,
                        is_active: existingQRCode.is_active,
                        project_name: existingQRCode.project_name,
                      } : null}
                      onGenerateQR={handleGenerateQR}
                      isGenerating={isGeneratingQR}
                      disabled={!selectedProjectId || readOnly}
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
            {/* Induction Status Card */}
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

            {/* Send Induction Card - hidden in readOnly mode */}
            {!readOnly && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">{t("contractors.induction.sendVideo", "Send Induction Video")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  {t("contractors.induction.description", "Send safety induction video to worker via WhatsApp based on their preferred language.")}
                </div>
                
                {/* Project Selection for Induction */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    {t("contractors.workers.selectProjectForInduction", "Select Project")}
                  </label>
                  <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                    <SelectTrigger>
                      <SelectValue placeholder={t("contractors.workers.selectProject", "Select a project...")} />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.project_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {projects.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      {t("contractors.workers.noProjects", "No projects assigned to this company")}
                    </p>
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
                <Button 
                  onClick={handleSendInduction} 
                  disabled={isSendingInduction || !selectedProjectId}
                >
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

/* ── Detail View Helpers ── */

function DetailInfoRow({ icon: Icon, label, value, mono, dir }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string; value: string; mono?: boolean; dir?: string;
}) {
  return (
    <div>
      <span className="text-muted-foreground flex items-center gap-1">
        <Icon className="h-3 w-3" /> {label}
      </span>
      <p className={`mt-0.5 font-medium ${mono ? "font-mono text-xs" : ""}`} dir={dir}>{value}</p>
    </div>
  );
}

function DetailFitnessBadge({ status }: { status?: string | null }) {
  if (!status || status === "pending") {
    return <Badge variant="outline" className="text-warning border-warning/30">Pending</Badge>;
  }
  if (status === "fit") {
    return <Badge variant="outline" className="text-success border-success/30">Fit</Badge>;
  }
  return <Badge variant="destructive">{status}</Badge>;
}

function getComplianceFlags(worker: ContractorWorker, t: (k: string, d: string) => string) {
  const flags: { level: "critical" | "warning"; icon: React.ComponentType<{ className?: string }>; message: string }[] = [];

  if (!worker.photo_path) {
    flags.push({ level: "warning", icon: Camera, message: t("contractors.workers.missingPhoto", "Worker photo is missing") });
  }

  if (!worker.fitness_acknowledged) {
    flags.push({ level: "warning", icon: HeartPulse, message: t("contractors.workers.fitnessNotAcknowledged", "Fitness to work not acknowledged") });
  }

  if (worker.fitness_to_work === "not_fit") {
    flags.push({ level: "critical", icon: HeartPulse, message: t("contractors.workers.notFitToWork", "Worker is NOT fit to work") });
  }

  if (worker.fitness_expiry_date) {
    const expiry = new Date(worker.fitness_expiry_date);
    if (expiry < new Date()) {
      flags.push({ level: "critical", icon: FileWarning, message: t("contractors.workers.medicalExpired", "Medical fitness has expired") });
    }
  } else if (!worker.medical_check_date) {
    flags.push({ level: "warning", icon: FileWarning, message: t("contractors.workers.noMedicalRecord", "No medical check on record") });
  }

  return flags;
}

