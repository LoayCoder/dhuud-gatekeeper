import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useAddToBlacklist } from "@/hooks/use-security-blacklist";
import { ContractorWorker } from "@/hooks/contractor-management/use-contractor-workers";

interface AddWorkerToBlacklistDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workers: ContractorWorker[];
}

export function AddWorkerToBlacklistDialog({
  open,
  onOpenChange,
  workers,
}: AddWorkerToBlacklistDialogProps) {
  const { t } = useTranslation();
  const [reason, setReason] = useState("");
  const addToBlacklist = useAddToBlacklist();

  const handleSubmit = async () => {
    if (!reason.trim() || workers.length === 0) return;
    
    for (const worker of workers) {
      await addToBlacklist.mutateAsync({
        full_name: worker.full_name,
        national_id: worker.national_id,
        reason: reason.trim(),
      });
    }
    
    setReason("");
    onOpenChange(false);
  };

  const workerNames = workers.map(w => w.full_name).join(", ");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {t("contractors.workers.addToBlacklistTitle", "Add to Security Blacklist")}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>{t("contractors.workers.workers", "Workers")}</Label>
            <Input value={workerNames} disabled className="bg-muted" />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="blacklist-reason">{t("common.reason", "Reason")}</Label>
            <Textarea
              id="blacklist-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t("contractors.workers.blacklistReasonPlaceholder", "Enter reason for blacklisting...")}
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
            onClick={handleSubmit}
            disabled={!reason.trim() || addToBlacklist.isPending}
          >
            {t("contractors.workers.addToBlacklist", "Add to Blacklist")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
