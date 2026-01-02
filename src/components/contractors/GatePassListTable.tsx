import { useTranslation } from "react-i18next";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MaterialGatePass } from "@/hooks/contractor-management/use-material-gate-passes";
import { format } from "date-fns";
import { Clock, Truck, Building2 } from "lucide-react";

interface GatePassListTableProps {
  gatePasses: MaterialGatePass[];
  isLoading: boolean;
}

export function GatePassListTable({ gatePasses, isLoading }: GatePassListTableProps) {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-12 sm:h-14 w-full" />
        ))}
      </div>
    );
  }

  if (gatePasses.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        {t("contractors.gatePasses.noPasses", "No gate passes found")}
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      approved: "default",
      pending_pm_approval: "secondary",
      pending_safety_approval: "secondary",
      rejected: "destructive",
      completed: "outline",
    };
    const labels: Record<string, string> = {
      approved: t("contractors.passStatus.approved", "Approved"),
      pending_pm_approval: t("contractors.passStatus.pendingPm", "Pending PM"),
      pending_safety_approval: t("contractors.passStatus.pendingSafety", "Pending Safety"),
      rejected: t("contractors.passStatus.rejected", "Rejected"),
      completed: t("contractors.passStatus.completed", "Completed"),
    };
    return (
      <Badge variant={variants[status] || "secondary"} className="text-[10px] sm:text-xs">
        {labels[status] || status}
      </Badge>
    );
  };

  const formatTimeWindow = (start: string | null, end: string | null) => {
    if (!start && !end) return "-";
    return `${start || "?"} - ${end || "?"}`;
  };

  // Mobile Card Component
  const MobilePassCard = ({ pass }: { pass: MaterialGatePass }) => (
    <div className="p-3 rounded-lg border bg-card space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-mono text-xs text-muted-foreground">{pass.reference_number}</p>
          <p className="font-medium text-sm truncate mt-0.5">{pass.material_description}</p>
        </div>
        {getStatusBadge(pass.status)}
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge variant="outline" className="text-[10px]">
          {t(`contractors.passType.${pass.pass_type}`, pass.pass_type)}
        </Badge>
        {pass.project?.project_name && (
          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
            <Building2 className="h-3 w-3" />
            {pass.project.project_name}
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted-foreground pt-1 border-t">
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {format(new Date(pass.pass_date), "dd/MM/yyyy")}
        </span>
        <span>{formatTimeWindow(pass.time_window_start, pass.time_window_end)}</span>
        {pass.vehicle_plate && (
          <span className="flex items-center gap-1">
            <Truck className="h-3 w-3" />
            {pass.vehicle_plate}
          </span>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Card View */}
      <div className="block md:hidden space-y-2">
        {gatePasses.map((pass) => (
          <MobilePassCard key={pass.id} pass={pass} />
        ))}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("contractors.gatePasses.reference", "Reference")}</TableHead>
              <TableHead>{t("contractors.gatePasses.type", "Type")}</TableHead>
              <TableHead>{t("contractors.gatePasses.material", "Material")}</TableHead>
              <TableHead>{t("contractors.gatePasses.project", "Project")}</TableHead>
              <TableHead>{t("contractors.gatePasses.vehiclePlate", "Vehicle")}</TableHead>
              <TableHead>{t("contractors.gatePasses.passDate", "Date")}</TableHead>
              <TableHead>{t("contractors.gatePasses.timeWindow", "Time Window")}</TableHead>
              <TableHead>{t("common.status", "Status")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {gatePasses.map((pass) => (
              <TableRow key={pass.id}>
                <TableCell className="font-mono text-sm">{pass.reference_number}</TableCell>
                <TableCell>
                  <Badge variant="outline">{t(`contractors.passType.${pass.pass_type}`, pass.pass_type)}</Badge>
                </TableCell>
                <TableCell className="max-w-[200px] truncate">{pass.material_description}</TableCell>
                <TableCell>{pass.project?.project_name || "-"}</TableCell>
                <TableCell>{pass.vehicle_plate || "-"}</TableCell>
                <TableCell>{format(new Date(pass.pass_date), "dd/MM/yyyy")}</TableCell>
                <TableCell className="text-sm">{formatTimeWindow(pass.time_window_start, pass.time_window_end)}</TableCell>
                <TableCell>{getStatusBadge(pass.status)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
