import { useState } from "react";
import { useTranslation } from "react-i18next";
import { History, Filter } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ContractorPortalRoute } from "@/components/access-control/ContractorPortalRoute";
import ContractorPortalLayout from "@/components/contractor-portal/ContractorPortalLayout";
import { ContractorAuditLogTable } from "@/components/contractor-portal/ContractorAuditLogTable";
import { useContractorPortalAuditLogs, type AuditLogFilters } from "@/hooks/contractor-management/use-contractor-portal-audit-logs";

const actionOptions = [
  { value: "all", labelKey: "contractorPortal.activityLog.allActions" },
  { value: "worker_created", labelKey: "contractorPortal.activityLog.actions.worker_created" },
  { value: "worker_approved", labelKey: "contractorPortal.activityLog.actions.worker_approved" },
  { value: "worker_rejected", labelKey: "contractorPortal.activityLog.actions.worker_rejected" },
  { value: "worker_edited_by_rep", labelKey: "contractorPortal.activityLog.actions.worker_edited_by_rep" },
  { value: "gate_pass_requested", labelKey: "contractorPortal.activityLog.actions.gate_pass_requested" },
  { value: "gate_pass_approved", labelKey: "contractorPortal.activityLog.actions.gate_pass_approved" },
  { value: "gate_pass_rejected", labelKey: "contractorPortal.activityLog.actions.gate_pass_rejected" },
];

function ActivityLogContent() {
  const { t } = useTranslation();
  const [filters, setFilters] = useState<AuditLogFilters>({});

  const { data: logs = [], isLoading } = useContractorPortalAuditLogs(filters);

  const handleActionChange = (value: string) => {
    setFilters((prev) => ({
      ...prev,
      action: value === "all" ? undefined : value,
    }));
  };

  return (
    <ContractorPortalLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <History className="h-6 w-6" />
            {t("contractorPortal.activityLog.title", "Activity Log")}
          </h1>
          <p className="text-muted-foreground">
            {t(
              "contractorPortal.activityLog.description",
              "View all actions related to your workers and requests"
            )}
          </p>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle>{t("contractorPortal.activityLog.recentActivity", "Recent Activity")}</CardTitle>
                <CardDescription>
                  {t("contractorPortal.activityLog.logsCount", "{{count}} logs", { count: logs.length })}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Select
                  value={filters.action || "all"}
                  onValueChange={handleActionChange}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue
                      placeholder={t("contractorPortal.activityLog.filterByAction", "Filter by action")}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {actionOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {t(option.labelKey, option.value.replace(/_/g, " "))}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ContractorAuditLogTable logs={logs} isLoading={isLoading} />
          </CardContent>
        </Card>
      </div>
    </ContractorPortalLayout>
  );
}

export default function ContractorPortalActivityLog() {
  return (
    <ContractorPortalRoute>
      <ActivityLogContent />
    </ContractorPortalRoute>
  );
}
