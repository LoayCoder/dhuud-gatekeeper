import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Building2, Phone, Globe, Calendar, FileText, QrCode, Video } from "lucide-react";
import { format } from "date-fns";
import { ContractorWorker } from "@/hooks/contractor-management/use-contractor-workers";
import { WorkerQRCode } from "./WorkerQRCode";

interface WorkerDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  worker: ContractorWorker | null;
}

export function WorkerDetailDialog({ open, onOpenChange, worker }: WorkerDetailDialogProps) {
  const { t } = useTranslation();
  const [isGeneratingQR, setIsGeneratingQR] = useState(false);
  const [isSendingInduction, setIsSendingInduction] = useState(false);

  if (!worker) return null;

  const statusVariant = {
    pending: "secondary",
    approved: "default",
    rejected: "destructive",
  }[worker.approval_status] as "secondary" | "default" | "destructive";

  const handleGenerateQR = async () => {
    setIsGeneratingQR(true);
    try {
      // TODO: Call generate-worker-qr edge function
      console.log("Generating QR for worker:", worker.id);
    } finally {
      setIsGeneratingQR(false);
    }
  };

  const handleSendInduction = async () => {
    setIsSendingInduction(true);
    try {
      // TODO: Call send-induction-video edge function
      console.log("Sending induction video to worker:", worker.id);
    } finally {
      setIsSendingInduction(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
              <User className="h-6 w-6 text-muted-foreground" />
            </div>
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
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details">{t("contractors.workers.details", "Details")}</TabsTrigger>
            <TabsTrigger value="qr">{t("contractors.workers.qrCode", "QR Code")}</TabsTrigger>
            <TabsTrigger value="induction">{t("contractors.workers.induction", "Induction")}</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="mt-4 space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{t("contractors.workers.personalInfo", "Personal Information")}</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{t("contractors.workers.nationalId", "ID")}:</span>
                  <span className="font-mono">{worker.national_id}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{t("contractors.workers.nationality", "Nationality")}:</span>
                  <span>{worker.nationality || "-"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{t("contractors.workers.mobile", "Mobile")}:</span>
                  <span dir="ltr">{worker.mobile_number}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{t("contractors.workers.company", "Company")}:</span>
                  <span>{worker.company?.company_name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{t("common.createdAt", "Created")}:</span>
                  <span>{format(new Date(worker.created_at), "PPp")}</span>
                </div>
              </CardContent>
            </Card>

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
          </TabsContent>

          <TabsContent value="qr" className="mt-4">
            {worker.approval_status === "approved" ? (
              <WorkerQRCode
                workerId={worker.id}
                workerName={worker.full_name}
                qrData={null} // TODO: Fetch from worker_qr_codes table
                onGenerateQR={handleGenerateQR}
                isGenerating={isGeneratingQR}
              />
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

          <TabsContent value="induction" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">{t("contractors.workers.safetyInduction", "Safety Induction")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  {t("contractors.workers.inductionDescription", "Send safety induction video to worker via WhatsApp based on their preferred language.")}
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{t("contractors.workers.preferredLanguage", "Language")}:</span>
                  <Badge variant="outline">{worker.preferred_language.toUpperCase()}</Badge>
                </div>
                <Button onClick={handleSendInduction} disabled={isSendingInduction}>
                  <Video className={`h-4 w-4 me-2 ${isSendingInduction ? "animate-pulse" : ""}`} />
                  {t("contractors.workers.sendInduction", "Send Induction Video")}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
