import { useTranslation } from "react-i18next";
import { formatDistanceToNow, format } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ContractorPortalAuditLog } from "@/hooks/contractor-management/use-contractor-portal-audit-logs";

interface ContractorAuditLogTableProps {
  logs: ContractorPortalAuditLog[];
  isLoading: boolean;
}

const actionColors: Record<string, string> = {
  worker_created: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  worker_edited_by_rep: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  worker_approved: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  worker_rejected: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  worker_status_changed: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  worker_blacklisted: "bg-gray-800 text-white dark:bg-gray-700",
  worker_deleted: "bg-red-200 text-red-900 dark:bg-red-800 dark:text-red-100",
  worker_edit_approved: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  gate_pass_requested: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  gate_pass_approved: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  gate_pass_rejected: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

const actionIcons: Record<string, string> = {
  worker_created: "👤",
  worker_edited_by_rep: "✏️",
  worker_approved: "✅",
  worker_rejected: "❌",
  worker_status_changed: "🔄",
  worker_blacklisted: "🚫",
  worker_deleted: "🗑️",
  worker_edit_approved: "✓",
  gate_pass_requested: "📋",
  gate_pass_approved: "✅",
  gate_pass_rejected: "❌",
};

export function ContractorAuditLogTable({ logs, isLoading }: ContractorAuditLogTableProps) {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === "ar";
  const dateLocale = isRtl ? ar : enUS;

  const getActionLabel = (action: string) => {
    return t(`contractorPortal.activityLog.actions.${action}`, action.replace(/_/g, " "));
  };

  const getEntityLabel = (entityType: string) => {
    if (entityType === "contractor_worker") {
      return t("contractorPortal.activityLog.entityTypes.worker", "Worker");
    }
    if (entityType === "material_gate_pass") {
      return t("contractorPortal.activityLog.entityTypes.gatePass", "Gate Pass");
    }
    return entityType;
  };

  const formatDetails = (log: ContractorPortalAuditLog) => {
    const details: string[] = [];

    if (log.new_value) {
      if (log.new_value.full_name) {
        details.push(`${log.new_value.full_name}`);
      }
      if (log.new_value.approval_status) {
        details.push(`Status: ${log.new_value.approval_status}`);
      }
      if (log.new_value.rejection_reason) {
        details.push(`Reason: ${log.new_value.rejection_reason}`);
      }
    }

    return details.join(" | ") || "-";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <p>{t("contractorPortal.activityLog.noLogs", "No activity logs found")}</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[600px]">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-start">
              {t("contractorPortal.activityLog.columns.date", "Date")}
            </TableHead>
            <TableHead className="text-start">
              {t("contractorPortal.activityLog.columns.action", "Action")}
            </TableHead>
            <TableHead className="text-start">
              {t("contractorPortal.activityLog.columns.entity", "Entity")}
            </TableHead>
            <TableHead className="text-start">
              {t("contractorPortal.activityLog.columns.actor", "Performed By")}
            </TableHead>
            <TableHead className="text-start">
              {t("contractorPortal.activityLog.columns.details", "Details")}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.map((log) => (
            <TableRow key={log.id}>
              <TableCell className="whitespace-nowrap">
                <div className="flex flex-col">
                  <span className="text-sm font-medium">
                    {format(new Date(log.created_at), "PP", { locale: dateLocale })}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(log.created_at), {
                      addSuffix: true,
                      locale: dateLocale,
                    })}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <Badge className={actionColors[log.action] || "bg-muted text-muted-foreground"}>
                  <span className="me-1">{actionIcons[log.action] || "📝"}</span>
                  {getActionLabel(log.action)}
                </Badge>
              </TableCell>
              <TableCell>
                <span className="text-sm">{getEntityLabel(log.entity_type)}</span>
              </TableCell>
              <TableCell>
                <span className="text-sm">{log.actor_name || t("common.system", "System")}</span>
              </TableCell>
              <TableCell className="max-w-[200px] truncate">
                <span className="text-sm text-muted-foreground">{formatDetails(log)}</span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ScrollArea>
  );
}
