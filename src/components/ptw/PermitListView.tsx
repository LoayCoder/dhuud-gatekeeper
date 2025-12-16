import { useTranslation } from "react-i18next";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { PTWPermit } from "@/hooks/ptw";
import { format } from "date-fns";

interface PermitListViewProps {
  permits: PTWPermit[];
  isLoading: boolean;
}

export function PermitListView({ permits, isLoading }: PermitListViewProps) {
  const { t } = useTranslation();

  if (isLoading) {
    return <Skeleton className="h-[400px] w-full" />;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t("ptw.list.reference", "Reference")}</TableHead>
          <TableHead>{t("ptw.list.type", "Type")}</TableHead>
          <TableHead>{t("ptw.list.project", "Project")}</TableHead>
          <TableHead>{t("ptw.list.status", "Status")}</TableHead>
          <TableHead>{t("ptw.list.planned", "Planned")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {permits.map((permit) => (
          <TableRow key={permit.id}>
            <TableCell>
              <Link to={`/ptw/view/${permit.id}`} className="font-medium hover:underline">
                {permit.reference_id}
              </Link>
            </TableCell>
            <TableCell>{permit.permit_type?.name}</TableCell>
            <TableCell>{permit.project?.name}</TableCell>
            <TableCell>
              <Badge variant={permit.status === "active" ? "default" : "outline"}>
                {permit.status}
              </Badge>
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {format(new Date(permit.planned_start_time), "MMM d, HH:mm")}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
