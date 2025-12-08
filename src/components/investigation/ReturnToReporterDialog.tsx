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
import { RotateCcw, Loader2 } from "lucide-react";

interface ReturnToReporterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string, instructions: string) => void;
  isLoading?: boolean;
}

export function ReturnToReporterDialog({
  open,
  onOpenChange,
  onConfirm,
  isLoading,
}: ReturnToReporterDialogProps) {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  
  const [reason, setReason] = useState("");
  const [instructions, setInstructions] = useState("");
  
  const handleConfirm = () => {
    if (!reason.trim()) return;
    onConfirm(reason, instructions);
  };
  
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setReason("");
      setInstructions("");
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]" dir={direction}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5 text-amber-600" />
            {t('workflow.return.title', 'Return to Reporter')}
          </DialogTitle>
          <DialogDescription>
            {t('workflow.return.description', 'The reporter will be notified to correct or complete the event report.')}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="return-reason" className="text-destructive">
              {t('workflow.return.reason', 'Reason for Return')} *
            </Label>
            <Textarea
              id="return-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t('workflow.return.reasonPlaceholder', 'Explain why the report needs to be corrected...')}
              rows={3}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="return-instructions">
              {t('workflow.return.instructions', 'Correction Instructions')}
            </Label>
            <Textarea
              id="return-instructions"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder={t('workflow.return.instructionsPlaceholder', 'Provide specific instructions on what needs to be corrected...')}
              rows={3}
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isLoading}
          >
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!reason.trim() || isLoading}
            className="bg-amber-600 hover:bg-amber-700"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin me-2" />
            ) : (
              <RotateCcw className="h-4 w-4 me-2" />
            )}
            {t('workflow.return.confirm', 'Return to Reporter')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
