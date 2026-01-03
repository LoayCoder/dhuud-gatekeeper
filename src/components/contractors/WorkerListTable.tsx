import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { ShieldAlert, AlertTriangle, Building, ShieldCheck, HardHat } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ContractorWorker } from "@/hooks/contractor-management/use-contractor-workers";
import { WorkerDetailDialog } from "./WorkerDetailDialog";
import { WorkerActionsDropdown } from "./WorkerActionsDropdown";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { 
  getInductionExpiryStatus, 
  getDaysUntilExpiry, 
  InductionExpiryStatus 
} from "@/lib/induction-expiry-utils";
import { formatDate } from "@/lib/date-utils";
import { getNationalityLabel } from "@/lib/nationalities";

interface WorkerListTableProps {
  workers: ContractorWorker[];
  isLoading: boolean;
  onEdit: (worker: ContractorWorker) => void;
  onStatusChange: (worker: ContractorWorker, status: string) => void;
  onAddToBlacklist: (worker: ContractorWorker) => void;
  onDelete: (worker: ContractorWorker) => void;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
  showSelection?: boolean;
  blacklistedIds?: string[];
  blacklistReasons?: Record<string, string>;
}

export function WorkerListTable({ 
  workers, 
  isLoading, 
  onEdit,
  onStatusChange,
  onAddToBlacklist,
  onDelete,
  selectedIds = [],
  onSelectionChange,
  showSelection = false,
  blacklistedIds = [],
  blacklistReasons = {},
}: WorkerListTableProps) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';
  const [selectedWorker, setSelectedWorker] = useState<ContractorWorker | null>(null);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});

  // Fetch signed URLs for photos
  useEffect(() => {
    const fetchPhotoUrls = async () => {
      const workersWithPhotos = workers.filter((w) => w.photo_path);
      if (workersWithPhotos.length === 0) return;

      const urls: Record<string, string> = {};
      for (const worker of workersWithPhotos) {
        if (worker.photo_path) {
          const { data } = await supabase.storage
            .from("worker-photos")
            .createSignedUrl(worker.photo_path, 3600);
          if (data?.signedUrl) {
            urls[worker.id] = data.signedUrl;
          }
        }
      }
      setPhotoUrls(urls);
    };

    fetchPhotoUrls();
  }, [workers]);

  const handleSelectAll = (checked: boolean) => {
    if (!onSelectionChange) return;
    onSelectionChange(checked ? workers.map(w => w.id) : []);
  };

  const handleSelectOne = (workerId: string, checked: boolean) => {
    if (!onSelectionChange) return;
    if (checked) {
      onSelectionChange([...selectedIds, workerId]);
    } else {
      onSelectionChange(selectedIds.filter(id => id !== workerId));
    }
  };

  if (isLoading) {
    return <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>;
  }

  if (workers.length === 0) {
    return <div className="text-center py-8 text-muted-foreground">{t("contractors.workers.noWorkers", "No workers found")}</div>;
  }

  const getStatusBadge = (status: string, isBlacklisted: boolean) => {
    if (isBlacklisted || status === 'revoked') {
      return (
        <Badge variant="destructive" className="gap-1">
          <ShieldAlert className="h-3 w-3" />
          {t(`contractors.workerStatus.revoked`, "Revoked")}
        </Badge>
      );
    }
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      approved: "default", pending: "secondary", rejected: "destructive",
    };
    return <Badge variant={variants[status] || "secondary"}>{t(`contractors.workerStatus.${status}`, status)}</Badge>;
  };

  const getInductionBadge = (status: InductionExpiryStatus, daysRemaining: number | null) => {
    switch (status) {
      case 'expired':
        return <Badge variant="destructive">{t("contractors.induction.expired", "Expired")}</Badge>;
      case 'expiring_soon':
        return (
          <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20">
            {t("contractors.induction.expiresInDays", "Expires in {{days}}d", { days: daysRemaining })}
          </Badge>
        );
      case 'valid':
        return <Badge variant="outline" className="text-green-600 dark:text-green-400 border-green-500/30">{t("contractors.induction.valid", "Valid")}</Badge>;
      case 'not_completed':
        return <Badge variant="secondary">{t("contractors.induction.notCompleted", "Not Completed")}</Badge>;
    }
  };

  const getWorkerTypeBadge = (workerType: string | undefined) => {
    switch (workerType) {
      case 'site_representative':
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border-blue-200 dark:border-blue-800 gap-1">
            <Building className="h-3 w-3" />
            {t("contractors.workers.siteRep", "Site Rep")}
          </Badge>
        );
      case 'safety_officer':
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300 border-green-200 dark:border-green-800 gap-1">
            <ShieldCheck className="h-3 w-3" />
            {t("contractors.workers.safetyOfficer", "Safety Officer")}
          </Badge>
        );
      default:
        return null;
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const allSelected = workers.length > 0 && selectedIds.length === workers.length;
  const someSelected = selectedIds.length > 0 && selectedIds.length < workers.length;

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50px] text-muted-foreground">#</TableHead>
            {showSelection && (
              <TableHead className="w-[50px]">
                <Checkbox
                  checked={allSelected}
                  ref={(el) => {
                    if (el) (el as HTMLButtonElement & { indeterminate: boolean }).indeterminate = someSelected;
                  }}
                  onCheckedChange={handleSelectAll}
                  aria-label={t("contractors.workers.selectAll", "Select all")}
                />
              </TableHead>
            )}
            <TableHead></TableHead>
            <TableHead>{t("contractors.workers.name", "Name")}</TableHead>
            <TableHead>{t("contractors.workers.role", "Role")}</TableHead>
            <TableHead>{t("contractors.workers.nationalId", "National ID")}</TableHead>
            <TableHead>{t("contractors.workers.company", "Company")}</TableHead>
            <TableHead>{t("contractors.workers.nationality", "Nationality")}</TableHead>
            <TableHead>{t("contractors.workers.induction", "Induction")}</TableHead>
            <TableHead>{t("common.status", "Status")}</TableHead>
            <TableHead className="text-end">{t("common.actions", "Actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {workers.map((worker, index) => {
            const isBlacklisted = blacklistedIds.includes(worker.national_id);
            const inductionStatus = getInductionExpiryStatus(worker.latest_induction || null);
            const daysRemaining = getDaysUntilExpiry(worker.latest_induction || null);
            const inductionExpiringSoon = inductionStatus === 'expiring_soon';
            const inductionExpired = inductionStatus === 'expired';
            
            return (
              <TableRow 
                key={worker.id}
                className={cn(
                  isBlacklisted && "bg-destructive/5",
                  inductionExpiringSoon && !isBlacklisted && "bg-amber-50/50 dark:bg-amber-950/20",
                  inductionExpired && !isBlacklisted && "bg-destructive/5"
                )}
              >
                <TableCell className="text-muted-foreground text-sm">{index + 1}</TableCell>
                {showSelection && (
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.includes(worker.id)}
                      onCheckedChange={(checked) => handleSelectOne(worker.id, checked === true)}
                      aria-label={t("contractors.workers.selectWorker", "Select {{name}}", { name: worker.full_name })}
                    />
                  </TableCell>
                )}
                <TableCell>
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={photoUrls[worker.id]} alt={worker.full_name} />
                    <AvatarFallback className="text-xs">{getInitials(worker.full_name)}</AvatarFallback>
                  </Avatar>
                </TableCell>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    {worker.full_name}
                    {isBlacklisted && (
                      <Tooltip>
                        <TooltipTrigger>
                          <ShieldAlert className="h-4 w-4 text-destructive" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="font-medium">{t("contractors.workers.blacklistedWarning", "Blacklisted")}</p>
                          {blacklistReasons[worker.national_id] && (
                            <p className="text-xs">{blacklistReasons[worker.national_id]}</p>
                          )}
                        </TooltipContent>
                      </Tooltip>
                    )}
                    {(inductionExpiringSoon || inductionExpired) && !isBlacklisted && (
                      <Tooltip>
                        <TooltipTrigger>
                          <AlertTriangle className={cn(
                            "h-4 w-4",
                            inductionExpired ? "text-destructive" : "text-amber-500"
                          )} />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="font-medium">
                            {inductionExpired 
                              ? t("contractors.induction.expiredWarning", "Induction Expired")
                              : t("contractors.induction.expiringSoonWarning", "Induction Expiring Soon")
                            }
                          </p>
                          {worker.latest_induction?.expires_at && (
                            <p className="text-xs">
                              {t("contractors.induction.expiryDate", "Expires: {{date}}", { 
                                date: formatDate(worker.latest_induction.expires_at) 
                              })}
                            </p>
                          )}
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {getWorkerTypeBadge(worker.worker_type)}
                </TableCell>
                <TableCell className="font-mono text-sm">{worker.national_id}</TableCell>
                <TableCell>{worker.company?.company_name || "-"}</TableCell>
                <TableCell>{getNationalityLabel(worker.nationality, isRTL ? 'ar' : 'en') || "-"}</TableCell>
                <TableCell>{getInductionBadge(inductionStatus, daysRemaining)}</TableCell>
                <TableCell>{getStatusBadge(worker.approval_status, isBlacklisted)}</TableCell>
                <TableCell>{getStatusBadge(worker.approval_status, isBlacklisted)}</TableCell>
                <TableCell className="text-end">
                  <WorkerActionsDropdown
                    worker={worker}
                    onView={() => setSelectedWorker(worker)}
                    onEdit={() => onEdit(worker)}
                    onStatusChange={(status) => onStatusChange(worker, status)}
                    onAddToBlacklist={() => onAddToBlacklist(worker)}
                    onDelete={() => onDelete(worker)}
                  />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <WorkerDetailDialog
        open={!!selectedWorker}
        onOpenChange={(open) => !open && setSelectedWorker(null)}
        worker={selectedWorker}
      />
    </>
  );
}
