import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Plus, Truck, Search, CheckCircle, Clock, XCircle, AlertCircle, Shield, Timer, Filter, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import ContractorPortalLayout from "@/components/contractor-portal/ContractorPortalLayout";
import { GatePassDetailDialog } from '@/features/contractors';
import { GatePassCreateDialog } from '@/features/contractors/components/GatePassCreateDialog';
import { useContractorPortalData, useContractorGatePasses } from "@/hooks/contractor-management/index";
import { format } from "date-fns";
import { ContractorPortalRoute } from "@/components/access-control";
import type { MaterialGatePass } from "@/features/contractors/hooks/use-material-gate-passes";

const ALL_STATUSES = "all";

function ContractorPortalGatePassesContent() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { company, projects, isLoading } = useContractorPortalData();
  const { data: gatePasses, isLoading: isLoadingPasses, isError } = useContractorGatePasses(company?.id);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState(ALL_STATUSES);
  const [selectedPass, setSelectedPass] = useState<MaterialGatePass | null>(null);

  const filteredPasses = (gatePasses as MaterialGatePass[] | undefined)?.filter(pass => {
    const matchesSearch =
      !searchQuery ||
      pass.reference_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pass.vehicle_plate?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pass.material_description?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === ALL_STATUSES || pass.status === statusFilter;

    return matchesSearch && matchesStatus;
  }) || [];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 me-1" />{t("common.approved", "Approved")}</Badge>;
      case "pending_contractor_approval":
        return <Badge variant="outline" className="text-warning border-warning"><Clock className="h-3 w-3 me-1" /><span className="hidden sm:inline">{t("contractors.gatePasses.pendingContractor", "Pending Consultant")}</span><span className="sm:hidden">{t("common.pending", "Pending")}</span></Badge>;
      case "pending_club_mgmt_ack": // legacy
        return <Badge variant="outline" className="text-blue-500 border-blue-500"><AlertCircle className="h-3 w-3 me-1" /><span className="hidden sm:inline">{t("contractors.gatePasses.pendingMgmt", "Pending Management")}</span><span className="sm:hidden">{t("common.pending", "Pending")}</span></Badge>;
      case "pending_security_approval":
        return <Badge variant="outline" className="text-purple-500 border-purple-500"><Shield className="h-3 w-3 me-1" /><span className="hidden sm:inline">{t("contractors.gatePasses.pendingSecurity", "Pending Security")}</span><span className="sm:hidden">{t("common.pending", "Pending")}</span></Badge>;
      case "rejected":
        return <Badge variant="destructive"><XCircle className="h-3 w-3 me-1" />{t("common.rejected", "Rejected")}</Badge>;
      case "used":
        return <Badge className="bg-blue-500">{t("contractors.gatePasses.used", "Used")}</Badge>;
      case "completed":
        return <Badge variant="secondary">{t("contractors.gatePasses.completed", "Completed")}</Badge>;
      case "expired":
        return <Badge variant="outline" className="text-muted-foreground border-muted-foreground"><Timer className="h-3 w-3 me-1" />{t("contractors.gatePasses.expired", "Expired")}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <ContractorPortalLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </ContractorPortalLayout>
    );
  }

  const activeProjects = projects?.filter(p => p.status === "active") || [];

  return (
    <ContractorPortalLayout>
      <div className="space-y-4 sm:space-y-6">
        {/* Page Header — stacks on mobile */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Truck className="h-6 w-6 sm:h-8 sm:w-8 text-primary flex-shrink-0" />
            <div>
              <h1 className="text-xl sm:text-2xl font-bold">{t("contractorPortal.gatePasses.title", "Gate Passes")}</h1>
              <p className="text-sm text-muted-foreground hidden sm:block">{t("contractorPortal.gatePasses.description", "Request and track material gate passes")}</p>
            </div>
          </div>
          <Button size="sm" onClick={() => setIsFormOpen(true)} disabled={activeProjects.length === 0}>
            <Plus className="h-4 w-4 me-1 sm:me-2" />
            {t("contractorPortal.gatePasses.requestPass", "Request Pass")}
          </Button>
        </div>

        {activeProjects.length === 0 && (
          <Alert variant="default" className="border-warning bg-warning/10">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <AlertDescription>
              <span>{t("contractorPortal.gatePasses.noActiveProjects", "No active projects. You need an active project to create a gate pass.")}</span>
            </AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
              <div className="relative flex-1 sm:max-w-sm">
                <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder={t("common.search", "Search...")} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="ps-9" />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <Filter className="h-4 w-4 me-2 text-muted-foreground" />
                  <SelectValue placeholder={t("common.filterByStatus", "Filter by status")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_STATUSES}>{t("common.allStatuses", "All Statuses")}</SelectItem>
                  <SelectItem value="pending_contractor_approval">{t("contractors.gatePasses.pendingContractor", "Pending Consultant")}</SelectItem>
                  
                  <SelectItem value="pending_security_approval">{t("contractors.gatePasses.pendingSecurity", "Pending Security")}</SelectItem>
                  <SelectItem value="approved">{t("common.approved", "Approved")}</SelectItem>
                  <SelectItem value="rejected">{t("common.rejected", "Rejected")}</SelectItem>
                  <SelectItem value="used">{t("contractors.gatePasses.used", "Used")}</SelectItem>
                  <SelectItem value="completed">{t("contractors.gatePasses.completed", "Completed")}</SelectItem>
                  <SelectItem value="expired">{t("contractors.gatePasses.expired", "Expired")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {isError ? (
              <div className="text-center py-8 text-destructive">
                {t("common.errorLoadingData", "Failed to load data. Please try again.")}
              </div>
            ) : isLoadingPasses ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : filteredPasses.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">{t("contractorPortal.gatePasses.noPasses", "No gate passes")}</div>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("contractors.gatePasses.reference", "Reference")}</TableHead>
                        <TableHead>{t("contractors.gatePasses.date", "Date")}</TableHead>
                        <TableHead>{t("contractors.gatePasses.type", "Type")}</TableHead>
                        <TableHead>{t("contractors.gatePasses.project", "Project")}</TableHead>
                        <TableHead>{t("contractors.gatePasses.material", "Material")}</TableHead>
                        <TableHead>{t("contractors.gatePasses.vehicle", "Vehicle")}</TableHead>
                        <TableHead>{t("common.status", "Status")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPasses.map((pass) => (
                        <TableRow
                          key={pass.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => setSelectedPass(pass)}
                        >
                          <TableCell className="font-mono">{pass.reference_number}</TableCell>
                          <TableCell>{format(new Date(pass.pass_date), "PP")}</TableCell>
                          <TableCell className="capitalize">{pass.pass_type?.replace(/_/g, " ") || "-"}</TableCell>
                          <TableCell>{pass.project?.project_name || "-"}</TableCell>
                          <TableCell className="max-w-[200px] truncate">{pass.material_description || "-"}</TableCell>
                          <TableCell>{pass.vehicle_plate || "-"}</TableCell>
                          <TableCell>{getStatusBadge(pass.status)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile Card List */}
                <div className="md:hidden space-y-3">
                  {filteredPasses.map((pass) => (
                    <div
                      key={pass.id}
                      className="border rounded-lg p-3 space-y-2 active:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => setSelectedPass(pass)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-mono font-medium text-sm">{pass.reference_number}</p>
                          <p className="text-xs text-muted-foreground">{format(new Date(pass.pass_date), "PP")}</p>
                        </div>
                        {getStatusBadge(pass.status)}
                      </div>
                      {pass.material_description && (
                        <p className="text-sm text-muted-foreground truncate">{pass.material_description}</p>
                      )}
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{pass.project?.project_name || "-"}</span>
                        {pass.vehicle_plate && <span className="font-mono">{pass.vehicle_plate}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <GatePassDetailDialog
          pass={selectedPass}
          open={!!selectedPass}
          onOpenChange={(open) => { if (!open) setSelectedPass(null); }}
        />

        <GatePassCreateDialog
          open={isFormOpen}
          onOpenChange={setIsFormOpen}
        />
      </div>
    </ContractorPortalLayout>
  );
}

export default function ContractorPortalGatePasses() {
  return (
    <ContractorPortalRoute>
      <ContractorPortalGatePassesContent />
    </ContractorPortalRoute>
  );
}
