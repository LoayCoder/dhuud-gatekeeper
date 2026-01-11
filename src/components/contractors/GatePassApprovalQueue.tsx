import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Check, X, Truck, Clock, User, Eye } from "lucide-react";
import { MaterialGatePass, useApproveGatePass } from "@/hooks/contractor-management/use-material-gate-passes";
import { GatePassRejectionDialog } from "./GatePassRejectionDialog";
import { GatePassDetailDialog } from "./GatePassDetailDialog";
import { format } from "date-fns";

interface GatePassApprovalQueueProps {
  passes: MaterialGatePass[];
}

export function GatePassApprovalQueue({ passes }: GatePassApprovalQueueProps) {
  const { t } = useTranslation();
  const approvePass = useApproveGatePass();
  const [approvalNotes, setApprovalNotes] = useState<Record<string, string>>({});
  const [rejectingPass, setRejectingPass] = useState<MaterialGatePass | null>(null);
  const [viewingPass, setViewingPass] = useState<MaterialGatePass | null>(null);

  if (passes.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        {t("contractors.gatePasses.noPendingApprovals", "No pending approvals")}
      </div>
    );
  }

  const handleApprove = (pass: MaterialGatePass) => {
    const approvalType = pass.status === "pending_pm_approval" ? "pm" : "safety";
    approvePass.mutate({
      passId: pass.id,
      approvalType,
      notes: approvalNotes[pass.id],
    });
  };

  const getApprovalStage = (status: string) => {
    if (status === "pending_pm_approval") {
      return { label: t("contractors.gatePasses.awaitingPm", "Awaiting PM Approval"), step: 1 };
    }
    return { label: t("contractors.gatePasses.awaitingSafety", "Awaiting Safety Approval"), step: 2 };
  };

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {passes.map((pass) => {
          const stage = getApprovalStage(pass.status);
          return (
            <Card key={pass.id} className="overflow-hidden">
              <div className="bg-muted/50 px-4 py-2 border-b flex items-center justify-between">
                <span className="font-mono text-sm font-medium">{pass.reference_number}</span>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{stage.label}</Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setViewingPass(pass)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <CardContent className="pt-4 space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">
                    {pass.is_internal_request 
                      ? t("contractors.gatePasses.internalRequest", "Internal Request")
                      : pass.project?.project_name}
                  </p>
                  <p className="text-sm font-medium mt-1">{pass.material_description}</p>
                </div>

                {/* Requester and Designated Approver Info */}
                <div className="space-y-1 text-sm">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <User className="h-3.5 w-3.5" />
                    <span>{t("contractors.gatePasses.requestedBy", "Requested by")}:</span>
                    <span className="font-medium text-foreground">{pass.requester?.full_name || "-"}</span>
                  </div>
                  {pass.is_internal_request && pass.approval_from && (
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Check className="h-3.5 w-3.5" />
                      <span>{t("contractors.gatePasses.designatedApprover", "Designated approver")}:</span>
                      <span className="font-medium text-foreground">{pass.approval_from.full_name}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Truck className="h-4 w-4" />
                    {pass.vehicle_plate || "-"}
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {format(new Date(pass.pass_date), "dd/MM")}
                    {pass.time_window_start && ` ${pass.time_window_start}`}
                  </div>
                </div>

                <div className="space-y-2">
                  <Textarea
                    placeholder={t("contractors.gatePasses.approvalNotes", "Approval notes (optional)...")}
                    value={approvalNotes[pass.id] || ""}
                    onChange={(e) => setApprovalNotes({ ...approvalNotes, [pass.id]: e.target.value })}
                    className="text-sm"
                    rows={2}
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={() => handleApprove(pass)}
                    disabled={approvePass.isPending}
                  >
                    <Check className="h-4 w-4 me-1" />
                    {t("common.approve", "Approve")}
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="flex-1"
                    onClick={() => setRejectingPass(pass)}
                  >
                    <X className="h-4 w-4 me-1" />
                    {t("common.reject", "Reject")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <GatePassRejectionDialog
        open={!!rejectingPass}
        onOpenChange={(open) => !open && setRejectingPass(null)}
        pass={rejectingPass}
      />

      <GatePassDetailDialog
        pass={viewingPass}
        open={!!viewingPass}
        onOpenChange={(open) => !open && setViewingPass(null)}
      />
    </>
  );
}
