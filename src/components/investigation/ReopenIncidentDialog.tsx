import { useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertTriangle, RotateCcw } from "lucide-react";
import { useReopenIncident } from "@/hooks/use-incident-closure";

interface ReopenIncidentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  incidentId: string;
  incidentTitle?: string;
  onSuccess?: () => void;
}

export function ReopenIncidentDialog({
  open,
  onOpenChange,
  incidentId,
  incidentTitle,
  onSuccess,
}: ReopenIncidentDialogProps) {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  const [reason, setReason] = useState("");
  const reopenMutation = useReopenIncident();

  const handleReopen = async () => {
    if (!reason.trim()) return;

    await reopenMutation.mutateAsync({
      incidentId,
      reason: reason.trim(),
    });

    setReason("");
    onOpenChange(false);
    onSuccess?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir={direction} className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5 text-warning" />
            {t('investigation.reopen.title', 'Reopen Closed Incident')}
          </DialogTitle>
          <DialogDescription>
            {incidentTitle && (
              <span className="font-medium text-foreground">{incidentTitle}</span>
            )}
          </DialogDescription>
        </DialogHeader>

        <Alert variant="default" className="border-warning bg-warning/10">
          <AlertTriangle className="h-4 w-4 text-warning" />
          <AlertDescription>
            {t('investigation.reopen.warning', 'Reopening this incident will unlock all investigation data for editing. This action will be logged in the audit trail.')}
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <Label htmlFor="reopen-reason">
            {t('investigation.reopen.reasonLabel', 'Reason for Reopening')} *
          </Label>
          <Textarea
            id="reopen-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t('investigation.reopen.reasonPlaceholder', 'Explain why this incident needs to be reopened...')}
            rows={3}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button
            onClick={handleReopen}
            disabled={!reason.trim() || reopenMutation.isPending}
            variant="default"
          >
            {reopenMutation.isPending ? (
              <Loader2 className="h-4 w-4 me-2 animate-spin" />
            ) : (
              <RotateCcw className="h-4 w-4 me-2" />
            )}
            {t('investigation.reopen.button', 'Reopen Investigation')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
