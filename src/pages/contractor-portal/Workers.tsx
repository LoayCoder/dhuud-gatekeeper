import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Users, Search, CheckCircle, Clock, XCircle, AlertTriangle, Pencil, Upload, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import ContractorPortalLayout from "@/components/contractor-portal/ContractorPortalLayout";
import ContractorWorkerForm from "@/components/contractor-portal/ContractorWorkerForm";
import ContractorWorkerEditForm from "@/components/contractor-portal/ContractorWorkerEditForm";
import ContractorWorkerBulkImport from "@/components/contractor-portal/ContractorWorkerBulkImport";
import { WorkerDetailDialog } from "@/features/contractors/components/WorkerDetailDialog";
import { useContractorPortalData } from "@/hooks/contractor-management/index";
import { ContractorPortalRoute } from "@/components/access-control";
import { useBlacklistNationalIds } from "@/features/security";
import type { ContractorWorker } from "@/features/contractors/hooks/use-contractor-workers";

interface PortalWorker {
  id: string;
  full_name: string;
  full_name_ar?: string | null;
  id_type?: string;
  national_id: string;
  date_of_birth?: string | null;
  gender?: string | null;
  mobile_number: string;
  email?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  nationality?: string | null;
  worker_role?: string;
  preferred_language: string;
  approval_status: string;
  photo_path?: string | null;
  fitness_to_work?: string | null;
  fitness_acknowledged?: boolean | null;
  medical_check_date?: string | null;
  fitness_expiry_date?: string | null;
  medical_certificate_path?: string | null;
  training_certifications?: string[];
  edit_pending_approval?: boolean;
}

