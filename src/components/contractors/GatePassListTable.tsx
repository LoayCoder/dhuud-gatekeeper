import { useTranslation } from "react-i18next";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MaterialGatePass } from "@/hooks/contractor-management/use-material-gate-passes";

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
      approved: "default", pending_pm_approval: "secondary", pending_safety_approval: "secondary",
      rejected: "destructive", completed: "outline",
    };
    return <Badge variant={variants[status] || "secondary"}>{t(`contractors.passStatus.${status}`, status)}</Badge>;
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t("contractors.gatePasses.passNumber", "Pass #")}</TableHead>
          <TableHead>{t("contractors.gatePasses.material", "Material")}</TableHead>
          <TableHead>{t("contractors.gatePasses.project", "Project")}</TableHead>
          <TableHead>{t("contractors.gatePasses.vehicle", "Vehicle")}</TableHead>
          <TableHead>{t("contractors.gatePasses.date", "Date")}</TableHead>
          <TableHead>{t("common.status", "Status")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {gatePasses.map((pass) => (
          <TableRow key={pass.id}>
            <TableCell className="font-mono text-sm">{pass.pass_number}</TableCell>
            <TableCell>{pass.material_description}</TableCell>
            <TableCell>{pass.project?.project_name || "-"}</TableCell>
            <TableCell>{pass.vehicle_number || "-"}</TableCell>
            <TableCell>{pass.expected_date}</TableCell>
            <TableCell>{getStatusBadge(pass.status)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
