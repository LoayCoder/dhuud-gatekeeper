import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

interface BulkRejectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCount: number;
  onConfirm: (reason: string, addToBlacklist: boolean) => void;
  isPending?: boolean;
}

export function BulkRejectDialog({
  open,
  onOpenChange,
  selectedCount,
  onConfirm,
  isPending,
}: BulkRejectDialogProps) {
  const { t } = useTranslation();
  const [reason, setReason] = useState("");
  const [addToBlacklist, setAddToBlacklist] = useState(false);

  const handleSubmit = () => {
    if (!reason.trim()) return;
    onConfirm(reason.trim(), addToBlacklist);
    setReason("");
    setAddToBlacklist(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {t("contractors.workers.bulkRejectTitle", "Reject {{count}} Workers", { count: selectedCount })}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="reason">{t("contractors.workers.rejectionReason", "Rejection Reason")}</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t("contractors.workers.rejectionReasonPlaceholder", "Enter reason for rejection...")}
              rows={3}
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Checkbox
              id="blacklist"
              checked={addToBlacklist}
              onCheckedChange={(checked) => setAddToBlacklist(checked === true)}
            />
            <Label htmlFor="blacklist" className="text-sm cursor-pointer">
              {t("contractors.workers.alsoAddToBlacklist", "Also add to security blacklist")}
            </Label>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel", "Cancel")}
          </Button>
          <Button
            variant="destructive"
            onClick={handleSubmit}
            disabled={!reason.trim() || isPending}
          >
            {t("common.reject", "Reject")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
