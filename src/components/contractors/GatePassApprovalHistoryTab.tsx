import { useState } from "react";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import { History, Search, CheckCircle, XCircle, Filter } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useGatePassDetails } from "@/hooks/contractor-management/use-gate-pass-details";
import { useGatePassApprovalHistory, ApprovalHistoryPass } from "@/hooks/contractor-management/use-my-gate-passes";
import { GatePassDetailDialog } from "./GatePassDetailDialog";

export function GatePassApprovalHistoryTab() {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === "rtl";
  const dateLocale = isRTL ? ar : enUS;

  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState<"all" | "approved" | "rejected">("all");
  const [selectedPass, setSelectedPass] = useState<ApprovalHistoryPass | null>(null);

  const { data: historyPasses = [], isLoading } = useGatePassApprovalHistory();

  // Filter passes
  const filteredPasses = historyPasses.filter((pass) => {
    // Action filter
    if (actionFilter !== "all" && pass.approvalAction !== actionFilter) {
      return false;
    }
    // Search filter
    if (search) {
      const searchLower = search.toLowerCase();
      return (
        pass.reference_number.toLowerCase().includes(searchLower) ||
        pass.material_description.toLowerCase().includes(searchLower) ||
        pass.requester?.full_name?.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  const approvedCount = historyPasses.filter((p) => p.approvalAction === "approved").length;
  const rejectedCount = historyPasses.filter((p) => p.approvalAction === "rejected").length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5 text-primary" />
          {t("contractors.gatePasses.history.title", "Approval History")}
        </CardTitle>
        <CardDescription>
          {t("contractors.gatePasses.history.description", "Gate passes you have approved or rejected")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Badges */}
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="gap-1 text-green-600 border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800">
            <CheckCircle className="h-3 w-3" />
            {t("contractors.gatePasses.history.approvedBy", "Approved by you")}
            <span className="font-bold">{approvedCount}</span>
          </Badge>
          <Badge variant="outline" className="gap-1 text-red-600 border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-800">
            <XCircle className="h-3 w-3" />
            {t("contractors.gatePasses.history.rejectedBy", "Rejected by you")}
            <span className="font-bold">{rejectedCount}</span>
          </Badge>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="relative">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("contractors.gatePasses.searchPlaceholder", "Search by reference, material...")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="ps-9"
            />
          </div>
          <Select value={actionFilter} onValueChange={(v) => setActionFilter(v as typeof actionFilter)}>
            <SelectTrigger>
              <Filter className="h-4 w-4 me-2" />
              <SelectValue placeholder={t("contractors.gatePasses.history.action", "Action")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("common.all", "All")}</SelectItem>
              <SelectItem value="approved">{t("common.approved", "Approved")}</SelectItem>
              <SelectItem value="rejected">{t("common.rejected", "Rejected")}</SelectItem>
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
        ) : filteredPasses.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <History className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>{t("contractors.gatePasses.history.noHistory", "No approval history")}</p>
          </div>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("contractors.gatePasses.reference", "Reference")}</TableHead>
                  <TableHead>{t("contractors.gatePasses.material", "Material")}</TableHead>
                  <TableHead>{t("contractors.gatePasses.requester", "Requester")}</TableHead>
                  <TableHead>{t("contractors.gatePasses.history.action", "Action")}</TableHead>
                  <TableHead>{t("contractors.gatePasses.history.actionDate", "Date")}</TableHead>
                  <TableHead>{t("contractors.gatePasses.status.label", "Current Status")}</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPasses.map((pass) => (
                  <TableRow key={pass.id}>
                    <TableCell className="font-mono text-sm">{pass.reference_number}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{pass.material_description}</TableCell>
                    <TableCell>{pass.requester?.full_name || "-"}</TableCell>
                    <TableCell>
                      <Badge
                        variant={pass.approvalAction === "approved" ? "default" : "destructive"}
                        className="gap-1"
                      >
                        {pass.approvalAction === "approved" ? (
                          <CheckCircle className="h-3 w-3" />
                        ) : (
                          <XCircle className="h-3 w-3" />
                        )}
                        {pass.approvalAction === "approved"
                          ? t("common.approved", "Approved")
                          : t("common.rejected", "Rejected")}
                        {pass.approvalAction === "approved" && (
                          <span className="text-[10px] opacity-75">
                            ({pass.approvalRole === "pm" ? "PM" : "Safety"})
                          </span>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {pass.approvalAt
                        ? format(new Date(pass.approvalAt), "dd MMM yyyy HH:mm", { locale: dateLocale })
                        : "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{pass.status.replace(/_/g, " ")}</Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedPass(pass)}
                      >
                        {t("common.view", "View")}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {/* Detail Dialog - Need to fetch full pass data for the dialog */}
      <GatePassDetailDialogWrapper
        passId={selectedPass?.id || null}
        open={!!selectedPass}
        onOpenChange={(open) => !open && setSelectedPass(null)}
      />
    </Card>
  );
}

// Wrapper to fetch full pass details for dialog
function GatePassDetailDialogWrapper({
  passId,
  open,
  onOpenChange,
}: {
  passId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: pass } = useGatePassDetails(passId || "");
  return (
    <GatePassDetailDialog
      pass={pass || null}
      open={open}
      onOpenChange={onOpenChange}
    />
  );
}
