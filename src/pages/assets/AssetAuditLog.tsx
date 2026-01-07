import { useState } from "react";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import {
  History,
  Search,
  Filter,
  Eye,
  Plus,
  Edit,
  Trash2,
  MapPin,
  Download,
  ChevronLeft,
  ChevronRight,
  Loader2,
  FileWarning,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  useAssetAuditLogViewer,
  useAssetAuditLogStats,
  useAuditLogActors,
  AssetAuditLogEntry,
  AuditLogFilters,
} from "@/hooks/use-asset-audit-log-viewer";
import { AuditLogChangeDialog } from "@/components/assets/AuditLogChangeDialog";

const PAGE_SIZE = 20;

export default function AssetAuditLog() {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === "rtl";
  const dateLocale = i18n.language === "ar" ? ar : enUS;

  // State
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<AuditLogFilters>({});
  const [searchInput, setSearchInput] = useState("");
  const [selectedLog, setSelectedLog] = useState<AssetAuditLogEntry | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  // Data
  const { data: logsData, isLoading } = useAssetAuditLogViewer(filters, page, PAGE_SIZE);
  const { data: stats } = useAssetAuditLogStats(7);
  const { data: actors } = useAuditLogActors();

  const logs = logsData?.data || [];
  const totalCount = logsData?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const getActionIcon = (action: string) => {
    switch (action) {
      case "created":
        return <Plus className="h-4 w-4 text-green-600" />;
      case "updated":
        return <Edit className="h-4 w-4 text-blue-600" />;
      case "deleted":
        return <Trash2 className="h-4 w-4 text-red-600" />;
      case "location_changed":
        return <MapPin className="h-4 w-4 text-amber-600" />;
      default:
        return <History className="h-4 w-4 text-gray-600" />;
    }
  };

  const getActionBadge = (action: string) => {
    const variants: Record<string, string> = {
      created: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      updated: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      deleted: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
      location_changed: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
    };
    return variants[action] || "bg-gray-100 text-gray-800";
  };

  const handleSearch = () => {
    setFilters((prev) => ({ ...prev, search: searchInput }));
    setPage(1);
  };

  const handleFilterChange = (key: keyof AuditLogFilters, value: string | undefined) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value === "all" ? undefined : value,
    }));
    setPage(1);
  };

  const handleViewDetails = (log: AssetAuditLogEntry) => {
    setSelectedLog(log);
    setDetailsOpen(true);
  };

  const clearFilters = () => {
    setFilters({});
    setSearchInput("");
    setPage(1);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <History className="h-6 w-6 text-primary" />
            {t("assets.auditLog.title")}
          </h1>
          <p className="text-muted-foreground">{t("assets.auditLog.description")}</p>
        </div>
        <Button variant="outline" disabled>
          <Download className="h-4 w-4 me-2" />
          {t("assets.auditLog.export")}
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold">{stats.totalChanges}</div>
              <p className="text-sm text-muted-foreground">{t("assets.auditLog.stats.totalChanges")}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-green-600">{stats.created}</div>
              <p className="text-sm text-muted-foreground">{t("assets.auditLog.stats.created")}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-blue-600">{stats.updated}</div>
              <p className="text-sm text-muted-foreground">{t("assets.auditLog.stats.updated")}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-red-600">{stats.deleted}</div>
              <p className="text-sm text-muted-foreground">{t("assets.auditLog.stats.deleted")}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-amber-600">{stats.locationChanged}</div>
              <p className="text-sm text-muted-foreground">{t("assets.auditLog.stats.locationChanged")}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-4 w-4" />
            {t("common.filters")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {/* Search */}
            <div className="md:col-span-2 flex gap-2">
              <Input
                placeholder={t("assets.auditLog.filters.search")}
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="flex-1"
              />
              <Button variant="secondary" onClick={handleSearch}>
                <Search className="h-4 w-4" />
              </Button>
            </div>

            {/* Action Type */}
            <Select
              value={filters.action || "all"}
              onValueChange={(val) => handleFilterChange("action", val)}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("assets.auditLog.filters.action")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("assets.auditLog.filters.allActions")}</SelectItem>
                <SelectItem value="created">{t("assets.auditLog.actions.created")}</SelectItem>
                <SelectItem value="updated">{t("assets.auditLog.actions.updated")}</SelectItem>
                <SelectItem value="deleted">{t("assets.auditLog.actions.deleted")}</SelectItem>
                <SelectItem value="location_changed">{t("assets.auditLog.actions.location_changed")}</SelectItem>
              </SelectContent>
            </Select>

            {/* Actor */}
            <Select
              value={filters.actorId || "all"}
              onValueChange={(val) => handleFilterChange("actorId", val)}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("assets.auditLog.filters.actor")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("assets.auditLog.filters.allActors")}</SelectItem>
                {actors?.map((actor) => (
                  <SelectItem key={actor.id} value={actor.id}>
                    {actor.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Clear Filters */}
            <Button variant="ghost" onClick={clearFilters}>
              {t("common.clearFilters", "Clear Filters")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <FileWarning className="h-12 w-12 mb-4" />
              <p>{t("assets.auditLog.noLogs")}</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("assets.auditLog.table.timestamp")}</TableHead>
                    <TableHead>{t("assets.auditLog.table.asset")}</TableHead>
                    <TableHead>{t("assets.auditLog.table.action")}</TableHead>
                    <TableHead>{t("assets.auditLog.table.actor")}</TableHead>
                    <TableHead className="text-end">{t("common.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap">
                        {format(new Date(log.created_at), "PP p", { locale: dateLocale })}
                      </TableCell>
                      <TableCell>
                        <div>
                          <span className="font-mono text-sm">{log.asset_code}</span>
                          <p className="text-sm text-muted-foreground">{log.asset_name}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${getActionBadge(log.action)} gap-1`}>
                          {getActionIcon(log.action)}
                          {t(`assets.auditLog.actions.${log.action}`, log.action)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {log.actor_name || (
                          <span className="text-muted-foreground">{t("assets.auditLog.details.system")}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewDetails(log)}
                        >
                          <Eye className="h-4 w-4 me-1" />
                          {t("assets.auditLog.table.viewDetails")}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              <div className="flex items-center justify-between px-4 py-3 border-t">
                <p className="text-sm text-muted-foreground">
                  {t("common.showingOf", {
                    from: (page - 1) * PAGE_SIZE + 1,
                    to: Math.min(page * PAGE_SIZE, totalCount),
                    total: totalCount,
                    defaultValue: `Showing ${(page - 1) * PAGE_SIZE + 1}-${Math.min(page * PAGE_SIZE, totalCount)} of ${totalCount}`,
                  })}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                  >
                    {isRTL ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                  </Button>
                  <span className="text-sm">
                    {t("common.pageOf", { page, total: totalPages, defaultValue: `Page ${page} of ${totalPages}` })}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                  >
                    {isRTL ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <AuditLogChangeDialog
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        log={selectedLog}
      />
    </div>
  );
}
