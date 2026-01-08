import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { Ticket, Plus, Search, Filter, Clock, CalendarCheck } from "lucide-react";
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
import { GatePassListTable } from "@/components/contractors/GatePassListTable";
import { GatePassFormDialog } from "@/components/contractors/GatePassFormDialog";
import { GatePassApprovalQueue } from "@/components/contractors/GatePassApprovalQueue";
import { TodayGatePasses } from "@/components/contractors/TodayGatePasses";
import {
  useMaterialGatePasses,
  usePendingGatePassApprovals,
  useTodayApprovedPasses,
  MaterialGatePass,
} from "@/hooks/contractor-management/use-material-gate-passes";
import { useContractorProjects } from "@/hooks/contractor-management/use-contractor-projects";

export default function GatePasses() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const initialStatus = searchParams.get("status") || "all";
  
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>(initialStatus);
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  
  // Sync status filter with URL params
  useEffect(() => {
    const urlStatus = searchParams.get("status");
    if (urlStatus && urlStatus !== statusFilter) {
      setStatusFilter(urlStatus);
    }
  }, [searchParams]);

  const { data: gatePasses = [], isLoading } = useMaterialGatePasses({
    search: search || undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
    projectId: projectFilter !== "all" ? projectFilter : undefined,
  });

  const { data: pendingApprovals = [] } = usePendingGatePassApprovals();
  const { data: todayPasses = [] } = useTodayApprovedPasses();
  const { data: projects = [] } = useContractorProjects({ status: "active" });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Ticket className="h-6 w-6" />
            {t("contractors.gatePasses.title", "Material Gate Passes")}
          </h1>
          <p className="text-muted-foreground">
            {t("contractors.gatePasses.description", "Manage material and equipment gate passes")}
          </p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="h-4 w-4 me-2" />
          {t("contractors.gatePasses.createPass", "Create Gate Pass")}
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">
            {t("contractors.gatePasses.allPasses", "All Passes")}
          </TabsTrigger>
          <TabsTrigger value="pending" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            {t("contractors.gatePasses.pendingApprovals", "Pending Approvals")}
            {pendingApprovals.length > 0 && (
              <Badge variant="destructive" className="ms-1">
                {pendingApprovals.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="today" className="flex items-center gap-2">
            <CalendarCheck className="h-4 w-4" />
            {t("contractors.gatePasses.todayPasses", "Today's Passes")}
            {todayPasses.length > 0 && (
              <Badge variant="secondary" className="ms-1">
                {todayPasses.length}
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
                    placeholder={t("contractors.gatePasses.searchPlaceholder", "Search passes...")}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="ps-9"
                  />
                </div>
                <div className="flex gap-2">
                  <Select value={projectFilter} onValueChange={setProjectFilter}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder={t("contractors.gatePasses.project", "Project")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("common.all", "All Projects")}</SelectItem>
                      {projects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.project_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[180px]">
                      <Filter className="h-4 w-4 me-2" />
                      <SelectValue placeholder={t("common.status", "Status")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("common.all", "All")}</SelectItem>
                      <SelectItem value="pending_pm_approval">{t("contractors.passStatus.pendingPM", "Pending PM")}</SelectItem>
                      <SelectItem value="pending_safety_approval">{t("contractors.passStatus.pendingSafety", "Pending Safety")}</SelectItem>
                      <SelectItem value="approved">{t("contractors.passStatus.approved", "Approved")}</SelectItem>
                      <SelectItem value="rejected">{t("contractors.passStatus.rejected", "Rejected")}</SelectItem>
                      <SelectItem value="completed">{t("contractors.passStatus.completed", "Completed")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <GatePassListTable
                gatePasses={gatePasses}
                isLoading={isLoading}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pending" className="mt-4">
          <GatePassApprovalQueue passes={pendingApprovals} />
        </TabsContent>

        <TabsContent value="today" className="mt-4">
          <TodayGatePasses passes={todayPasses} />
        </TabsContent>
      </Tabs>

      <GatePassFormDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        projects={projects}
      />
    </div>
  );
}
