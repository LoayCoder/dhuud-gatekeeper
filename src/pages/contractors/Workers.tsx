import { useState, useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { HardHat, Plus, Search, Filter, Clock, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { WorkerListTable } from "@/components/contractors/WorkerListTable";
import { WorkerFormDialog } from "@/components/contractors/WorkerFormDialog";
import { WorkerApprovalQueue } from "@/components/contractors/WorkerApprovalQueue";
import { WorkerSecurityApprovalQueue } from "@/components/contractors/WorkerSecurityApprovalQueue";
import { WorkerBulkImportDialog } from "@/components/contractors/WorkerBulkImportDialog";
import { WorkerBulkActionsToolbar } from "@/components/contractors/WorkerBulkActionsToolbar";
import { BulkRejectDialog } from "@/components/contractors/BulkRejectDialog";
import { AddWorkerToBlacklistDialog } from "@/components/contractors/AddWorkerToBlacklistDialog";
import { WorkerBulkMessageDialog } from "@/components/contractors/WorkerBulkMessageDialog";
import { WorkerBulkInductionDialog } from "@/components/contractors/WorkerBulkInductionDialog";
import { DeleteWorkerDialog } from "@/components/contractors/DeleteWorkerDialog";
import { ChangeWorkerStatusDialog } from "@/components/contractors/ChangeWorkerStatusDialog";
import {
  useContractorWorkers,
  usePendingWorkerApprovals,
  usePendingSecurityApprovals,
  useBulkApproveWorkers,
  useBulkRejectWorkers,
  useDeleteContractorWorker,
  useUpdateWorkerStatus,
  ContractorWorker,
} from "@/hooks/contractor-management/use-contractor-workers";
import { useContractorCompanies } from "@/hooks/contractor-management/use-contractor-companies";
import { useSecurityBlacklist, useAddToBlacklist } from "@/hooks/use-security-blacklist";
import { ShieldCheck } from "lucide-react";

export default function Workers() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const initialStatus = searchParams.get("status") || "all";
  
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>(initialStatus);
  
  // Sync status filter with URL params
  useEffect(() => {
    const urlStatus = searchParams.get("status");
    if (urlStatus && urlStatus !== statusFilter) {
      setStatusFilter(urlStatus);
    }
  }, [searchParams]);
  const [companyFilter, setCompanyFilter] = useState<string>("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [editingWorker, setEditingWorker] = useState<ContractorWorker | null>(null);
  const [activeTab, setActiveTab] = useState("all");
  const [selectedWorkerIds, setSelectedWorkerIds] = useState<string[]>([]);
  const [isBulkRejectOpen, setIsBulkRejectOpen] = useState(false);
  const [isBlacklistDialogOpen, setIsBlacklistDialogOpen] = useState(false);
  const [isBulkMessageOpen, setIsBulkMessageOpen] = useState(false);
  const [isBulkInductionOpen, setIsBulkInductionOpen] = useState(false);
  
  // Individual worker action states
  const [workerToDelete, setWorkerToDelete] = useState<ContractorWorker | null>(null);
  const [workerToChangeStatus, setWorkerToChangeStatus] = useState<ContractorWorker | null>(null);
  const [pendingStatusChange, setPendingStatusChange] = useState<string>("");
  const [workerToBlacklist, setWorkerToBlacklist] = useState<ContractorWorker | null>(null);

  const { data: workers = [], isLoading } = useContractorWorkers({
    search: search || undefined,
    approvalStatus: statusFilter !== "all" ? statusFilter : undefined,
    companyId: companyFilter !== "all" ? companyFilter : undefined,
  });

  const { data: pendingApprovals = [] } = usePendingWorkerApprovals();
  const { data: pendingSecurityApprovals = [] } = usePendingSecurityApprovals();
  const { data: companies = [] } = useContractorCompanies({ status: "active" });
  const { data: blacklistEntries = [] } = useSecurityBlacklist();
  
  const bulkApprove = useBulkApproveWorkers();
  const bulkReject = useBulkRejectWorkers();
  const addToBlacklist = useAddToBlacklist();
  const deleteWorker = useDeleteContractorWorker();
  const updateWorkerStatus = useUpdateWorkerStatus();

  // Create blacklist lookup maps
  const blacklistedIds = useMemo(
    () => blacklistEntries.map(e => e.national_id),
    [blacklistEntries]
  );
  const blacklistReasons = useMemo(
    () => Object.fromEntries(blacklistEntries.map(e => [e.national_id, e.reason || ""])),
    [blacklistEntries]
  );

  const selectedWorkers = useMemo(
    () => workers.filter(w => selectedWorkerIds.includes(w.id)),
    [workers, selectedWorkerIds]
  );

  const handleBulkApprove = () => {
    // Filter out blacklisted workers
    const nonBlacklistedIds = selectedWorkerIds.filter(id => {
      const worker = workers.find(w => w.id === id);
      return worker && !blacklistedIds.includes(worker.national_id);
    });
    
    if (nonBlacklistedIds.length === 0) return;
    bulkApprove.mutate(nonBlacklistedIds, {
      onSuccess: () => setSelectedWorkerIds([]),
    });
  };

  const handleBulkReject = (reason: string, shouldBlacklist: boolean) => {
    bulkReject.mutate(
      { workerIds: selectedWorkerIds, reason },
      {
        onSuccess: async () => {
          if (shouldBlacklist) {
            for (const worker of selectedWorkers) {
              await addToBlacklist.mutateAsync({
                full_name: worker.full_name,
                national_id: worker.national_id,
                reason,
              });
            }
          }
          setSelectedWorkerIds([]);
          setIsBulkRejectOpen(false);
        },
      }
    );
  };

  // Individual worker action handlers
  const handleStatusChange = (worker: ContractorWorker, status: string) => {
    setWorkerToChangeStatus(worker);
    setPendingStatusChange(status);
  };

  const handleConfirmStatusChange = (status: string, reason?: string) => {
    if (!workerToChangeStatus) return;
    updateWorkerStatus.mutate(
      { workerId: workerToChangeStatus.id, status, reason },
      {
        onSuccess: () => {
          setWorkerToChangeStatus(null);
          setPendingStatusChange("");
        },
      }
    );
  };

  const handleAddToBlacklist = (worker: ContractorWorker) => {
    setWorkerToBlacklist(worker);
  };

  const handleDeleteWorker = () => {
    if (!workerToDelete) return;
    deleteWorker.mutate(workerToDelete.id, {
      onSuccess: () => setWorkerToDelete(null),
    });
  };

  // Always enable selection for bulk actions (messaging, approve, reject)
  const showSelection = true;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <HardHat className="h-6 w-6" />
            {t("contractors.workers.title", "Contractor Workers")}
          </h1>
          <p className="text-muted-foreground">
            {t("contractors.workers.description", "Manage contractor workers and approvals")}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsBulkImportOpen(true)}>
            <Upload className="h-4 w-4 me-2" />
            {t("contractors.workers.bulkImport", "Bulk Import")}
          </Button>
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="h-4 w-4 me-2" />
            {t("contractors.workers.addWorker", "Add Worker")}
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(val) => { setActiveTab(val); setSelectedWorkerIds([]); }}>
        <TabsList>
          <TabsTrigger value="all">
            {t("contractors.workers.allWorkers", "All Workers")}
          </TabsTrigger>
          <TabsTrigger value="pending" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            {t("contractors.workers.pendingApprovals", "Pending Approvals")}
            {pendingApprovals.length > 0 && (
              <Badge variant="destructive" className="ms-1">
                {pendingApprovals.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" />
            {t("contractors.workers.securityApprovals", "Security Approvals")}
            {pendingSecurityApprovals.length > 0 && (
              <Badge variant="default" className="ms-1">
                {pendingSecurityApprovals.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">
          <Card>
            <CardHeader className="pb-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t("contractors.workers.searchPlaceholder", "Search workers...")}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="ps-9"
                  />
                </div>
                <div className="flex gap-2">
                  <Select value={companyFilter} onValueChange={setCompanyFilter}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder={t("contractors.workers.company", "Company")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("common.all", "All Companies")}</SelectItem>
                      {companies.map((company) => (
                        <SelectItem key={company.id} value={company.id}>
                          {company.company_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={statusFilter} onValueChange={(val) => { setStatusFilter(val); setSelectedWorkerIds([]); }}>
                    <SelectTrigger className="w-[150px]">
                      <Filter className="h-4 w-4 me-2" />
                      <SelectValue placeholder={t("common.status", "Status")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("common.all", "All")}</SelectItem>
                      <SelectItem value="pending">{t("contractors.workerStatus.pending", "Pending")}</SelectItem>
                      <SelectItem value="approved">{t("contractors.workerStatus.approved", "Approved")}</SelectItem>
                      <SelectItem value="rejected">{t("contractors.workerStatus.rejected", "Rejected")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {showSelection && (
                <WorkerBulkActionsToolbar
                  selectedCount={selectedWorkerIds.length}
                  onApprove={handleBulkApprove}
                  onReject={() => setIsBulkRejectOpen(true)}
                  onAddToBlacklist={() => setIsBlacklistDialogOpen(true)}
                  onSendMessage={() => setIsBulkMessageOpen(true)}
                  onSendInduction={() => setIsBulkInductionOpen(true)}
                  onClear={() => setSelectedWorkerIds([])}
                  isApproving={bulkApprove.isPending}
                  showBlacklist={selectedWorkerIds.length > 0}
                  showMessage={selectedWorkerIds.length > 0}
                  showInduction={selectedWorkerIds.length > 0}
                />
              )}
              <WorkerListTable
                workers={workers}
                isLoading={isLoading}
                onEdit={(worker) => setEditingWorker(worker)}
                onStatusChange={handleStatusChange}
                onAddToBlacklist={handleAddToBlacklist}
                onDelete={(worker) => setWorkerToDelete(worker)}
                selectedIds={selectedWorkerIds}
                onSelectionChange={setSelectedWorkerIds}
                showSelection={showSelection}
                blacklistedIds={blacklistedIds}
                blacklistReasons={blacklistReasons}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pending" className="mt-4">
          <WorkerApprovalQueue 
            workers={pendingApprovals} 
            blacklistedIds={blacklistedIds}
            blacklistReasons={blacklistReasons}
          />
        </TabsContent>

        <TabsContent value="security" className="mt-4">
          <WorkerSecurityApprovalQueue />
        </TabsContent>
      </Tabs>

      <WorkerFormDialog
        open={isCreateOpen || !!editingWorker}
        onOpenChange={(open) => {
          if (!open) {
            setIsCreateOpen(false);
            setEditingWorker(null);
          }
        }}
        worker={editingWorker}
        companies={companies}
      />

      <WorkerBulkImportDialog
        open={isBulkImportOpen}
        onOpenChange={setIsBulkImportOpen}
      />

      <BulkRejectDialog
        open={isBulkRejectOpen}
        onOpenChange={setIsBulkRejectOpen}
        selectedCount={selectedWorkerIds.length}
        onConfirm={handleBulkReject}
        isPending={bulkReject.isPending}
      />

      <AddWorkerToBlacklistDialog
        open={isBlacklistDialogOpen || !!workerToBlacklist}
        onOpenChange={(open) => {
          if (!open) {
            setIsBlacklistDialogOpen(false);
            setWorkerToBlacklist(null);
          }
        }}
        workers={workerToBlacklist ? [workerToBlacklist] : selectedWorkers}
      />

      <DeleteWorkerDialog
        open={!!workerToDelete}
        onOpenChange={(open) => !open && setWorkerToDelete(null)}
        worker={workerToDelete}
        onConfirm={handleDeleteWorker}
        isPending={deleteWorker.isPending}
      />

      <ChangeWorkerStatusDialog
        open={!!workerToChangeStatus}
        onOpenChange={(open) => {
          if (!open) {
            setWorkerToChangeStatus(null);
            setPendingStatusChange("");
          }
        }}
        worker={workerToChangeStatus}
        initialStatus={pendingStatusChange}
        onConfirm={handleConfirmStatusChange}
        isPending={updateWorkerStatus.isPending}
      />

      <WorkerBulkMessageDialog
        open={isBulkMessageOpen}
        onOpenChange={setIsBulkMessageOpen}
        workers={selectedWorkers}
      />

      <WorkerBulkInductionDialog
        open={isBulkInductionOpen}
        onOpenChange={setIsBulkInductionOpen}
        workers={selectedWorkers}
      />
    </div>
  );
}
