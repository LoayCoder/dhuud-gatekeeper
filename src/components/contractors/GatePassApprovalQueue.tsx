import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Check, X, Truck, Clock, User, Eye, Package, ImageIcon } from "lucide-react";
import { MaterialGatePass, useApproveGatePass } from "@/hooks/contractor-management/use-material-gate-passes";
import { GatePassRejectionDialog } from "./GatePassRejectionDialog";
import { GatePassDetailDialog } from "./GatePassDetailDialog";
import { GatePassBulkActionsToolbar } from "./GatePassBulkActionsToolbar";
import { GatePassBulkApprovalDialog } from "./GatePassBulkApprovalDialog";
import { GatePassBulkRejectionDialog } from "./GatePassBulkRejectionDialog";
import { GatePassApprovalCard } from "./GatePassApprovalCard";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface GatePassApprovalQueueProps {
  passes: MaterialGatePass[];
}

export function GatePassApprovalQueue({ passes }: GatePassApprovalQueueProps) {
  const { t } = useTranslation();
  const approvePass = useApproveGatePass();
  const [approvalNotes, setApprovalNotes] = useState<Record<string, string>>({});
  const [rejectingPass, setRejectingPass] = useState<MaterialGatePass | null>(null);
  const [viewingPass, setViewingPass] = useState<MaterialGatePass | null>(null);

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkApproveDialog, setShowBulkApproveDialog] = useState(false);
  const [showBulkRejectDialog, setShowBulkRejectDialog] = useState(false);

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === passes.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(passes.map((p) => p.id)));
    }
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const selectedPasses = passes.filter((p) => selectedIds.has(p.id));

  if (passes.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Truck className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p className="font-medium">
          {t("contractors.gatePasses.noPendingApprovals", "No pending approvals")}
        </p>
        <p className="text-sm mt-1">
          {t("contractors.gatePasses.noPendingForRole", "There are no gate passes waiting for your approval at this time")}
        </p>
      </div>
    );
  }

  const handleApprove = (pass: MaterialGatePass) => {
    approvePass.mutate({
      passId: pass.id,
      action: "approve",
      notes: approvalNotes[pass.id],
    });
  };

  const getApprovalStage = (status: string) => {
    switch (status) {
      case "pending_contractor_approval":
        return { label: t("contractors.gatePasses.awaitingContractor", "Awaiting Contractor Approval"), step: 1, role: "contractor_consultant" };
      case "pending_dept_ack":
        return { label: t("contractors.gatePasses.awaitingDeptAck", "Awaiting Dept Acknowledgment"), step: 2, role: "department_representative" };
      case "pending_dept_approval":
        return { label: t("contractors.gatePasses.awaitingDeptApproval", "Awaiting Dept Approval"), step: 1, role: "department_representative" };
      case "pending_club_mgmt_ack":
        return { label: t("contractors.gatePasses.awaitingClubMgmtAck", "Awaiting Golf Club Management"), step: 2, role: "golf_club_management_department_representative" };
      case "pending_security_approval":
        return { label: t("contractors.gatePasses.awaitingSecurity", "Awaiting Security Approval"), step: 3, role: "security_supervisor" };
      // Legacy statuses for backward compatibility
      case "pending_pm_approval":
        return { label: t("contractors.gatePasses.awaitingPm", "Awaiting PM Approval"), step: 1, role: "pm" };
      case "pending_safety_approval":
        return { label: t("contractors.gatePasses.awaitingSafety", "Awaiting Safety Approval"), step: 2, role: "safety" };
      default:
        return { label: status, step: 0, role: "unknown" };
    }
  };

  return (
    <>
      {/* Select All Header */}
      {passes.length > 1 && (
        <div className="flex items-center gap-3 mb-4 p-2 bg-muted/30 rounded-lg">
          <Checkbox
            id="select-all"
            checked={selectedIds.size === passes.length && passes.length > 0}
            onCheckedChange={toggleSelectAll}
          />
          <label htmlFor="select-all" className="text-sm font-medium cursor-pointer">
            {t("contractors.gatePasses.bulk.selectAll", "Select All")} ({passes.length})
          </label>
        </div>
      )}

      {/* Bulk Actions Toolbar */}
      <GatePassBulkActionsToolbar
        selectedCount={selectedIds.size}
        onApprove={() => setShowBulkApproveDialog(true)}
        onReject={() => setShowBulkRejectDialog(true)}
        onClear={clearSelection}
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {passes.map((pass) => {
          const isSelected = selectedIds.has(pass.id);
          return (
            <GatePassApprovalCard
              key={pass.id}
              pass={pass}
              isSelected={isSelected}
              onToggleSelection={toggleSelection}
              onViewDetails={() => setViewingPass(pass)}
              onReject={() => setRejectingPass(pass)}
              getApprovalStage={getApprovalStage}
            />
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

      {/* Bulk Approval Dialog */}
      <GatePassBulkApprovalDialog
        open={showBulkApproveDialog}
        onOpenChange={setShowBulkApproveDialog}
        passes={selectedPasses}
        onSuccess={clearSelection}
      />

      {/* Bulk Rejection Dialog */}
      <GatePassBulkRejectionDialog
        open={showBulkRejectDialog}
        onOpenChange={setShowBulkRejectDialog}
        passes={selectedPasses}
        onSuccess={clearSelection}
      />
    </>
  );
}
