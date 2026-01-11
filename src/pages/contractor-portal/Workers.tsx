import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Users, Search, CheckCircle, Clock, XCircle, AlertTriangle, Pencil, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import ContractorPortalLayout from "@/components/contractor-portal/ContractorPortalLayout";
import ContractorWorkerForm from "@/components/contractor-portal/ContractorWorkerForm";
import ContractorWorkerEditForm from "@/components/contractor-portal/ContractorWorkerEditForm";
import ContractorWorkerBulkImport from "@/components/contractor-portal/ContractorWorkerBulkImport";
import { useContractorPortalData } from "@/hooks/contractor-management";
import { ContractorPortalRoute } from "@/components/access-control";

interface PortalWorker {
  id: string;
  full_name: string;
  full_name_ar?: string | null;
  national_id: string;
  mobile_number: string;
  nationality?: string | null;
  preferred_language: string;
  approval_status: string;
  edit_pending_approval?: boolean;
}

function ContractorPortalWorkersContent() {
  const { t } = useTranslation();
  const { company, workers, isLoading } = useContractorPortalData();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingWorker, setEditingWorker] = useState<PortalWorker | null>(null);

  const filteredWorkers = workers?.filter(worker => 
    worker.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    worker.national_id.includes(searchQuery) ||
    worker.mobile_number.includes(searchQuery)
  ) || [];

  const getStatusBadge = (status: string, editPending?: boolean) => {
    // Show edit pending badge if applicable
    if (editPending && status === "approved") {
      return (
        <Badge variant="outline" className="border-amber-500 text-amber-600 dark:text-amber-400 gap-1">
          <AlertTriangle className="h-3 w-3" />
          {t("contractorPortal.workers.changesPendingReview", "Changes Pending Review")}
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
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Users className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">
                {t("contractorPortal.workers.title", "Workers")}
              </h1>
              <p className="text-muted-foreground">
                {t("contractorPortal.workers.description", "Manage your company's workers")}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setIsBulkImportOpen(true)}>
              <Upload className="h-4 w-4 me-2" />
              {t("contractorPortal.workers.bulkImport", "Bulk Import")}
            </Button>
            <Button onClick={() => setIsFormOpen(true)}>
              <Plus className="h-4 w-4 me-2" />
              {t("contractorPortal.workers.addWorker", "Add Worker")}
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t("common.search", "Search...")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="ps-9"
                />
              </div>
              <div className="text-sm text-muted-foreground">
                {filteredWorkers.length} {t("contractors.workers.title", "workers")}
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
                        <div>
                          <p className="font-medium">{worker.full_name}</p>
                          {worker.full_name_ar && (
                            <p className="text-sm text-muted-foreground">{worker.full_name_ar}</p>
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
            )}
          </CardContent>
        </Card>

        {company && (
          <>
            <ContractorWorkerForm
              open={isFormOpen}
              onOpenChange={setIsFormOpen}
              companyId={company.id}
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
      </div>
    </ContractorPortalLayout>
  );
}

// Wrapped export with access control
export default function ContractorPortalWorkers() {
  return (
    <ContractorPortalRoute>
      <ContractorPortalWorkersContent />
    </ContractorPortalRoute>
  );
}
