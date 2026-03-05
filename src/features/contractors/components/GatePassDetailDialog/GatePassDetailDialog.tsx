import React from "react";
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
import { FileText } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGatePassDetails,
  useGatePassItems,
  useGatePassPhotos,
} from "@/features/contractors/hooks/use-gate-pass-details";
import { GatePassPDFExportButton } from "../GatePassPDFExportButton";
import { GatePassApprovalActions } from "../GatePassApprovalActions";
import { GatePassDetailDialogProps } from "./types";
import { DetailsTab } from "./tabs/DetailsTab";
import { ItemsPhotosTab } from "./tabs/ItemsPhotosTab";
import { TimelineTab } from "./tabs/TimelineTab";

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
  const { data: items, isLoading: isLoadingItems } = useGatePassItems(
    open ? pass?.id || null : null,
    pass?.is_public_request || false
  );
  const { data: photos, isLoading: isLoadingPhotos } = useGatePassPhotos(
    open ? pass?.id || null : null,
    pass?.is_public_request || false
  );

  if (!pass) return null;

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      approved: "default",
      pending_contractor_approval: "secondary",
      pending_dept_ack: "secondary",
      pending_dept_approval: "secondary",
      pending_club_mgmt_ack: "secondary",
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
      pending_club_mgmt_ack: t("contractors.passStatus.pendingClubMgmtAck", "Pending Golf Club Management"),
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

  // Check if pass is in a pending status that allows actions
  const isPendingAction = [
    "pending_contractor_approval", // External: Contractor Consultant approval
    "pending_club_mgmt_ack",       // Both: Golf Club Management acknowledgment
    "pending_dept_ack",            // External: Dept Rep acknowledgment (legacy)
    "pending_dept_approval",       // Internal: Dept Rep approval
    "pending_security_approval",   // Both: Security Supervisor approval
    // Legacy statuses
    "pending_pm_approval",
    "pending_safety_approval",
  ].includes(pass.status);

  const handleApprovalSuccess = () => {
    // Invalidate all related queries to refresh the UI
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
                {...{ passDetails, isLoading: isLoadingDetails, dateLocale, isRTL, t } as any}
              />
            </TabsContent>
          </ScrollArea>
        </Tabs>

        {/* Approval Actions - shown when pass is pending and user can act */}
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


