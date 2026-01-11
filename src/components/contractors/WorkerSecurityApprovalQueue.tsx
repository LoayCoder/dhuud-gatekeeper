import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ShieldCheck, CheckCircle, XCircle, Clock, Building2, Phone, CreditCard, User, ShieldAlert, Video } from "lucide-react";
import { format } from "date-fns";
import {
  usePendingSecurityApprovals,
  useSecurityApproveWorker,
  useSecurityRejectWorker,
  useHasSecurityApprovalAccess,
  type ContractorWorker,
} from "@/hooks/contractor-management/use-contractor-workers";
import { PageLoader } from "@/components/ui/page-loader";
import { supabase } from "@/integrations/supabase/client";

export function WorkerSecurityApprovalQueue() {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar";
  
  const { data: pendingWorkers, isLoading } = usePendingSecurityApprovals();
  const { data: hasSecurityAccess, isLoading: accessLoading } = useHasSecurityApprovalAccess();
  const approveWorker = useSecurityApproveWorker();
  const rejectWorker = useSecurityRejectWorker();

  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState<ContractorWorker | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const handleApprove = (worker: ContractorWorker) => {
    approveWorker.mutate(worker.id);
  };

  const openRejectDialog = (worker: ContractorWorker) => {
    setSelectedWorker(worker);
    setRejectionReason("");
    setRejectDialogOpen(true);
  };

  const handleReject = () => {
    if (selectedWorker && rejectionReason.trim()) {
      rejectWorker.mutate(
        { workerId: selectedWorker.id, reason: rejectionReason },
        {
          onSuccess: () => {
            setRejectDialogOpen(false);
            setSelectedWorker(null);
            setRejectionReason("");
          },
        }
      );
    }
  };

  const getWorkerPhotoUrl = (photoPath: string | null) => {
    if (!photoPath) return null;
    const { data } = supabase.storage.from("contractor-documents").getPublicUrl(photoPath);
    return data?.publicUrl;
  };

  const getWorkerInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (isLoading || accessLoading) {
    return <PageLoader />;
  }

  // Access control: Only Security Supervisor or Security Manager can approve
  if (!hasSecurityAccess) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <ShieldAlert className="mx-auto h-12 w-12 text-destructive/50 mb-4" />
          <p className="text-muted-foreground font-medium">
            {t("contractors.securityRoleOnly", "Only Security Supervisors or Security Managers can approve workers")}
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            {t("contractors.contactSecurity", "Please contact your Security team if you need to approve a worker.")}
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!pendingWorkers || pendingWorkers.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <ShieldCheck className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground">
            {t("contractors.noWorkersAwaitingSecurityApproval", "No workers awaiting security approval")}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <div>
            <h2 className="text-xl font-semibold">
              {t("contractors.securityApprovalQueue", "Security Approval Queue")}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t("contractors.securityApproverRoles", "Security Supervisor / Security Manager")}
            </p>
          </div>
        </div>
        <Badge variant="secondary" className="text-sm">
          {pendingWorkers.length} {t("contractors.pending", "pending")}
        </Badge>
      </div>

      <Alert>
        <Video className="h-4 w-4" />
        <AlertDescription>
          {t(
            "contractors.securityApprovalNote",
            "After approval, a safety induction video will be automatically sent to the worker."
          )}
        </AlertDescription>
      </Alert>

      <p className="text-sm text-muted-foreground">
        {t(
          "contractors.securityApprovalDescription",
          "These workers have been pre-approved by the Contractor Admin and require final security clearance."
        )}
      </p>

      <div className="grid gap-4">
        {pendingWorkers.map((worker) => (
          <Card key={worker.id} className="border-s-4 border-s-primary">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={getWorkerPhotoUrl(worker.photo_path) || undefined} />
                    <AvatarFallback>{getWorkerInitials(worker.full_name)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-lg">
                      {isRTL && worker.full_name_ar ? worker.full_name_ar : worker.full_name}
                    </CardTitle>
                    {worker.company?.company_name && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Building2 className="h-3 w-3" />
                        {worker.company.company_name}
                      </p>
                    )}
                  </div>
                </div>
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                  <Clock className="h-3 w-3 me-1" />
                  {t("contractors.pendingSecurityReview", "Pending Security Review")}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Worker Details */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                  <span>{t("contractors.nationalId", "ID")}: {worker.national_id}</span>
                </div>
                {worker.mobile_number && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span dir="ltr">{worker.mobile_number}</span>
                  </div>
                )}
                {worker.nationality && (
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>{worker.nationality}</span>
                  </div>
                )}
              </div>

              {/* Worker Type Badge */}
              {worker.worker_type && worker.worker_type !== "worker" && (
                <Badge variant="secondary">
                  {worker.worker_type === "site_representative"
                    ? t("contractors.siteRepresentative", "Site Representative")
                    : worker.worker_type === "safety_officer"
                    ? t("contractors.safetyOfficer", "Safety Officer")
                    : worker.worker_type}
                </Badge>
              )}

              {/* Stage 1 Approval Info */}
              {worker.approved_at && (
                <p className="text-xs text-muted-foreground">
                  {t("contractors.preApprovedAt", "Pre-approved by Contractor Admin/Consultant")}:{" "}
                  {format(new Date(worker.approved_at), "PPp")}
                </p>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <Button
                  onClick={() => handleApprove(worker)}
                  disabled={approveWorker.isPending}
                  className="flex-1"
                >
                  <CheckCircle className="h-4 w-4 me-2" />
                  {t("contractors.grantSecurityClearance", "Grant Security Clearance")}
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => openRejectDialog(worker)}
                  disabled={rejectWorker.isPending}
                  className="flex-1"
                >
                  <XCircle className="h-4 w-4 me-2" />
                  {t("contractors.returnToPending", "Return with Comments")}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Rejection Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("contractors.returnWorkerToPending", "Return Worker to Pending")}</DialogTitle>
            <DialogDescription>
              {t(
                "contractors.returnWorkerDescription",
                "Please provide comments explaining the security concerns. The contractor will be notified and can address the issues."
              )}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder={t("contractors.securityCommentsPlaceholder", "Enter security comments/concerns...")}
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              {t("common.cancel", "Cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!rejectionReason.trim() || rejectWorker.isPending}
            >
              {t("contractors.returnToPending", "Return with Comments")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
