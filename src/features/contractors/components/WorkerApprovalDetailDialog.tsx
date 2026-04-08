import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Check, X, User, BookOpen, Video,
} from "lucide-react";
import { ContractorWorker, useApproveWorker } from "@/features/contractors/hooks/use-contractor-workers";
import { ContractorDocumentUpload } from "./ContractorDocumentUpload";
import { WorkerRejectionDialog } from "./WorkerRejectionDialog";
import { WorkerOverviewTab } from "./shared/WorkerOverviewTab";
import { WorkerProjectCard } from "./shared/WorkerProjectCard";
import { WorkerInfoRow } from "./shared/WorkerInfoRow";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Phone, Globe } from "lucide-react";
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

  useEffect(() => {
    const fetchPhoto = async () => {
      if (!worker?.photo_path) { setPhotoUrl(null); return; }
      const { data } = await supabase.storage.from("worker-photos").createSignedUrl(worker.photo_path, 3600);
      setPhotoUrl(data?.signedUrl || null);
    };
    fetchPhoto();
  }, [worker?.photo_path]);

  if (!worker) return null;

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

                <TabsContent value="overview" className="mt-4">
                  <WorkerOverviewTab worker={worker} photoUrl={photoUrl} />
                </TabsContent>

                <TabsContent value="documents" className="mt-4">
                  <ContractorDocumentUpload workerId={worker.id} canManage={false} />
                </TabsContent>

                <TabsContent value="induction" className="mt-4 space-y-4">
                  <WorkerProjectCard workerId={worker.id} />

                  <Card>
                    <CardHeader className="py-3 px-4">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Video className="h-4 w-4" />
                        {t("contractors.induction.inductionStatus", "Induction Status")}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-4 text-sm space-y-2">
                      <div className="grid grid-cols-2 gap-3">
                        <WorkerInfoRow icon={Phone} label={t("contractors.workers.mobile", "Mobile")} value={worker.mobile_number} dir="ltr" />
                        <WorkerInfoRow icon={Globe} label={t("contractors.workers.language", "Language")}
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
