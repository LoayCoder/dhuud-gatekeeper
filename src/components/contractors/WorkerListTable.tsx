import { useTranslation } from "react-i18next";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ContractorWorker } from "@/hooks/contractor-management/use-contractor-workers";

interface WorkerListTableProps {
  workers: ContractorWorker[];
  isLoading: boolean;
  onEdit: (worker: ContractorWorker) => void;
}

export function WorkerListTable({ workers, isLoading, onEdit }: WorkerListTableProps) {
  const { t } = useTranslation();

  if (isLoading) {
    return <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>;
  }

  if (workers.length === 0) {
    return <div className="text-center py-8 text-muted-foreground">{t("contractors.workers.noWorkers", "No workers found")}</div>;
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      approved: "default", pending: "secondary", rejected: "destructive",
    };
    return <Badge variant={variants[status] || "secondary"}>{t(`contractors.workerStatus.${status}`, status)}</Badge>;
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t("contractors.workers.name", "Name")}</TableHead>
          <TableHead>{t("contractors.workers.nationalId", "National ID")}</TableHead>
          <TableHead>{t("contractors.workers.company", "Company")}</TableHead>
          <TableHead>{t("contractors.workers.nationality", "Nationality")}</TableHead>
          <TableHead>{t("common.status", "Status")}</TableHead>
          <TableHead className="text-end">{t("common.actions", "Actions")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {workers.map((worker) => (
          <TableRow key={worker.id}>
            <TableCell className="font-medium">{worker.full_name}</TableCell>
            <TableCell className="font-mono text-sm">{worker.national_id}</TableCell>
            <TableCell>{worker.company?.company_name || "-"}</TableCell>
            <TableCell>{worker.nationality || "-"}</TableCell>
            <TableCell>{getStatusBadge(worker.approval_status)}</TableCell>
            <TableCell className="text-end">
              <Button variant="ghost" size="icon" onClick={() => onEdit(worker)}><Pencil className="h-4 w-4" /></Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
