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
import { FileX, Loader2 } from "lucide-react";

interface NoInvestigationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (justification: string) => void;
  isLoading?: boolean;
}

export function NoInvestigationDialog({
  open,
  onOpenChange,
  onConfirm,
  isLoading,
}: NoInvestigationDialogProps) {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  
  const [justification, setJustification] = useState("");
  
  const handleConfirm = () => {
    if (!justification.trim()) return;
    onConfirm(justification);
  };
  
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setJustification("");
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]" dir={direction}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileX className="h-5 w-5 text-muted-foreground" />
            {t('workflow.noInvestigation.title', 'Close Without Investigation')}
          </DialogTitle>
          <DialogDescription>
            {t('workflow.noInvestigation.description', 'This event will be closed without a formal investigation. Please provide justification.')}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="justification" className="text-destructive">
              {t('workflow.noInvestigation.justification', 'Justification')} *
            </Label>
            <Textarea
              id="justification"
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              placeholder={t('workflow.noInvestigation.justificationPlaceholder', 'Explain why no investigation is required for this event...')}
              rows={4}
              required
            />
            <p className="text-sm text-muted-foreground">
              {t('workflow.noInvestigation.examples', 'Examples: Minor observation already addressed, duplicate report, false alarm confirmed, etc.')}
            </p>
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
            disabled={!justification.trim() || isLoading}
            variant="secondary"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin me-2" />
            ) : (
              <FileX className="h-4 w-4 me-2" />
            )}
            {t('workflow.noInvestigation.confirm', 'Close Without Investigation')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
