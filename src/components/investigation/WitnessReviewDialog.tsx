import { useState } from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle, RotateCcw, Loader2, User, Phone, MessageSquare, Clock } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { WitnessStatement } from "@/hooks/use-witness-statements";

interface WitnessReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  statement: WitnessStatement | null;
  onApprove: (statementId: string) => Promise<void>;
  onReturn: (statementId: string, returnReason: string) => Promise<void>;
  isProcessing?: boolean;
}

export function WitnessReviewDialog({
  open,
  onOpenChange,
  statement,
  onApprove,
  onReturn,
  isProcessing = false,
}: WitnessReviewDialogProps) {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  const [returnReason, setReturnReason] = useState("");
  const [isReturning, setIsReturning] = useState(false);

  const handleApprove = async () => {
    if (!statement) return;
    await onApprove(statement.id);
    onOpenChange(false);
  };

  const handleReturn = async () => {
    if (!statement || !returnReason.trim()) return;
    await onReturn(statement.id, returnReason);
    setReturnReason("");
    setIsReturning(false);
    onOpenChange(false);
  };

  const handleClose = () => {
    setReturnReason("");
    setIsReturning(false);
    onOpenChange(false);
  };

  if (!statement) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh]" dir={direction}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-primary" />
            {t("investigation.witnesses.reviewStatement", "Review Witness Statement")}
          </DialogTitle>
          <DialogDescription>
            {t("investigation.witnesses.reviewDescription", "Review and approve or return this witness statement for corrections.")}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[50vh] pe-4">
          <div className="space-y-4">
            {/* Witness Info */}
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{statement.name}</span>
              </div>
              {statement.contact && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-3 w-3" />
                  <span>{statement.contact}</span>
                </div>
              )}
              {statement.relationship && (
                <Badge variant="outline">{statement.relationship}</Badge>
              )}
            </div>

            <Separator />

            {/* Statement Content */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                {t("investigation.witnesses.statement", "Statement")}
              </Label>
              <div className="rounded-md border bg-muted/50 p-4">
                <p className="whitespace-pre-wrap text-sm">{statement.statement}</p>
              </div>
            </div>

            {/* Submission Info */}
            {statement.created_at && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {t("investigation.witnesses.submittedAt", "Submitted")}: {format(new Date(statement.created_at), "PPp")}
              </div>
            )}

            {/* Return Form */}
            {isReturning && (
              <div className="space-y-3 rounded-md border border-destructive/30 bg-destructive/5 p-4">
                <Label htmlFor="returnReason" className="text-destructive">
                  {t("investigation.witnesses.returnReason", "Reason for Return")} *
                </Label>
                <Textarea
                  id="returnReason"
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  placeholder={t("investigation.witnesses.returnReasonPlaceholder", "Explain what needs to be corrected...")}
                  rows={3}
                />
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {isReturning ? (
            <>
              <Button
                variant="outline"
                onClick={() => setIsReturning(false)}
                disabled={isProcessing}
              >
                {t("common.cancel", "Cancel")}
              </Button>
              <Button
                variant="destructive"
                onClick={handleReturn}
                disabled={isProcessing || !returnReason.trim()}
              >
                {isProcessing && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
                <RotateCcw className="h-4 w-4 me-2" />
                {t("investigation.witnesses.confirmReturn", "Confirm Return")}
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => setIsReturning(true)}
                disabled={isProcessing}
              >
                <RotateCcw className="h-4 w-4 me-2" />
                {t("investigation.witnesses.returnForCorrection", "Return for Correction")}
              </Button>
              <Button onClick={handleApprove} disabled={isProcessing}>
                {isProcessing && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
                <CheckCircle className="h-4 w-4 me-2" />
                {t("investigation.witnesses.approveStatement", "Approve Statement")}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
