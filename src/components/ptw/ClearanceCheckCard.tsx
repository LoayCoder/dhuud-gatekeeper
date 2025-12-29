import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Loader2,
  Upload,
  FileText,
  AlertTriangle
} from "lucide-react";
import { useApproveClearanceCheck, useRejectClearanceCheck, PTWClearanceCheck } from "@/hooks/ptw";
import { toast } from "sonner";
import { format } from "date-fns";
import { ClearanceDocumentUpload } from "./ClearanceDocumentUpload";

interface ClearanceCheckCardProps {
  check: PTWClearanceCheck;
  isSelected: boolean;
  onToggleSelect: () => void;
  isRTL: boolean;
}

export function ClearanceCheckCard({ check, isSelected, onToggleSelect, isRTL }: ClearanceCheckCardProps) {
  const { t } = useTranslation();
  const approveMutation = useApproveClearanceCheck();
  const rejectMutation = useRejectClearanceCheck();
  
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showUpload, setShowUpload] = useState(false);

  const handleApprove = async () => {
    try {
      await approveMutation.mutateAsync({ checkId: check.id });
      toast.success(t("ptw.clearance.approved", "Clearance approved"));
    } catch (error) {
      toast.error(t("ptw.clearance.approveError", "Failed to approve clearance"));
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) return;
    
    try {
      await rejectMutation.mutateAsync({ 
        checkId: check.id, 
        comments: rejectionReason.trim() 
      });
      toast.success(t("ptw.clearance.rejected", "Clearance rejected"));
      setShowRejectForm(false);
      setRejectionReason("");
    } catch (error) {
      toast.error(t("ptw.clearance.rejectError", "Failed to reject clearance"));
    }
  };

  return (
    <Card className={`transition-colors ${
      check.status === "rejected" 
        ? "border-destructive/50 bg-destructive/5" 
        : isSelected 
          ? "border-primary bg-primary/5"
          : ""
    }`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Selection Checkbox (only for pending) */}
          {check.status === "pending" && (
            <Checkbox 
              checked={isSelected}
              onCheckedChange={onToggleSelect}
              className="mt-1"
            />
          )}

          {/* Status Icon */}
          <div className="mt-0.5 shrink-0">
            {check.status === "approved" && (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            )}
            {check.status === "rejected" && (
              <XCircle className="h-5 w-5 text-destructive" />
            )}
            {check.status === "pending" && (
              <Clock className="h-5 w-5 text-amber-500" />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium">
                  {isRTL && check.requirement_name_ar 
                    ? check.requirement_name_ar 
                    : check.requirement_name}
                </p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {check.is_mandatory && (
                    <Badge variant="destructive" className="text-xs">
                      {t("ptw.clearance.mandatory", "Mandatory")}
                    </Badge>
                  )}
                  <Badge variant={
                    check.status === "approved" ? "default" :
                    check.status === "rejected" ? "destructive" :
                    "secondary"
                  }>
                    {t(`ptw.clearance.status.${check.status}`, check.status)}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Approver Info */}
            {check.status !== "pending" && check.approver && (
              <p className="text-sm text-muted-foreground mt-2">
                {check.status === "approved" 
                  ? t("ptw.clearance.approvedBy", "Approved by")
                  : t("ptw.clearance.rejectedBy", "Rejected by")
                }: {check.approver.full_name}
                {check.approved_at && ` • ${format(new Date(check.approved_at), "MMM d, yyyy 'at' h:mm a")}`}
              </p>
            )}

            {/* Comments / Rejection Reason */}
            {check.comments && (
              <div className={`text-sm mt-2 p-2 rounded ${
                check.status === "rejected" 
                  ? "bg-destructive/10 text-destructive" 
                  : "bg-muted text-muted-foreground"
              }`}>
                <span className="font-medium">
                  {check.status === "rejected" 
                    ? t("ptw.clearance.rejectionReason", "Reason")
                    : t("ptw.clearance.notes", "Notes")
                  }:
                </span>{" "}
                {check.comments}
              </div>
            )}

            {/* Reject Form */}
            {showRejectForm && (
              <div className="mt-3 space-y-3 p-3 bg-destructive/5 border border-destructive/20 rounded-lg">
                <div className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    {t("ptw.clearance.rejectTitle", "Reject Clearance")}
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
                  >
                    {t("common.cancel", "Cancel")}
                  </Button>
                  <Button 
                    variant="destructive" 
                    size="sm" 
                    onClick={handleReject}
                    disabled={!rejectionReason.trim() || rejectMutation.isPending}
                  >
                    {rejectMutation.isPending && <Loader2 className="me-2 h-3 w-3 animate-spin" />}
                    {t("ptw.clearance.confirmReject", "Confirm Rejection")}
                  </Button>
                </div>
              </div>
            )}

            {/* Document Upload Section */}
            {showUpload && (
              <ClearanceDocumentUpload 
                checkId={check.id}
                projectId={check.project_id}
                onClose={() => setShowUpload(false)}
              />
            )}

            {/* Actions for pending items */}
            {check.status === "pending" && !showRejectForm && (
              <div className="flex flex-wrap gap-2 mt-3">
                <Button
                  size="sm"
                  onClick={handleApprove}
                  disabled={approveMutation.isPending}
                >
                  {approveMutation.isPending && (
                    <Loader2 className="me-2 h-3 w-3 animate-spin" />
                  )}
                  <CheckCircle2 className="me-1 h-3 w-3" />
                  {t("ptw.clearance.approve", "Approve")}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowRejectForm(true)}
                >
                  <XCircle className="me-1 h-3 w-3" />
                  {t("ptw.clearance.reject", "Reject")}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowUpload(!showUpload)}
                >
                  <Upload className="me-1 h-3 w-3" />
                  {t("ptw.clearance.uploadDocument", "Upload Document")}
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
