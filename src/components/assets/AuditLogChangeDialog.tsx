import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import { ArrowRight, User, Clock, MapPin, Package } from "lucide-react";
import { AssetAuditLogEntry } from "@/hooks/use-asset-audit-log-viewer";

interface AuditLogChangeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  log: AssetAuditLogEntry | null;
}

export function AuditLogChangeDialog({ open, onOpenChange, log }: AuditLogChangeDialogProps) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === "rtl";
  const dateLocale = i18n.language === "ar" ? ar : enUS;

  if (!log) return null;

  const getActionColor = (action: string) => {
    switch (action) {
      case "created":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "updated":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "deleted":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "location_changed":
        return "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  const getActionLabel = (action: string) => {
    return t(`assets.auditLog.actions.${action}`, action);
  };

  // Get all changed fields
  const getChangedFields = () => {
    const fields: { field: string; before: unknown; after: unknown }[] = [];
    const oldVal = log.old_value || {};
    const newVal = log.new_value || {};

    // Get all unique keys from both objects
    const allKeys = new Set([...Object.keys(oldVal), ...Object.keys(newVal)]);

    allKeys.forEach((key) => {
      const before = oldVal[key];
      const after = newVal[key];
      
      // Only show if values are different
      if (JSON.stringify(before) !== JSON.stringify(after)) {
        fields.push({ field: key, before, after });
      }
    });

    return fields;
  };

  const changedFields = getChangedFields();

  const formatValue = (value: unknown): string => {
    if (value === null || value === undefined) return "—";
    if (typeof value === "boolean") return value ? "✓" : "✗";
    if (typeof value === "object") return JSON.stringify(value, null, 2);
    return String(value);
  };

  const formatFieldName = (field: string): string => {
    // Convert snake_case to Title Case
    return field
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl" dir={i18n.dir()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            {t("assets.auditLog.details.title")}
          </DialogTitle>
        </DialogHeader>

        {/* Asset Info */}
        <div className="rounded-lg border bg-muted/30 p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <p className="text-sm text-muted-foreground">{t("assets.common.asset")}</p>
              <p className="font-medium">{log.asset_code}</p>
              <p className="text-sm text-muted-foreground">{log.asset_name}</p>
            </div>
            <Separator orientation="vertical" className="h-12" />
            <div>
              <p className="text-sm text-muted-foreground">{t("assets.auditLog.table.action")}</p>
              <Badge className={getActionColor(log.action)}>{getActionLabel(log.action)}</Badge>
            </div>
            <Separator orientation="vertical" className="h-12" />
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">{t("assets.auditLog.table.actor")}</p>
                <p className="font-medium">{log.actor_name || t("assets.auditLog.details.system")}</p>
              </div>
            </div>
            <Separator orientation="vertical" className="h-12" />
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">{t("assets.auditLog.table.timestamp")}</p>
                <p className="font-medium">
                  {format(new Date(log.created_at), "PPpp", { locale: dateLocale })}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Changes Table */}
        <div className="space-y-2">
          <h4 className="font-medium">{t("assets.auditLog.details.changes", "Changes")}</h4>
          
          {changedFields.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              {t("assets.auditLog.details.noChanges")}
            </p>
          ) : (
            <ScrollArea className="h-[300px] rounded-md border">
              <div className="p-4">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-start pb-2 font-medium text-sm text-muted-foreground w-1/4">
                        {t("assets.auditLog.details.field")}
                      </th>
                      <th className="text-start pb-2 font-medium text-sm text-muted-foreground w-5/12">
                        {t("assets.auditLog.details.before")}
                      </th>
                      <th className="text-start pb-2 font-medium text-sm text-muted-foreground w-5/12">
                        {t("assets.auditLog.details.after")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {changedFields.map((change, idx) => (
                      <tr key={idx} className="border-b last:border-0">
                        <td className="py-2 pe-4 align-top">
                          <span className="font-medium text-sm">{formatFieldName(change.field)}</span>
                        </td>
                        <td className="py-2 pe-2 align-top">
                          <code className="text-xs bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 px-2 py-1 rounded block whitespace-pre-wrap break-all">
                            {formatValue(change.before)}
                          </code>
                        </td>
                        <td className="py-2 align-top">
                          <code className="text-xs bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300 px-2 py-1 rounded block whitespace-pre-wrap break-all">
                            {formatValue(change.after)}
                          </code>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </ScrollArea>
          )}
        </div>

        {/* IP Address */}
        {log.ip_address && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span>{t("assets.auditLog.details.ipAddress")}: {log.ip_address}</span>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
