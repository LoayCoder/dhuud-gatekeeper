import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Search, Filter, FileKey, Plus, History, Clock, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { useMyGatePasses } from "@/hooks/contractor-management/use-my-gate-passes";
import { format } from "date-fns";

function MyGatePassListContent() {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: passes, isLoading } = useMyGatePasses({
    search: search || undefined,
    status: statusFilter === "all" ? undefined : statusFilter,
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "success" | "warning" | "destructive"; label: string; icon: React.ReactNode }> = {
      pending: { variant: "warning", label: t("gatePasses.status.pending", "Pending"), icon: <Clock className="h-3 w-3" /> },
      pending_dept_approval: { variant: "warning", label: t("gatePasses.status.pending_dept_approval", "Pending Dept"), icon: <Clock className="h-3 w-3" /> },
      pending_club_mgmt_ack: { variant: "warning", label: t("gatePasses.status.pending_club_mgmt_ack", "Pending Club Mgmt"), icon: <AlertCircle className="h-3 w-3" /> },
      pm_approved: { variant: "secondary", label: t("gatePasses.status.pm_approved", "PM Approved"), icon: <CheckCircle2 className="h-3 w-3" /> },
      pending_security_approval: { variant: "warning", label: t("gatePasses.status.pending_security", "Pending Security"), icon: <AlertCircle className="h-3 w-3" /> },
      approved: { variant: "success", label: t("gatePasses.status.approved", "Approved"), icon: <CheckCircle2 className="h-3 w-3" /> },
      rejected: { variant: "destructive", label: t("gatePasses.status.rejected", "Rejected"), icon: <XCircle className="h-3 w-3" /> },
      entry_verified: { variant: "default", label: t("gatePasses.status.entry_verified", "Entry Verified"), icon: <CheckCircle2 className="h-3 w-3" /> },
      completed: { variant: "success", label: t("gatePasses.status.completed", "Completed"), icon: <CheckCircle2 className="h-3 w-3" /> },
    };
    const config = variants[status] || { variant: "secondary" as const, label: status, icon: null };
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        {config.icon}
        {config.label}
      </Badge>
    );
  };

  const getPassTypeBadge = (isInternal: boolean) => {
    return isInternal ? (
      <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50">
        {t("gatePasses.type.internal", "Internal")}
      </Badge>
    ) : (
      <Badge variant="outline" className="text-purple-600 border-purple-200 bg-purple-50">
        {t("gatePasses.type.external", "External")}
      </Badge>
    );
  };

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold tracking-tight">
            {t("myGatePasses.title", "My Gate Passes")}
          </h1>
          <p className="text-muted-foreground">
            {t("myGatePasses.description", "View and manage your gate pass requests")}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to="/my-gate-passes/history">
              <History className="h-4 w-4 me-2" />
              {t("myGatePasses.approvalHistory", "Approval History")}
            </Link>
          </Button>
          <Button asChild>
            <Link to="/my-gate-passes/create">
              <Plus className="h-4 w-4 me-2" />
              {t("myGatePasses.createNew", "New Request")}
            </Link>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("myGatePasses.searchPlaceholder", "Search by reference, material, vehicle...")}
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
                  <SelectItem value="pending">{t("gatePasses.status.pending", "Pending")}</SelectItem>
                  <SelectItem value="pm_approved">{t("gatePasses.status.pm_approved", "PM Approved")}</SelectItem>
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
            {t("myGatePasses.myRequests", "My Requests")}
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
              <p className="mb-4">{t("myGatePasses.noResults", "You haven't created any gate passes yet")}</p>
              <Button asChild>
                <Link to="/my-gate-passes/create">
                  <Plus className="h-4 w-4 me-2" />
                  {t("myGatePasses.createFirst", "Create Your First Request")}
                </Link>
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("gatePasses.referenceNumber", "Reference")}</TableHead>
                    <TableHead>{t("gatePasses.type", "Type")}</TableHead>
                    <TableHead>{t("gatePasses.material", "Material")}</TableHead>
                    <TableHead>{t("gatePasses.passDate", "Date")}</TableHead>
                    <TableHead>{t("gatePasses.vehicle", "Vehicle")}</TableHead>
                    <TableHead>{t("common.status", "Status")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {passes.map(pass => (
                    <TableRow key={pass.id}>
                      <TableCell className="font-medium">{pass.reference_number}</TableCell>
                      <TableCell>{getPassTypeBadge(pass.is_internal_request ?? false)}</TableCell>
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
    </div>
  );
}

export default function MyGatePassList() {
  return (
    <MenuBasedAdminRoute menuCode="my_gate_pass_list">
      <MyGatePassListContent />
    </MenuBasedAdminRoute>
  );
}