function ContractorPortalWorkersContent() {
  const { t } = useTranslation();
  const { company, workers, isLoading } = useContractorPortalData();
  const { data: blacklistedIds } = useBlacklistNationalIds();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [editingWorker, setEditingWorker] = useState<PortalWorker | null>(null);
  const [selectedWorker, setSelectedWorker] = useState<ContractorWorker | null>(null);

  const filteredWorkers = workers?.filter(worker => {
    const matchesSearch = worker.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      worker.national_id.includes(searchQuery) ||
      worker.mobile_number.includes(searchQuery);
    const matchesStatus = statusFilter === "all" || worker.approval_status === statusFilter;
    return matchesSearch && matchesStatus;
  }) || [];

  const getStatusBadge = (status: string, editPending?: boolean) => {
    if (editPending && status === "approved") {
      return (
        <Badge variant="outline" className="border-amber-500 text-amber-600 dark:text-amber-400 gap-1">
          <AlertTriangle className="h-3 w-3" />
          <span className="hidden sm:inline">{t("contractorPortal.workers.changesPendingReview", "Changes Pending Review")}</span>
          <span className="sm:hidden">{t("common.pending", "Pending")}</span>
        </Badge>
      );
    }

    switch (status) {
      case "approved":
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 me-1" />{t("common.approved", "Approved")}</Badge>;
      case "pending":
        return <Badge variant="outline" className="text-warning border-warning"><Clock className="h-3 w-3 me-1" />{t("common.pending", "Pending")}</Badge>;
      case "rejected":
        return <Badge variant="destructive"><XCircle className="h-3 w-3 me-1" />{t("common.rejected", "Rejected")}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const openWorkerDetail = (worker: PortalWorker) => {
    const mapped: ContractorWorker = {
      id: worker.id,
      tenant_id: '',
      company_id: company?.id || '',
      full_name: worker.full_name,
      full_name_ar: worker.full_name_ar || null,
      national_id: worker.national_id,
      nationality: worker.nationality || null,
      mobile_number: worker.mobile_number,
      photo_path: null,
      preferred_language: worker.preferred_language,
      approval_status: worker.approval_status,
      approved_at: null,
      rejection_reason: null,
      created_at: new Date().toISOString(),
      company: company ? { company_name: company.company_name } : null,
    };
    setSelectedWorker(mapped);
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

  return (
    <ContractorPortalLayout>
      <div className="space-y-4 sm:space-y-6">
        {/* Page Header — stacks on mobile */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Users className="h-6 w-6 sm:h-8 sm:w-8 text-primary flex-shrink-0" />
            <div>
              <h1 className="text-xl sm:text-2xl font-bold">
                {t("contractorPortal.workers.title", "Workers")}
              </h1>
              <p className="text-sm text-muted-foreground hidden sm:block">
                {t("contractorPortal.workers.description", "Manage your company's workers")}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsBulkImportOpen(true)} className="flex-1 sm:flex-none">
              <Upload className="h-4 w-4 me-1 sm:me-2" />
              <span className="hidden sm:inline">{t("contractorPortal.workers.bulkImport", "Bulk Import")}</span>
              <span className="sm:hidden">{t("common.import", "Import")}</span>
            </Button>
            <Button size="sm" onClick={() => setIsFormOpen(true)} className="flex-1 sm:flex-none">
              <Plus className="h-4 w-4 me-1 sm:me-2" />
              <span className="hidden sm:inline">{t("contractorPortal.workers.addWorker", "Add Worker")}</span>
              <span className="sm:hidden">{t("common.add", "Add")}</span>
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader className="pb-3">
            {/* Search/Filter — stacks on mobile */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
              <div className="relative flex-1 sm:max-w-sm">
                <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t("common.search", "Search...")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="ps-9"
                />
              </div>
              <div className="flex items-center gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-[160px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("common.allStatuses", "All Statuses")}</SelectItem>
                    <SelectItem value="pending">{t("common.pending", "Pending")}</SelectItem>
                    <SelectItem value="approved">{t("common.approved", "Approved")}</SelectItem>
                    <SelectItem value="rejected">{t("common.rejected", "Rejected")}</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-sm text-muted-foreground whitespace-nowrap">
                  {filteredWorkers.length} {t("contractors.workers.title", "workers")}
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredWorkers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {workers?.length === 0 
                  ? t("contractorPortal.workers.noWorkers", "No workers registered yet")
                  : t("common.noResults", "No results found")
                }
              </div>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("contractors.workers.name", "Name")}</TableHead>
                        <TableHead>{t("contractors.workers.nationalId", "National ID")}</TableHead>
                        <TableHead>{t("contractors.workers.mobile", "Mobile")}</TableHead>
                        <TableHead>{t("contractors.workers.nationality", "Nationality")}</TableHead>
                        <TableHead>{t("common.status", "Status")}</TableHead>
                        <TableHead className="text-end">{t("common.actions", "Actions")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredWorkers.map((worker) => (
                        <TableRow key={worker.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div>
                                <button
                                  type="button"
                                  className="font-medium text-start hover:underline hover:text-primary cursor-pointer bg-transparent border-none p-0"
                                  onClick={() => openWorkerDetail(worker as PortalWorker)}
                                >
                                  {worker.full_name}
                                </button>
                                {worker.full_name_ar && (
                                  <p className="text-sm text-muted-foreground">{worker.full_name_ar}</p>
                                )}
                              </div>
                              {blacklistedIds?.has(worker.national_id) && (
                                <Tooltip>
                                  <TooltipTrigger>
                                    <Badge variant="destructive" className="gap-1">
                                      <ShieldAlert className="h-3 w-3" />
                                      {t("contractors.workers.blacklisted", "Blacklisted")}
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    {t("contractors.workers.blacklistedTooltip", "This worker is on the security blacklist")}
                                  </TooltipContent>
                                </Tooltip>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="font-mono">{worker.national_id}</TableCell>
                          <TableCell>{worker.mobile_number}</TableCell>
                          <TableCell>{worker.nationality || "-"}</TableCell>
                          <TableCell>{getStatusBadge(worker.approval_status, worker.edit_pending_approval)}</TableCell>
                          <TableCell className="text-end">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setEditingWorker(worker as PortalWorker)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                {t("common.edit", "Edit")}
                              </TooltipContent>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile Card List */}
                <div className="md:hidden space-y-3">
                  {filteredWorkers.map((worker) => (
                    <div
                      key={worker.id}
                      className="border rounded-lg p-3 space-y-2 active:bg-muted/50 transition-colors"
                      onClick={() => openWorkerDetail(worker as PortalWorker)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate">{worker.full_name}</p>
                          {worker.full_name_ar && (
                            <p className="text-sm text-muted-foreground truncate">{worker.full_name_ar}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {blacklistedIds?.has(worker.national_id) && (
                            <Badge variant="destructive" className="gap-1 text-xs">
                              <ShieldAlert className="h-3 w-3" />
                            </Badge>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingWorker(worker as PortalWorker);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm text-muted-foreground font-mono">{worker.national_id}</span>
                        {getStatusBadge(worker.approval_status, worker.edit_pending_approval)}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {company && (
          <>
            <ContractorWorkerForm
              open={isFormOpen}
              onOpenChange={setIsFormOpen}
              companyId={company.id}
              companyName={company.company_name}
              blacklistedIds={blacklistedIds}
            />
            <ContractorWorkerEditForm
              open={!!editingWorker}
              onOpenChange={(open) => !open && setEditingWorker(null)}
              worker={editingWorker}
              companyId={company.id}
            />
            <ContractorWorkerBulkImport
              open={isBulkImportOpen}
              onOpenChange={setIsBulkImportOpen}
              companyId={company.id}
            />
          </>
        )}

        <WorkerDetailDialog
          open={!!selectedWorker}
          onOpenChange={(open) => !open && setSelectedWorker(null)}
          worker={selectedWorker}
          readOnly
        />
      </div>
    </ContractorPortalLayout>
  );
}

export default function ContractorPortalWorkers() {
  return (
    <ContractorPortalRoute>
      <ContractorPortalWorkersContent />
    </ContractorPortalRoute>
  );
}
