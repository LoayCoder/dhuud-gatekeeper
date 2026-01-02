import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { ContractorWorker } from "@/hooks/contractor-management/use-contractor-workers";

interface ChangeWorkerStatusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  worker: ContractorWorker | null;
  initialStatus?: string;
  onConfirm: (status: string, reason?: string) => void;
  isPending: boolean;
}

const STATUS_OPTIONS = [
  { value: "pending", variant: "secondary" as const },
  { value: "approved", variant: "default" as const },
  { value: "rejected", variant: "destructive" as const },
  { value: "suspended", variant: "outline" as const },
  { value: "revoked", variant: "destructive" as const },
];

export function ChangeWorkerStatusDialog({
  open,
  onOpenChange,
  worker,
  initialStatus,
  onConfirm,
  isPending,
}: ChangeWorkerStatusDialogProps) {
  const { t } = useTranslation();
  const [selectedStatus, setSelectedStatus] = useState(initialStatus || "");
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (initialStatus) {
      setSelectedStatus(initialStatus);
    }
    setReason("");
  }, [initialStatus, open]);

  if (!worker) return null;

  const requiresReason = ["rejected", "suspended", "revoked"].includes(selectedStatus);

  const handleSubmit = () => {
    onConfirm(selectedStatus, requiresReason ? reason : undefined);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {t("contractors.workers.changeStatus", "Change Status")}
          </DialogTitle>
          <DialogDescription>
            {t(
              "contractors.workers.changeStatusDescription",
              "Update the approval status for {{name}}",
              { name: worker.full_name }
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-3">
            <Label>{t("contractors.workers.newStatus", "New Status")}</Label>
            <RadioGroup
              value={selectedStatus}
              onValueChange={setSelectedStatus}
              className="grid grid-cols-2 gap-2"
            >
              {STATUS_OPTIONS.map((option) => (
                <div key={option.value} className="flex items-center space-x-2">
                  <RadioGroupItem
                    value={option.value}
                    id={option.value}
                    disabled={worker.approval_status === option.value}
                  />
                  <Label
                    htmlFor={option.value}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <Badge variant={option.variant} className="capitalize">
                      {t(`contractors.workerStatus.${option.value}`, option.value)}
                    </Badge>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {requiresReason && (
            <div className="space-y-2">
              <Label htmlFor="reason">
                {t("contractors.workers.reason", "Reason")} *
              </Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={t(
                  "contractors.workers.reasonPlaceholder",
                  "Enter reason for status change..."
                )}
                rows={3}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            {t("common.cancel", "Cancel")}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              isPending ||
              !selectedStatus ||
              selectedStatus === worker.approval_status ||
              (requiresReason && !reason.trim())
            }
          >
            {isPending
              ? t("common.updating", "Updating...")
              : t("common.confirm", "Confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
