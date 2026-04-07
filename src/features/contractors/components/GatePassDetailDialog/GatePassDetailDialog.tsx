import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { ar, enUS } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  LogIn,
  LogOut,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGatePassDetails,
  useGatePassItems,
  useGatePassPhotos,
} from "@/features/contractors/hooks/use-gate-pass-details";
import { GatePassPDFExportButton } from "../GatePassPDFExportButton";
import { GatePassApprovalActions } from "../GatePassApprovalActions";
import { GatePassDetailDialogProps, TimelineEvent } from "./types";
import { DetailsTab } from "./tabs/DetailsTab";
import { ItemsPhotosTab } from "./tabs/ItemsPhotosTab";
import { TimelineTab } from "./tabs/TimelineTab";

function buildTimelineEvents(passDetails: any, t: any): TimelineEvent[] {
  if (!passDetails) return [];
  const events: TimelineEvent[] = [];

  // Created
  if (passDetails.created_at) {
    events.push({
      type: "created",
      label: t("gatePass.timeline.created", "Request Created"),
      timestamp: passDetails.created_at,
      actor: passDetails.requester || null,
      notes: null,
      icon: FileText,
      color: "bg-blue-100 text-blue-800",
    });
  }

  // Contractor Approved
  if (passDetails.contractor_approved_at) {
    events.push({
      type: "contractor_approved",
      label: t("gatePass.timeline.contractorApproved", "Contractor Approved"),
      timestamp: passDetails.contractor_approved_at,
      actor: passDetails.contractor_approver || null,
      notes: passDetails.contractor_approval_notes,
      icon: UserCheck,
      color: "bg-green-100 text-green-800",
    });
  }

  // Dept Manager Approved
  if (passDetails.pm_approved_at) {
    events.push({
      type: "dept_approved",
      label: t("gatePass.timeline.deptApproved", "Dept Manager Approved"),
      timestamp: passDetails.pm_approved_at,
      actor: passDetails.pm_approver || null,
      notes: passDetails.pm_notes,
      icon: UserCheck,
      color: "bg-green-100 text-green-800",
    });
  }

  // Club Mgmt Ack (legacy)
  if (passDetails.club_mgmt_ack_at) {
    events.push({
      type: "mgmt_acknowledged",
      label: t("gatePass.timeline.mgmtAck", "Management Acknowledged"),
      timestamp: passDetails.club_mgmt_ack_at,
      actor: passDetails.club_mgmt_acker || null,
      notes: passDetails.club_mgmt_ack_notes,
      icon: CheckCircle2,
      color: "bg-green-100 text-green-800",
    });
  }

  // Security Approved
  if (passDetails.security_approved_at) {
    events.push({
      type: "security_approved",
      label: t("gatePass.timeline.securityApproved", "Security Approved"),
      timestamp: passDetails.security_approved_at,
      actor: passDetails.security_approver || null,
      notes: passDetails.security_approval_notes,
      icon: ShieldCheck,
      color: "bg-green-100 text-green-800",
    });
  }

  // Rejected
  if (passDetails.rejected_at) {
    events.push({
      type: "rejected",
      label: t("gatePass.timeline.rejected", "Rejected"),
      timestamp: passDetails.rejected_at,
      actor: passDetails.rejector || null,
      notes: passDetails.rejection_reason,
      icon: XCircle,
      color: "bg-red-100 text-red-800",
    });
  }

  // Guard Verified
  if (passDetails.guard_verified_at) {
    events.push({
      type: "guard_verified",
      label: t("gatePass.timeline.guardVerified", "Guard Verified"),
      timestamp: passDetails.guard_verified_at,
      actor: passDetails.guard || null,
      notes: null,
      icon: ShieldCheck,
      color: "bg-purple-100 text-purple-800",
    });
  }

  // Entry
  if (passDetails.entry_time) {
    events.push({
      type: "entry",
      label: t("gatePass.timeline.entry", "Entry Recorded"),
      timestamp: passDetails.entry_time,
      actor: passDetails.guard || null,
      notes: null,
      icon: LogIn,
      color: "bg-blue-100 text-blue-800",
    });
  }

  // Exit
  if (passDetails.exit_time) {
    events.push({
      type: "exit",
      label: t("gatePass.timeline.exit", "Exit Recorded"),
      timestamp: passDetails.exit_time,
      actor: passDetails.guard || null,
      notes: null,
      icon: LogOut,
      color: "bg-gray-100 text-gray-800",
    });
  }

  // Sort by timestamp ascending
  events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  return events;
}

