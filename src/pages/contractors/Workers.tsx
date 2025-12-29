import { useState } from "react";
import { useTranslation } from "react-i18next";
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
import { WorkerBulkImportDialog } from "@/components/contractors/WorkerBulkImportDialog";
import {
  useContractorWorkers,
  usePendingWorkerApprovals,
  ContractorWorker,
} from "@/hooks/contractor-management/use-contractor-workers";
import { useContractorCompanies } from "@/hooks/contractor-management/use-contractor-companies";

export default function Workers() {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [companyFilter, setCompanyFilter] = useState<string>("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [editingWorker, setEditingWorker] = useState<ContractorWorker | null>(null);
  const [activeTab, setActiveTab] = useState("all");

  const { data: workers = [], isLoading } = useContractorWorkers({
    search: search || undefined,
    approvalStatus: statusFilter !== "all" ? statusFilter : undefined,
    companyId: companyFilter !== "all" ? companyFilter : undefined,
  });

  const { data: pendingApprovals = [] } = usePendingWorkerApprovals();
  const { data: companies = [] } = useContractorCompanies({ status: "active" });

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

      <Tabs value={activeTab} onValueChange={setActiveTab}>
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
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
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
              <WorkerListTable
                workers={workers}
                isLoading={isLoading}
                onEdit={(worker) => setEditingWorker(worker)}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pending" className="mt-4">
          <WorkerApprovalQueue workers={pendingApprovals} />
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
    </div>
  );
}
