import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useRejectWorker, ContractorWorker } from "@/hooks/contractor-management/use-contractor-workers";

interface WorkerRejectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  worker: ContractorWorker | null;
}

export function WorkerRejectionDialog({ open, onOpenChange, worker }: WorkerRejectionDialogProps) {
  const { t } = useTranslation();
  const [reason, setReason] = useState("");
  const rejectWorker = useRejectWorker();

  const handleReject = async () => {
    if (!worker || !reason.trim()) return;
    
    await rejectWorker.mutateAsync({ workerId: worker.id, reason: reason.trim() });
    setReason("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("contractors.workers.rejectWorker", "Reject Worker")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {worker && (
            <div className="text-sm">
              <p className="font-medium">{worker.full_name}</p>
              <p className="text-muted-foreground">{worker.company?.company_name}</p>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="rejection-reason">
              {t("contractors.workers.rejectionReason", "Rejection Reason")} *
            </Label>
            <Textarea
              id="rejection-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t("contractors.workers.rejectionReasonPlaceholder", "Enter reason for rejection...")}
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel", "Cancel")}
          </Button>
          <Button
            variant="destructive"
            onClick={handleReject}
            disabled={!reason.trim() || rejectWorker.isPending}
          >
            {t("common.reject", "Reject")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