export function GatePassDetailDialog({
  pass,
  open,
  onOpenChange,
  onActionSuccess,
}: GatePassDetailDialogProps) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === "rtl";
  const dateLocale = i18n.language === "ar" ? ar : enUS;
  const queryClient = useQueryClient();

  const { data: passDetails, isLoading: isLoadingDetails } = useGatePassDetails(
    open ? pass?.id || null : null
  );
  const { items, photos, isLoading: isLoadingMedia } = useGatePassMedia(
    open ? pass?.id || null : null,
    pass?.is_public_request || false
  );
  const isLoadingItems = isLoadingMedia;
  const isLoadingPhotos = isLoadingMedia;

  const timelineEvents = useMemo(
    () => buildTimelineEvents(passDetails, t),
    [passDetails, t]
  );

  if (!pass) return null;

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      approved: "default",
      pending_contractor_approval: "secondary",
      pending_dept_ack: "secondary",
      pending_dept_approval: "secondary",
      pending_security_approval: "secondary",
      pending_pm_approval: "secondary",
      pending_safety_approval: "secondary",
      rejected: "destructive",
      completed: "outline",
      used: "outline",
      expired: "destructive",
      cancelled: "destructive",
    };
    const labels: Record<string, string> = {
      approved: t("contractors.passStatus.approved", "Approved"),
      pending_contractor_approval: t("contractors.passStatus.pendingContractor", "Pending Contractor"),
      pending_dept_ack: t("contractors.passStatus.pendingDeptAck", "Pending Dept Ack"),
      pending_dept_approval: t("contractors.passStatus.pendingDeptApproval", "Pending Dept"),
      pending_security_approval: t("contractors.passStatus.pendingSecurity", "Pending Security"),
      pending_pm_approval: t("contractors.passStatus.pendingPm", "Pending PM"),
      pending_safety_approval: t("contractors.passStatus.pendingSafety", "Pending Safety"),
      rejected: t("contractors.passStatus.rejected", "Rejected"),
      completed: t("contractors.passStatus.completed", "Completed"),
      used: t("contractors.passStatus.used", "Entry Verified"),
      expired: t("contractors.passStatus.expired", "Expired"),
      cancelled: t("contractors.passStatus.cancelled", "Cancelled"),
    };
    return (
      <Badge variant={variants[status] || "secondary"}>
        {labels[status] || status}
      </Badge>
    );
  };

  const isPendingAction = [
    "pending_contractor_approval",
    "pending_dept_ack",
    "pending_dept_approval",
    "pending_security_approval",
    "pending_pm_approval",
    "pending_safety_approval",
  ].includes(pass.status);

  const handleApprovalSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["dept-gate-passes"] });
    queryClient.invalidateQueries({ queryKey: ["dept-pending-approvals"] });
    queryClient.invalidateQueries({ queryKey: ["dept-gate-pass-stats"] });
    queryClient.invalidateQueries({ queryKey: ["gate-pass-details"] });
    onOpenChange(false);
    onActionSuccess?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <div className="flex items-center justify-between gap-4">
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {t("contractors.gatePassDetail.title", "Gate Pass Details")}
            </DialogTitle>
            {pass?.status === 'approved' && (
              <GatePassPDFExportButton passId={pass.id} />
            )}
          </div>
        </DialogHeader>

        <Tabs defaultValue="details" className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details">
              {t("contractors.gatePassDetail.detailsTab", "Details")}
            </TabsTrigger>
            <TabsTrigger value="items">
              {t("contractors.gatePassDetail.itemsTab", "Items & Photos")}
            </TabsTrigger>
            <TabsTrigger value="timeline">
              {t("contractors.gatePassDetail.timelineTab", "Timeline")}
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 min-h-0 mt-4">
            <TabsContent value="details" className="mt-0 space-y-4">
              <DetailsTab
                pass={pass}
                passDetails={passDetails}
                items={items || []}
                isLoading={isLoadingDetails}
                getStatusBadge={getStatusBadge}
                t={t}
              />
            </TabsContent>

            <TabsContent value="items" className="mt-0 space-y-4">
              <ItemsPhotosTab
                items={items || []}
                photos={photos || []}
                materialDescription={passDetails?.material_description || pass.material_description}
                isLoadingItems={isLoadingItems}
                isLoadingPhotos={isLoadingPhotos}
                t={t}
              />
            </TabsContent>

            <TabsContent value="timeline" className="mt-0">
              <TimelineTab
                gatePassId={pass.id}
                events={timelineEvents}
                isLoading={isLoadingDetails}
              />
            </TabsContent>
          </ScrollArea>
        </Tabs>

        {isPendingAction && (
          <div className="border-t pt-3 mt-2">
            <GatePassApprovalActions
              pass={pass}
              onSuccess={handleApprovalSuccess}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}


