import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { MaterialGatePass, useApproveGatePass } from "@/hooks/contractor-management/use-material-gate-passes";
import { GatePassRejectionDialog } from "./GatePassRejectionDialog";

interface GatePassApprovalActionsProps {
  pass: MaterialGatePass;
  onSuccess?: () => void;
}

export function GatePassApprovalActions({ pass, onSuccess }: GatePassApprovalActionsProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [notes, setNotes] = useState("");
  const [isRejecting, setIsRejecting] = useState(false);
  const approvePass = useApproveGatePass();

  // Determine if current user can take action on this pass
  const canTakeAction = (): boolean => {
    if (!user?.id) return false;

    // For internal requests: check if user is the designated approver
    if (pass.is_internal_request && pass.status === "pending_dept_approval") {
      return pass.approval_from_id === user.id;
    }

    // For external requests: check various pending statuses
    // This is a simplified check - the actual authorization should also be validated server-side
    const pendingStatuses = [
      "pending_contractor_approval",
      "pending_dept_ack",          // External: after contractor approval
      "pending_dept_approval",     // Internal: first stage
      "pending_security_approval", // Internal: second stage
      // Legacy statuses (for backward compatibility)
      "pending_pm_approval",
      "pending_safety_approval",
    ];

    return pendingStatuses.includes(pass.status);
  };

  if (!canTakeAction()) {
    return null;
  }

  const handleApprove = () => {
    approvePass.mutate(
      {
        passId: pass.id,
        action: "approve",
        notes: notes.trim() || undefined,
      },
      {
        onSuccess: () => {
          setNotes("");
          onSuccess?.();
        },
      }
    );
  };

  const getActionLabel = (): string => {
    switch (pass.status) {
      case "pending_contractor_approval":
        return t("contractors.gatePasses.approveAsContractor", "Approve as Contractor Consultant");
      case "pending_dept_ack":
        return t("contractors.gatePasses.acknowledgeAsDept", "Acknowledge as Department Representative");
      case "pending_dept_approval":
        return t("contractors.gatePasses.approveAsDept", "Approve as Department Representative");
      case "pending_security_approval":
        return t("contractors.gatePasses.approveAsSecurity", "Approve as Security Supervisor");
      // Legacy statuses
      case "pending_pm_approval":
        return t("contractors.gatePasses.approveAsPM", "Approve as PM");
      case "pending_safety_approval":
        return t("contractors.gatePasses.approveAsSafety", "Approve as Safety");
      default:
        return t("contractors.gatePasses.approve", "Approve");
    }
  };

  return (
    <div className="space-y-4 pt-4 border-t">
      <div className="space-y-2">
        <Label htmlFor="approval-notes">
          {t("contractors.gatePasses.approvalNotes", "Notes (Optional)")}
        </Label>
        <Textarea
          id="approval-notes"
          placeholder={t("contractors.gatePasses.notesPlaceholder", "Add any notes about this approval...")}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="resize-none"
          rows={2}
        />
      </div>

      <div className="flex gap-2 justify-end">
        <Button
          variant="destructive"
          onClick={() => setIsRejecting(true)}
          disabled={approvePass.isPending}
        >
          <XCircle className="h-4 w-4 me-2" />
          {t("contractors.gatePasses.reject", "Reject")}
        </Button>
        <Button
          onClick={handleApprove}
          disabled={approvePass.isPending}
        >
          {approvePass.isPending ? (
            <Loader2 className="h-4 w-4 me-2 animate-spin" />
          ) : (
            <CheckCircle2 className="h-4 w-4 me-2" />
          )}
          {getActionLabel()}
        </Button>
      </div>

      <GatePassRejectionDialog
        pass={isRejecting ? pass : null}
        open={isRejecting}
        onOpenChange={(open) => {
          setIsRejecting(open);
          if (!open) {
            onSuccess?.();
          }
        }}
      />
    </div>
  );
}
