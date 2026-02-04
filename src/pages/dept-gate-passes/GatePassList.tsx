import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MenuBasedAdminRoute } from "@/components/auth/MenuBasedAdminRoute";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, Filter, FileKey } from "lucide-react";
import { useDeptGatePasses } from "@/hooks/contractor-management/use-dept-gate-passes";
import { MaterialGatePass } from "@/hooks/contractor-management/use-material-gate-passes";
import { GatePassDetailDialog } from "@/components/contractors/GatePassDetailDialog";
import { GatePassTypeBadge } from "@/components/contractors/GatePassTypeBadge";
import { format } from "date-fns";

function DeptGatePassListContent() {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === "rtl";
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedPass, setSelectedPass] = useState<MaterialGatePass | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const { data: passes, isLoading } = useDeptGatePasses({
    search: search || undefined,
    status: statusFilter === "all" ? undefined : statusFilter,
  });

  const handleRowClick = (pass: MaterialGatePass) => {
    setSelectedPass(pass);
    setDetailOpen(true);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "success" | "warning" | "destructive"; label: string }> = {
      pending: { variant: "warning", label: t("gatePasses.status.pending", "Pending") },
      pending_dept_approval: { variant: "warning", label: t("gatePasses.status.pending_dept_approval", "Pending Dept") },
      pending_contractor_approval: { variant: "warning", label: t("gatePasses.status.pending_contractor_approval", "Pending Contractor") },
      pending_club_mgmt_ack: { variant: "warning", label: t("gatePasses.status.pending_club_mgmt_ack", "Pending Golf Club Management") },
      pending_security_approval: { variant: "warning", label: t("gatePasses.status.pending_security", "Pending Security") },
      pm_approved: { variant: "secondary", label: t("gatePasses.status.pm_approved", "PM Approved") },
      approved: { variant: "success", label: t("gatePasses.status.approved", "Approved") },
      rejected: { variant: "destructive", label: t("gatePasses.status.rejected", "Rejected") },
      entry_verified: { variant: "default", label: t("gatePasses.status.entry_verified", "Entry Verified") },
      completed: { variant: "success", label: t("gatePasses.status.completed", "Completed") },
    };
    const config = variants[status] || { variant: "secondary" as const, label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight">
          {t("deptGatePasses.list.title", "All Gate Passes")}
        </h1>
        <p className="text-muted-foreground">
          {t("deptGatePasses.list.description", "View and manage all gate passes for your department")}
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("deptGatePasses.list.searchPlaceholder", "Search by reference, material, vehicle...")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="ps-9"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder={t("common.status", "Status")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("common.all", "All")}</SelectItem>
                  <SelectItem value="pending_dept_approval">{t("gatePasses.status.pending_dept_approval", "Pending Dept")}</SelectItem>
                  <SelectItem value="pending_club_mgmt_ack">{t("gatePasses.status.pending_club_mgmt_ack", "Pending Golf Club Management")}</SelectItem>
                  <SelectItem value="pending_security_approval">{t("gatePasses.status.pending_security", "Pending Security")}</SelectItem>
                  <SelectItem value="approved">{t("gatePasses.status.approved", "Approved")}</SelectItem>
                  <SelectItem value="rejected">{t("gatePasses.status.rejected", "Rejected")}</SelectItem>
                  <SelectItem value="completed">{t("gatePasses.status.completed", "Completed")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileKey className="h-5 w-5" />
            {t("deptGatePasses.list.tableTitle", "Gate Passes")}
          </CardTitle>
          <CardDescription>
            {passes?.length ?? 0} {t("common.records", "records")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map(i => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !passes?.length ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileKey className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>{t("deptGatePasses.list.noResults", "No gate passes found")}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("gatePasses.referenceNumber", "Reference")}</TableHead>
                    <TableHead>{t("common.type", "Type")}</TableHead>
                    <TableHead>{t("gatePasses.project", "Project")}</TableHead>
                    <TableHead>{t("gatePasses.material", "Material")}</TableHead>
                    <TableHead>{t("gatePasses.passDate", "Date")}</TableHead>
                    <TableHead>{t("gatePasses.vehicle", "Vehicle")}</TableHead>
                    <TableHead>{t("common.status", "Status")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {passes.map(pass => (
                    <TableRow 
                      key={pass.id}
                      onClick={() => handleRowClick(pass)}
                      className="cursor-pointer hover:bg-accent"
                    >
                      <TableCell className="font-medium">{pass.reference_number}</TableCell>
                      <TableCell><GatePassTypeBadge isInternal={pass.is_internal_request} /></TableCell>
                      <TableCell>
                        {pass.is_internal_request 
                          ? t("gatePasses.internalRequest", "Internal Request")
                          : pass.project?.project_name || "-"
                        }
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {pass.material_description}
                      </TableCell>
                      <TableCell>
                        {pass.pass_date ? format(new Date(pass.pass_date), "PP") : "-"}
                      </TableCell>
                      <TableCell>{pass.vehicle_plate || "-"}</TableCell>
                      <TableCell>{getStatusBadge(pass.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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

export default function DeptGatePassList() {
  return (
    <MenuBasedAdminRoute menuCode="dept_gate_pass_list">
      <DeptGatePassListContent />
    </MenuBasedAdminRoute>
  );
}
