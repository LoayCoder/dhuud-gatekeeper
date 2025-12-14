import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { MaterialGatePass, useRejectGatePass } from "@/hooks/contractor-management/use-material-gate-passes";

interface GatePassRejectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pass: MaterialGatePass | null;
}

export function GatePassRejectionDialog({ open, onOpenChange, pass }: GatePassRejectionDialogProps) {
  const { t } = useTranslation();
  const [reason, setReason] = useState("");
  const rejectPass = useRejectGatePass();

  const handleReject = async () => {
    if (!pass || !reason.trim()) return;
    
    await rejectPass.mutateAsync({ passId: pass.id, reason: reason.trim() });
    setReason("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("contractors.gatePasses.rejectPass", "Reject Gate Pass")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {pass && (
            <div className="text-sm space-y-1">
              <p className="font-mono font-medium">{pass.reference_number}</p>
              <p className="text-muted-foreground">{pass.material_description}</p>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="rejection-reason">
              {t("contractors.gatePasses.rejectionReason", "Rejection Reason")} *
            </Label>
            <Textarea
              id="rejection-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t("contractors.gatePasses.rejectionReasonPlaceholder", "Enter reason for rejection...")}
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
            disabled={!reason.trim() || rejectPass.isPending}
          >
            {t("common.reject", "Reject")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
