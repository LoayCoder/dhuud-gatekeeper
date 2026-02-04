import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MenuBasedAdminRoute } from "@/components/auth/MenuBasedAdminRoute";
import { Clock, AlertCircle, User, Truck, Calendar } from "lucide-react";
import { useDeptPendingApprovals } from "@/hooks/contractor-management/use-dept-gate-passes";
import { MaterialGatePass } from "@/hooks/contractor-management/use-material-gate-passes";
import { GatePassDetailDialog } from "@/components/contractors/GatePassDetailDialog";
import { GatePassTypeBadge } from "@/components/contractors/GatePassTypeBadge";
import { format } from "date-fns";

function DeptPendingApprovalsContent() {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === "rtl";
  const { data: pendingPasses, isLoading } = useDeptPendingApprovals();
  const [selectedPass, setSelectedPass] = useState<MaterialGatePass | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const handlePassClick = (pass: MaterialGatePass) => {
    setSelectedPass(pass);
    setDetailOpen(true);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "success" | "warning" | "destructive"; label: string }> = {
      // Current workflow statuses
      pending_dept_approval: { variant: "warning", label: t("gatePasses.status.pending_dept_approval", "Pending Dept Approval") },
      pending_contractor_approval: { variant: "warning", label: t("gatePasses.status.pending_contractor_approval", "Pending Contractor") },
      pending_club_mgmt_ack: { variant: "warning", label: t("gatePasses.status.pending_club_mgmt_ack", "Pending Golf Club Mgmt") },
      pending_security_approval: { variant: "warning", label: t("gatePasses.status.pending_security_approval", "Pending Security") },
      // Legacy statuses (backward compatibility)
      pending_dept_ack: { variant: "warning", label: t("gatePasses.status.pending_dept_ack", "Pending Dept Ack") },
      pending_pm_approval: { variant: "warning", label: t("gatePasses.status.pending_pm_approval", "Pending PM") },
      pending_safety_approval: { variant: "warning", label: t("gatePasses.status.pending_safety_approval", "Pending Safety") },
    };
    const config = variants[status] || { variant: "secondary" as const, label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight">
          {t("deptGatePasses.approvals.title", "Pending Approvals")}
        </h1>
        <p className="text-muted-foreground">
          {t("deptGatePasses.approvals.description", "Gate passes awaiting approval in your department")}
        </p>
      </div>

      {/* Summary Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-warning/10">
              <AlertCircle className="h-6 w-6 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold">{pendingPasses?.length ?? 0}</p>
              <p className="text-sm text-muted-foreground">
                {t("deptGatePasses.approvals.pendingCount", "passes awaiting approval")}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pending List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            {t("deptGatePasses.approvals.queueTitle", "Approval Queue")}
          </CardTitle>
          <CardDescription>
            {t("deptGatePasses.approvals.queueDesc", "Review and approve gate pass requests")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : !pendingPasses?.length ? (
            <div className="text-center py-12 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">{t("deptGatePasses.approvals.allClear", "All Clear!")}</p>
              <p className="text-sm">
                {t("deptGatePasses.approvals.noPending", "No gate passes pending approval")}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingPasses.map(pass => (
                <div
                  key={pass.id}
                  onClick={() => handlePassClick(pass)}
                  className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold">{pass.reference_number}</span>
                        <GatePassTypeBadge isInternal={pass.is_internal_request} />
                        {getStatusBadge(pass.status)}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {pass.material_description}
                      </p>
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <User className="h-3.5 w-3.5" />
                          {pass.requester?.full_name || t("common.unknown", "Unknown")}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {pass.pass_date ? format(new Date(pass.pass_date), "PP") : "-"}
                        </span>
                        {pass.vehicle_plate && (
                          <span className="flex items-center gap-1">
                            <Truck className="h-3.5 w-3.5" />
                            {pass.vehicle_plate}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {pass.is_internal_request 
                          ? t("gatePasses.internalRequest", "Internal Request")
                          : pass.project?.project_name
                        }
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <p className="text-xs text-muted-foreground">
                        {t("common.createdAt", "Created")}: {pass.created_at && format(new Date(pass.created_at), "Pp")}
                      </p>
                      {pass.time_window_start && pass.time_window_end && (
                        <p className="text-xs text-muted-foreground">
                          {t("gatePasses.timeWindow", "Time")}: {pass.time_window_start} - {pass.time_window_end}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <GatePassDetailDialog
        pass={selectedPass}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </div>
  );
}

export default function DeptPendingApprovals() {
  return (
    <MenuBasedAdminRoute menuCode="dept_gate_pass_approvals">
      <DeptPendingApprovalsContent />
    </MenuBasedAdminRoute>
  );
}
