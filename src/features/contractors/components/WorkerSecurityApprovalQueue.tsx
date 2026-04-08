import { useState, useEffect } from "react";
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
import { ShieldCheck, CheckCircle, XCircle, Building2, Phone, CreditCard, User, ShieldAlert, Video, Eye } from "lucide-react";
import { format } from "date-fns";
import {
  usePendingSecurityApprovals,
  useSecurityApproveWorker,
  useSecurityRejectWorker,
  useHasSecurityApprovalAccess,
  type ContractorWorker,
} from "@/features/contractors/hooks/use-contractor-workers";
import { WorkerApprovalDetailDialog } from "@/features/contractors/components/WorkerApprovalDetailDialog";
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
  const [viewWorker, setViewWorker] = useState<ContractorWorker | null>(null);

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

  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchPhotos = async () => {
      if (!pendingWorkers) return;
      const urls: Record<string, string> = {};
      for (const w of pendingWorkers) {
        if (w.photo_path) {
          const { data } = await supabase.storage.from("worker-photos").createSignedUrl(w.photo_path, 3600);
          if (data?.signedUrl) urls[w.id] = data.signedUrl;
        }
      }
      setPhotoUrls(urls);
    };
    fetchPhotos();
  }, [pendingWorkers]);

  const getWorkerInitials = (name: string) => {
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  };

  if (isLoading || accessLoading) return <PageLoader />;

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
      <div className="flex items-start sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <ShieldCheck className="h-5 w-5 text-primary flex-shrink-0" />
          <div className="min-w-0">
            <h2 className="text-lg sm:text-xl font-semibold truncate">
              {t("contractors.securityApprovalQueue", "Security Approval Queue")}
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {t("contractors.securityApproverRoles", "Security Supervisor / Security Manager")}
            </p>
          </div>
        </div>
        <Badge variant="secondary" className="text-xs sm:text-sm flex-shrink-0">
          {pendingWorkers.length} {t("contractors.pending", "pending")}
        </Badge>
      </div>

      <Alert className="py-2">
        <Video className="h-4 w-4" />
        <AlertDescription className="text-xs sm:text-sm">
          {t("contractors.securityApprovalNote", "After approval, a safety induction video will be automatically sent to the worker.")}
        </AlertDescription>
      </Alert>

      <p className="text-xs sm:text-sm text-muted-foreground">
        {t("contractors.securityApprovalDescription", "These workers have been pre-approved by the Contractor Admin and require final security clearance.")}
      </p>

      <div className="grid gap-3 sm:gap-4">
        {pendingWorkers.map((worker) => (
          <Card key={worker.id} className="border-s-4 border-s-primary overflow-hidden">
            <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6 pt-3 sm:pt-6">
              <div className="flex items-start gap-3">
                <Avatar className="h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0">
                  <AvatarImage src={photoUrls[worker.id] || undefined} />
                  <AvatarFallback className="text-sm">{getWorkerInitials(worker.full_name)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-base sm:text-lg leading-tight break-words">
                    {isRTL && worker.full_name_ar ? worker.full_name_ar : worker.full_name}
                  </CardTitle>
                  {worker.company?.company_name && (
                    <p className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Building2 className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate">{worker.company.company_name}</span>
                    </p>
                  )}
                </div>
                <Button variant="ghost" size="icon" className="flex-shrink-0 h-8 w-8" onClick={() => setViewWorker(worker)}>
                  <Eye className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 px-3 sm:px-6 pb-3 sm:pb-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
                <div className="flex items-center gap-2 min-w-0">
                  <CreditCard className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                  <span className="text-xs sm:text-sm break-all">{t("contractors.nationalId", "ID")}: {worker.national_id}</span>
                </div>
                {worker.mobile_number && (
                  <div className="flex items-center gap-2 min-w-0">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                    <span dir="ltr" className="text-xs sm:text-sm break-all">{worker.mobile_number}</span>
                  </div>
                )}
                {worker.nationality && (
                  <div className="flex items-center gap-2 min-w-0">
                    <User className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                    <span className="text-xs sm:text-sm">{worker.nationality}</span>
                  </div>
                )}
              </div>

              {worker.worker_type && worker.worker_type !== "worker" && (
                <Badge variant="secondary" className="text-xs">
                  {worker.worker_type === "site_representative"
                    ? t("contractors.siteRepresentative", "Site Representative")
                    : worker.worker_type === "safety_officer"
                    ? t("contractors.safetyOfficer", "Safety Officer")
                    : worker.worker_type}
                </Badge>
              )}

              {worker.approved_at && (
                <p className="text-[10px] sm:text-xs text-muted-foreground break-words">
                  {t("contractors.preApprovedAt", "Pre-approved by Contractor Admin/Consultant")}:{" "}
                  {format(new Date(worker.approved_at), "PPp")}
                </p>
              )}

              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                <Button 
                  size="sm"
                  onClick={() => handleApprove(worker)} 
                  disabled={approveWorker.isPending} 
                  className="w-full sm:flex-1 h-10 text-xs sm:text-sm"
                >
                  <CheckCircle className="h-4 w-4 me-1.5 flex-shrink-0" />
                  <span className="hidden sm:inline">{t("contractors.grantSecurityClearance", "Grant Security Clearance")}</span>
                  <span className="sm:hidden">{t("common.approve", "Approve")}</span>
                </Button>
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={() => openRejectDialog(worker)} 
                  disabled={rejectWorker.isPending} 
                  className="w-full sm:flex-1 h-10 text-xs sm:text-sm"
                >
                  <XCircle className="h-4 w-4 me-1.5 flex-shrink-0" />
                  <span className="hidden sm:inline">{t("contractors.returnToPending", "Return with Comments")}</span>
                  <span className="sm:hidden">{t("common.reject", "Reject")}</span>
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
              {t("contractors.returnWorkerDescription", "Please provide comments explaining the security concerns. The contractor will be notified and can address the issues.")}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder={t("contractors.securityCommentsPlaceholder", "Enter security comments/concerns...")}
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>{t("common.cancel", "Cancel")}</Button>
            <Button variant="destructive" onClick={handleReject} disabled={!rejectionReason.trim() || rejectWorker.isPending}>
              {t("contractors.returnToPending", "Return with Comments")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Full Detail Dialog */}
      <WorkerApprovalDetailDialog
        open={!!viewWorker}
        onOpenChange={(open) => !open && setViewWorker(null)}
        worker={viewWorker}
        isSecurityStage
      />
    </div>
  );
}
