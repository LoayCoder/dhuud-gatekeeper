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
import { XCircle, Loader2, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface RejectReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string) => void;
  isLoading?: boolean;
}

export function RejectReportDialog({
  open,
  onOpenChange,
  onConfirm,
  isLoading,
}: RejectReportDialogProps) {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  
  const [reason, setReason] = useState("");
  
  const handleConfirm = () => {
    if (!reason.trim()) return;
    onConfirm(reason);
  };
  
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setReason("");
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]" dir={direction}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <XCircle className="h-5 w-5" />
            {t('workflow.reject.title', 'Reject Event Report')}
          </DialogTitle>
          <DialogDescription>
            {t('workflow.reject.description', 'The reporter will be asked to confirm the rejection or may dispute it.')}
          </DialogDescription>
        </DialogHeader>
        
        <Alert variant="destructive" className="my-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {t('workflow.reject.warning', 'This action will mark the event report as not meeting HSSE reporting criteria. The reporter can dispute this decision.')}
          </AlertDescription>
        </Alert>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="rejection-reason" className="text-destructive">
              {t('workflow.reject.reason', 'Rejection Reason')} *
            </Label>
            <Textarea
              id="rejection-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t('workflow.reject.reasonPlaceholder', 'Explain why this report does not meet HSSE criteria...')}
              rows={4}
              required
            />
          </div>
        </div>
        
        <DialogFooter className="mt-4">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isLoading}
          >
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!reason.trim() || isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin me-2" />
            ) : (
              <XCircle className="h-4 w-4 me-2" />
            )}
            {t('workflow.reject.confirm', 'Reject Report')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
