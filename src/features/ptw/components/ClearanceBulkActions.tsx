import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { 
  CheckCircle2, 
  XCircle, 
  X, 
  Loader2,
  AlertTriangle
} from "lucide-react";
import { useApproveClearanceCheck, useRejectClearanceCheck } from "@/hooks/ptw";
import { toast } from "sonner";

interface ClearanceBulkActionsProps {
  selectedIds: Set<string>;
  onClearSelection: () => void;
  projectId: string;
}

export function ClearanceBulkActions({ selectedIds, onClearSelection, projectId }: ClearanceBulkActionsProps) {
  const { t } = useTranslation();
  const approveMutation = useApproveClearanceCheck();
  const rejectMutation = useRejectClearanceCheck();
  
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const handleBulkApprove = async () => {
    setIsProcessing(true);
    let successCount = 0;
    let failCount = 0;

    for (const checkId of selectedIds) {
      try {
        await approveMutation.mutateAsync({ checkId });
        successCount++;
      } catch (error) {
        failCount++;
      }
    }

    setIsProcessing(false);
    
    if (successCount > 0) {
      toast.success(t("ptw.clearance.bulkApproveSuccess", "{{count}} items approved", { count: successCount }));
    }
    if (failCount > 0) {
      toast.error(t("ptw.clearance.bulkApproveFailed", "{{count}} items failed to approve", { count: failCount }));
    }
    
    onClearSelection();
  };

  const handleBulkReject = async () => {
    if (!rejectionReason.trim()) return;
    
    setIsProcessing(true);
    let successCount = 0;
    let failCount = 0;

    for (const checkId of selectedIds) {
      try {
        await rejectMutation.mutateAsync({ checkId, comments: rejectionReason.trim() });
        successCount++;
      } catch (error) {
        failCount++;
      }
    }

    setIsProcessing(false);
    setShowRejectForm(false);
    setRejectionReason("");
    
    if (successCount > 0) {
      toast.success(t("ptw.clearance.bulkRejectSuccess", "{{count}} items rejected", { count: successCount }));
    }
    if (failCount > 0) {
      toast.error(t("ptw.clearance.bulkRejectFailed", "{{count}} items failed to reject", { count: failCount }));
    }
    
    onClearSelection();
  };

  return (
    <Card className="border-primary bg-primary/5">
      <CardContent className="py-4">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">
              {t("ptw.clearance.selectedCount", "{{count}} items selected", { count: selectedIds.size })}
            </p>
            <Button variant="ghost" size="sm" onClick={onClearSelection}>
              <X className="me-1 h-4 w-4" />
              {t("common.clearSelection", "Clear Selection")}
            </Button>
          </div>

          {showRejectForm ? (
            <div className="space-y-3 p-3 bg-destructive/5 border border-destructive/20 rounded-lg">
              <div className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm font-medium">
                  {t("ptw.clearance.bulkRejectTitle", "Reject {{count}} items", { count: selectedIds.size })}
                </span>
              </div>
              <Textarea
                placeholder={t("ptw.clearance.rejectReasonPlaceholder", "Enter reason for rejection...")}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={2}
                maxLength={500}
              />
              <div className="flex gap-2 justify-end">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    setShowRejectForm(false);
                    setRejectionReason("");
                  }}
                  disabled={isProcessing}
                >
                  {t("common.cancel", "Cancel")}
                </Button>
                <Button 
                  variant="destructive" 
                  size="sm" 
                  onClick={handleBulkReject}
                  disabled={!rejectionReason.trim() || isProcessing}
                >
                  {isProcessing && <Loader2 className="me-2 h-3 w-3 animate-spin" />}
                  {t("ptw.clearance.confirmReject", "Confirm Rejection")}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleBulkApprove}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <Loader2 className="me-2 h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="me-2 h-4 w-4" />
                )}
                {t("ptw.clearance.approveAll", "Approve All")}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowRejectForm(true)}
                disabled={isProcessing}
              >
                <XCircle className="me-2 h-4 w-4" />
                {t("ptw.clearance.rejectAll", "Reject All")}
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
