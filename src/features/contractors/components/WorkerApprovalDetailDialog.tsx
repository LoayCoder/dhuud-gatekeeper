import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Check, X, Phone, Globe, Calendar, User, Mail, Shield,
  AlertTriangle, FileWarning, HeartPulse, GraduationCap,
  Building2, Video, BookOpen, Camera,
} from "lucide-react";
import { format } from "date-fns";
import { ContractorWorker, useApproveWorker } from "@/features/contractors/hooks/use-contractor-workers";
import { ContractorDocumentUpload } from "./ContractorDocumentUpload";
import { WorkerRejectionDialog } from "./WorkerRejectionDialog";
import { useWorkerProjectAssignment } from "@/features/contractors/hooks/use-worker-project-assignment";
import { supabase } from "@/integrations/supabase/client";

interface WorkerApprovalDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  worker: ContractorWorker | null;
  isSecurityStage?: boolean;
}

export function WorkerApprovalDetailDialog({
  open, onOpenChange, worker, isSecurityStage = false,
}: WorkerApprovalDetailDialogProps) {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  const approveWorker = useApproveWorker();
  const [rejectOpen, setRejectOpen] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  const { data: projectAssignment } = useWorkerProjectAssignment(worker?.id);

  useEffect(() => {
    const fetchPhoto = async () => {
      if (!worker?.photo_path) { setPhotoUrl(null); return; }
      const { data } = supabase.storage.from("contractor-photos").getPublicUrl(worker.photo_path);
      setPhotoUrl(data?.publicUrl || null);
    };
    fetchPhoto();
  }, [worker?.photo_path]);

  if (!worker) return null;

  const complianceFlags = getComplianceFlags(worker, t);
  const projectData = projectAssignment?.project as { project_name: string; status: string } | null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] p-0" dir={direction}>
          <DialogHeader className="px-6 pt-6 pb-2">
            <DialogTitle className="text-lg">
              {t("contractors.workers.approvalReview", "Worker Approval Review")}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              {worker.full_name} — {worker.national_id}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[calc(90vh-160px)]">
            <div className="px-6 pb-2">
              <Tabs defaultValue="overview">
                <TabsList className="w-full">
                  <TabsTrigger value="overview" className="flex-1">
                    <User className="h-4 w-4 me-1" />
                    {t("common.overview", "Overview")}
                  </TabsTrigger>
                  <TabsTrigger value="documents" className="flex-1">
                    <BookOpen className="h-4 w-4 me-1" />
                    {t("common.documents", "Documents")}
                  </TabsTrigger>
                  <TabsTrigger value="induction" className="flex-1">
                    <Video className="h-4 w-4 me-1" />
                    {t("contractors.induction.title", "Induction")}
                  </TabsTrigger>
                </TabsList>

                {/* ── Overview Tab ── */}
                <TabsContent value="overview" className="mt-4 space-y-4">
                  {/* Compliance Flags */}
                  {complianceFlags.length > 0 && (
                    <div className="space-y-2">
                      {complianceFlags.map((flag, i) => (
                        <Alert key={i} variant={flag.level === "critical" ? "destructive" : "default"}
                          className={flag.level === "warning" ? "border-warning bg-warning/10" : ""}>
                          <flag.icon className="h-4 w-4" />
                          <AlertDescription className="text-sm">{flag.message}</AlertDescription>
                        </Alert>
                      ))}
                    </div>
                  )}

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
                      <CardTitle className="text-sm">{t("common.personalInfo", "Personal Information")}</CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-4">
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <InfoRow icon={Shield} label={t("contractors.workers.idType", "ID Type")} value={worker.id_type || "-"} />
                        <InfoRow icon={Shield} label={t("contractors.workers.nationalId", "National ID")} value={worker.national_id} mono />
                        <InfoRow icon={Calendar} label={t("contractors.workers.dateOfBirth", "Date of Birth")}
                          value={worker.date_of_birth ? format(new Date(worker.date_of_birth), "PP") : "-"} />
                        <InfoRow icon={User} label={t("contractors.workers.gender", "Gender")} value={worker.gender || "-"} />
                        <InfoRow icon={Globe} label={t("contractors.workers.nationality", "Nationality")} value={worker.nationality || "-"} />
                        <InfoRow icon={Phone} label={t("contractors.workers.mobile", "Mobile")} value={worker.mobile_number} dir="ltr" />
                        <InfoRow icon={Mail} label={t("common.email", "Email")} value={worker.email || "-"} />
                        <InfoRow icon={Globe} label={t("contractors.workers.language", "Language")} value={worker.preferred_language === "ar" ? "العربية" : "English"} />
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
                          <InfoRow icon={User} label={t("common.name", "Name")} value={worker.emergency_contact_name || "-"} />
                          <InfoRow icon={Phone} label={t("common.phone", "Phone")} value={worker.emergency_contact_phone || "-"} dir="ltr" />
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
                            <FitnessBadge status={worker.fitness_to_work} />
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
                        <InfoRow icon={Calendar} label={t("contractors.workers.medicalCheckDate", "Medical Check")}
                          value={worker.medical_check_date ? format(new Date(worker.medical_check_date), "PP") : "-"} />
                        <InfoRow icon={Calendar} label={t("contractors.workers.fitnessExpiry", "Fitness Expiry")}
                          value={worker.fitness_expiry_date ? format(new Date(worker.fitness_expiry_date), "PP") : "-"} />
                      </div>
                    </CardContent>
                  </Card>

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

                  <p className="text-xs text-muted-foreground">
                    {t("common.submitted", "Submitted")}: {format(new Date(worker.created_at), "PPp")}
                  </p>
                </TabsContent>

                {/* ── Documents Tab ── */}
                <TabsContent value="documents" className="mt-4">
                  <ContractorDocumentUpload workerId={worker.id} canManage={false} />
                </TabsContent>

                {/* ── Induction Tab ── */}
                <TabsContent value="induction" className="mt-4 space-y-4">
                  <Card>
                    <CardHeader className="py-3 px-4">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        {t("contractors.projects.assignedProject", "Assigned Project")}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-4 text-sm">
                      {projectData ? (
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{projectData.project_name}</span>
                          <Badge variant="outline">{projectData.status}</Badge>
                        </div>
                      ) : (
                        <p className="text-muted-foreground">
                          {t("contractors.workers.noProjectAssigned", "No project assigned yet")}
                        </p>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="py-3 px-4">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Video className="h-4 w-4" />
                        {t("contractors.induction.inductionStatus", "Induction Status")}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-4 text-sm space-y-2">
                      <div className="grid grid-cols-2 gap-3">
                        <InfoRow icon={Phone} label={t("contractors.workers.mobile", "Mobile")} value={worker.mobile_number} dir="ltr" />
                        <InfoRow icon={Globe} label={t("contractors.workers.language", "Language")}
                          value={worker.preferred_language === "ar" ? "العربية" : "English"} />
                      </div>
                      <Alert className="mt-3">
                        <Video className="h-4 w-4" />
                        <AlertDescription className="text-xs">
                          {t("contractors.induction.autoSendNote",
                            "Induction video will be sent automatically to the worker upon approval via WhatsApp/Email.")}
                        </AlertDescription>
                      </Alert>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </ScrollArea>

          {/* Footer Actions */}
          <div className="flex gap-2 px-6 py-4 border-t">
            <Button
              size="sm"
              className="flex-1"
              onClick={() => {
                approveWorker.mutate(worker.id);
                onOpenChange(false);
              }}
              disabled={approveWorker.isPending}
            >
              <Check className="h-4 w-4 me-1" />
              {t("common.approve", "Approve")}
            </Button>
            <Button
              size="sm"
              variant="destructive"
              className="flex-1"
              onClick={() => setRejectOpen(true)}
            >
              <X className="h-4 w-4 me-1" />
              {t("common.reject", "Reject")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <WorkerRejectionDialog
        open={rejectOpen}
        onOpenChange={(o) => {
          setRejectOpen(o);
          if (!o) onOpenChange(false);
        }}
        worker={worker}
      />
    </>
  );
}

/* ── Helpers ── */

function InfoRow({ icon: Icon, label, value, mono, dir }: {
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

function FitnessBadge({ status }: { status?: string | null }) {
  if (!status || status === "pending") {
    return <Badge variant="outline" className="text-amber-600 border-amber-300">Pending</Badge>;
  }
  if (status === "fit") {
    return <Badge variant="outline" className="text-green-600 border-green-300">Fit</Badge>;
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
