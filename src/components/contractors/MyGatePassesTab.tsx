import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Search, Plus, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useMyGatePasses } from "@/hooks/contractor-management/use-my-gate-passes";
import { useContractorProjects } from "@/hooks/contractor-management/use-contractor-projects";
import { GatePassListTable } from "./GatePassListTable";
import { GatePassFormDialog } from "./GatePassFormDialog";

interface MyGatePassesTabProps {
  onRequestNew?: () => void;
}

export function MyGatePassesTab({ onRequestNew }: MyGatePassesTabProps) {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const { data: myPasses = [], isLoading } = useMyGatePasses({
    search: search || undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
  });

  const statusCounts = {
    pending_pm_approval: myPasses.filter((p) => p.status === "pending_pm_approval").length,
    pending_safety_approval: myPasses.filter((p) => p.status === "pending_safety_approval").length,
    approved: myPasses.filter((p) => p.status === "approved").length,
    rejected: myPasses.filter((p) => p.status === "rejected").length,
    completed: myPasses.filter((p) => p.status === "completed").length,
  };

  const handleRequestNew = () => {
    if (onRequestNew) {
      onRequestNew();
    } else {
      setShowCreateDialog(true);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              {t("contractors.gatePasses.myPasses.title", "My Gate Passes")}
            </CardTitle>
            <CardDescription>
              {t("contractors.gatePasses.myPasses.description", "Gate passes you have requested")}
            </CardDescription>
          </div>
          <Button onClick={handleRequestNew} className="gap-2">
            <Plus className="h-4 w-4" />
            {t("contractors.gatePasses.myPasses.requestNew", "Request New Pass")}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Summary Badges */}
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="gap-1">
            {t("contractors.gatePasses.status.pendingPm", "Pending PM")}
            <span className="font-bold">{statusCounts.pending_pm_approval}</span>
          </Badge>
          <Badge variant="outline" className="gap-1">
            {t("contractors.gatePasses.status.pendingSafety", "Pending Safety")}
            <span className="font-bold">{statusCounts.pending_safety_approval}</span>
          </Badge>
          <Badge variant="outline" className="gap-1 text-green-600 border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800">
            {t("contractors.gatePasses.status.approved", "Approved")}
            <span className="font-bold">{statusCounts.approved}</span>
          </Badge>
          <Badge variant="outline" className="gap-1 text-red-600 border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-800">
            {t("contractors.gatePasses.status.rejected", "Rejected")}
            <span className="font-bold">{statusCounts.rejected}</span>
          </Badge>
          <Badge variant="outline" className="gap-1">
            {t("contractors.gatePasses.status.completed", "Completed")}
            <span className="font-bold">{statusCounts.completed}</span>
          </Badge>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="relative">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("contractors.gatePasses.searchPlaceholder", "Search by reference, material, vehicle...")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="ps-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder={t("common.status", "Status")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("common.allStatuses", "All Statuses")}</SelectItem>
              <SelectItem value="pending_pm_approval">{t("contractors.gatePasses.status.pendingPm", "Pending PM")}</SelectItem>
              <SelectItem value="pending_safety_approval">{t("contractors.gatePasses.status.pendingSafety", "Pending Safety")}</SelectItem>
              <SelectItem value="approved">{t("contractors.gatePasses.status.approved", "Approved")}</SelectItem>
              <SelectItem value="rejected">{t("contractors.gatePasses.status.rejected", "Rejected")}</SelectItem>
              <SelectItem value="completed">{t("contractors.gatePasses.status.completed", "Completed")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Data Table */}
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : myPasses.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>{t("contractors.gatePasses.myPasses.noPasses", "You haven't requested any gate passes yet")}</p>
            <Button variant="outline" onClick={handleRequestNew} className="mt-4 gap-2">
              <Plus className="h-4 w-4" />
              {t("contractors.gatePasses.myPasses.requestNew", "Request New Pass")}
            </Button>
          </div>
        ) : (
          <GatePassListTable gatePasses={myPasses} isLoading={isLoading} />
        )}
      </CardContent>

      {/* Create Dialog - projects passed from hook */}
      <GatePassFormDialogWrapper
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
      />
    </Card>
  );
}

// Wrapper component to fetch projects
function GatePassFormDialogWrapper({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: projects = [] } = useContractorProjects({ status: "active" });
  return (
    <GatePassFormDialog
      open={open}
      onOpenChange={onOpenChange}
      projects={projects}
    />
  );
}
