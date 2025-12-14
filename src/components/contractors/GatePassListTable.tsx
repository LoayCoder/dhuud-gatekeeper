import { useTranslation } from "react-i18next";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MaterialGatePass } from "@/hooks/contractor-management/use-material-gate-passes";
import { format } from "date-fns";

interface GatePassListTableProps {
  gatePasses: MaterialGatePass[];
  isLoading: boolean;
}

export function GatePassListTable({ gatePasses, isLoading }: GatePassListTableProps) {
  const { t } = useTranslation();

  if (isLoading) {
    return <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>;
  }

  if (gatePasses.length === 0) {
    return <div className="text-center py-8 text-muted-foreground">{t("contractors.gatePasses.noPasses", "No gate passes found")}</div>;
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
    return <Badge variant={variants[status] || "secondary"}>{labels[status] || status}</Badge>;
  };

  const formatTimeWindow = (start: string | null, end: string | null) => {
    if (!start && !end) return "-";
    return `${start || "?"} - ${end || "?"}`;
  };

  return (
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
  );
}
