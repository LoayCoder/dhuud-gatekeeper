import { useState } from "react";
import { useTranslation } from "react-i18next";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { PTWPermit } from "@/features/ptw/hooks/use-ptw-permits";
import { format } from "date-fns";
import { 
  Search, 
  Flame, 
  Construction, 
  Shield, 
  Shovel, 
  Radiation, 
  Zap, 
  Mountain,
  FileWarning,
  Eye,
  MapPin
} from "lucide-react";

interface PermitListViewProps {
  permits: PTWPermit[];
  isLoading: boolean;
}

const permitTypeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  HOT_WORK: Flame,
  LIFTING: Construction,
  CONFINED_SPACE: Shield,
  EXCAVATION: Shovel,
  RADIOGRAPHY: Radiation,
  ELECTRICAL: Zap,
  HEIGHT: Mountain,
};

const statusVariants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  requested: "outline",
  endorsed: "secondary",
  issued: "default",
  activated: "default",
  suspended: "destructive",
  closed: "secondary",
  cancelled: "destructive",
};

export function PermitListView({ permits, isLoading }: PermitListViewProps) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar" || i18n.language === "ur";
  
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  // Filter permits
  const filteredPermits = permits.filter((permit: any) => {
    const matchesSearch = 
      permit.reference_id?.toLowerCase().includes(search.toLowerCase()) ||
      permit.job_description?.toLowerCase().includes(search.toLowerCase()) ||
      permit.project?.name?.toLowerCase().includes(search.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || permit.status === statusFilter;
    const matchesType = typeFilter === "all" || permit.permit_type?.code === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  // Get unique types from permits
  const permitTypes = [...new Set(permits.map((p: any) => p.permit_type?.code).filter(Boolean))];

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex gap-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-10 w-40" />
        </div>
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t("ptw.list.searchPlaceholder", "Search permits...")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ps-9"
          />
        </div>
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder={t("ptw.list.filterStatus", "Status")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("common.all", "All")}</SelectItem>
            <SelectItem value="requested">{t("ptw.status.requested", "Requested")}</SelectItem>
            <SelectItem value="endorsed">{t("ptw.status.endorsed", "Endorsed")}</SelectItem>
            <SelectItem value="issued">{t("ptw.status.issued", "Issued")}</SelectItem>
            <SelectItem value="activated">{t("ptw.status.activated", "Activated")}</SelectItem>
            <SelectItem value="suspended">{t("ptw.status.suspended", "Suspended")}</SelectItem>
            <SelectItem value="closed">{t("ptw.status.closed", "Closed")}</SelectItem>
          </SelectContent>
        </Select>

        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder={t("ptw.list.filterType", "Type")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("common.all", "All Types")}</SelectItem>
            {permitTypes.map((type) => (
              <SelectItem key={type} value={type!}>
                {type!.replace("_", " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Results count */}
      <p className="text-sm text-muted-foreground">
        {t("ptw.list.showing", "Showing {{count}} permits", { count: filteredPermits.length })}
      </p>

      {/* Table */}
      {filteredPermits.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileWarning className="h-12 w-12 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">
              {t("ptw.list.noPermits", "No permits found")}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Mobile Card Layout */}
          <div className="block md:hidden space-y-3">
            {filteredPermits.map((permit: any) => {
              const IconComponent = permitTypeIcons[permit.permit_type?.code || ""] || FileWarning;
              return (
                <Link
                  key={permit.id}
                  to={`/ptw/view/${permit.id}`}
                  className="block"
                >
                  <Card className="hover:bg-accent/50 transition-colors active:scale-[0.98]">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-full bg-muted shrink-0">
                          <IconComponent className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="font-medium text-sm break-words whitespace-normal">{permit.reference_id}</p>
                              <p className="text-xs text-muted-foreground break-words whitespace-normal">
                                {permit.permit_type?.name}
                              </p>
                            </div>
                            <Badge variant={statusVariants[permit.status] || "outline"} className="shrink-0">
                              {String(t(`ptw.status.${permit.status}`, permit.status))}
                            </Badge>
                          </div>
                          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                            {permit.project?.name && (
                              <span className="break-words">{permit.project.name}</span>
                            )}
                            {permit.planned_start_time && (
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {format(new Date(permit.planned_start_time), "MMM d, HH:mm")}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>

          {/* Desktop Table Layout */}
          <div className="hidden md:block border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("ptw.list.reference", "Reference")}</TableHead>
                  <TableHead>{t("ptw.list.type", "Type")}</TableHead>
                  <TableHead>{t("ptw.list.project", "Project")}</TableHead>
                  <TableHead className="hidden lg:table-cell">{t("ptw.list.location", "Location")}</TableHead>
                  <TableHead>{t("ptw.list.status", "Status")}</TableHead>
                  <TableHead>{t("ptw.list.planned", "Planned")}</TableHead>
                  <TableHead className="w-[100px]">{t("common.actions", "Actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPermits.map((permit: any) => {
                  const IconComponent = permitTypeIcons[permit.permit_type?.code || ""] || FileWarning;
                  return (
                    <TableRow key={permit.id}>
                      <TableCell>
                        <Link 
                          to={`/ptw/view/${permit.id}`} 
                          className="font-medium hover:underline text-primary"
                        >
                          {permit.reference_id}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <IconComponent className="h-4 w-4 text-muted-foreground" />
                          <span>{permit.permit_type?.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {permit.project?.name || "-"}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          <span className="truncate max-w-[200px]">
                            {permit.site?.name || permit.location_details || "-"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusVariants[permit.status] || "outline"}>
                          {String(t(`ptw.status.${permit.status}`, permit.status))}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {permit.planned_start_time ? format(new Date(permit.planned_start_time), "MMM d, HH:mm") : "-"}
                      </TableCell>
                      <TableCell>
                        <Button asChild variant="ghost" size="sm">
                          <Link to={`/ptw/view/${permit.id}`}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}
