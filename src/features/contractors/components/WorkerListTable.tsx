import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { ShieldAlert, AlertTriangle, Building, ShieldCheck, HardHat, Clock, Camera, ChevronDown, ChevronUp, User } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { ContractorWorker } from "@/features/contractors/hooks/use-contractor-workers";
import { WorkerDetailDialog } from "./WorkerDetailDialog";
import { WorkerActionsDropdown, WorkerActionsPermissions } from "./WorkerActionsDropdown";
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
  workers: (ContractorWorker & { edit_pending_approval?: boolean })[];
  isLoading: boolean;
  onEdit: (worker: ContractorWorker) => void;
  onStatusChange: (worker: ContractorWorker, status: string) => void;
  onAddToBlacklist: (worker: ContractorWorker) => void;
  onDelete: (worker: ContractorWorker) => void;
  onApproveEdits?: (worker: ContractorWorker) => void;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
  showSelection?: boolean;
  blacklistedIds?: string[];
  blacklistReasons?: Record<string, string>;
  permissions?: WorkerActionsPermissions;
}

export function WorkerListTable({ 
  workers, 
  isLoading, 
  onEdit,
  onStatusChange,
  onAddToBlacklist,
  onDelete,
  onApproveEdits,
  selectedIds = [],
  onSelectionChange,
  showSelection = false,
  blacklistedIds = [],
  blacklistReasons = {},
  permissions,
}: WorkerListTableProps) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';
  const [selectedWorker, setSelectedWorker] = useState<ContractorWorker | null>(null);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

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

  const toggleCard = (workerId: string) => {
    setExpandedCards(prev => {
      const next = new Set(prev);
      if (next.has(workerId)) next.delete(workerId);
      else next.add(workerId);
      return next;
    });
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

  // Shared helper to check warnings
  const getWorkerWarnings = (worker: ContractorWorker) => {
    const isBlacklisted = blacklistedIds.includes(worker.national_id);
    const inductionStatus = getInductionExpiryStatus(worker.latest_induction || null);
    const daysRemaining = getDaysUntilExpiry(worker.latest_induction || null);
    const needsPhoto = !isBlacklisted && (worker.approval_status === 'approved' || (worker as any).security_approval_status === 'approved') && !worker.photo_path;
    return { isBlacklisted, inductionStatus, daysRemaining, needsPhoto };
  };

  // ─── Mobile Card Layout ───
  const renderMobileCards = () => (
    <div className="space-y-3 md:hidden">
      {showSelection && (
        <div className="flex items-center gap-2 px-1 pb-1">
          <Checkbox
            checked={allSelected}
            ref={(el) => {
              if (el) (el as HTMLButtonElement & { indeterminate: boolean }).indeterminate = someSelected;
            }}
            onCheckedChange={handleSelectAll}
            aria-label={t("contractors.workers.selectAll", "Select all")}
          />
          <span className="text-sm text-muted-foreground">{t("contractors.workers.selectAll", "Select all")}</span>
        </div>
      )}
      {workers.map((worker, index) => {
        const { isBlacklisted, inductionStatus, daysRemaining, needsPhoto } = getWorkerWarnings(worker);
        const isExpanded = expandedCards.has(worker.id);

        return (
          <Collapsible key={worker.id} open={isExpanded} onOpenChange={() => toggleCard(worker.id)}>
            <div
              className={cn(
                "border rounded-lg bg-card overflow-hidden",
                isBlacklisted && "border-destructive/40 bg-destructive/5",
                inductionStatus === 'expiring_soon' && !isBlacklisted && "border-amber-400/40",
                inductionStatus === 'expired' && !isBlacklisted && "border-destructive/30"
              )}
            >
              {/* Card Header - always visible */}
              <div className="flex items-center gap-3 p-3">
                {showSelection && (
                  <Checkbox
                    checked={selectedIds.includes(worker.id)}
                    onCheckedChange={(checked) => handleSelectOne(worker.id, checked === true)}
                    aria-label={t("contractors.workers.selectWorker", "Select {{name}}", { name: worker.full_name })}
                  />
                )}
                <Avatar className="h-10 w-10 shrink-0">
                  <AvatarImage src={photoUrls[worker.id]} alt={worker.full_name} />
                  <AvatarFallback className="text-xs">{getInitials(worker.full_name)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-medium text-sm truncate">{worker.full_name}</span>
                    {isBlacklisted && <ShieldAlert className="h-3.5 w-3.5 text-destructive shrink-0" />}
                    {needsPhoto && <Camera className="h-3.5 w-3.5 text-amber-500 shrink-0" />}
                  </div>
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    {getStatusBadge(worker.approval_status, isBlacklisted)}
                    {worker.edit_pending_approval && worker.approval_status === 'approved' && (
                      <Badge variant="outline" className="border-amber-500 text-amber-600 dark:text-amber-400 gap-1 text-xs">
                        <Clock className="h-3 w-3" />
                      </Badge>
                    )}
                    {getWorkerTypeBadge(worker.worker_type)}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <WorkerActionsDropdown
                    worker={worker}
                    onView={() => setSelectedWorker(worker)}
                    onEdit={() => onEdit(worker)}
                    onStatusChange={(status) => onStatusChange(worker, status)}
                    onAddToBlacklist={() => onAddToBlacklist(worker)}
                    onDelete={() => onDelete(worker)}
                    onApproveEdits={onApproveEdits ? () => onApproveEdits(worker) : undefined}
                    permissions={permissions}
                  />
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                  </CollapsibleTrigger>
                </div>
              </div>

              {/* Expanded details */}
              <CollapsibleContent>
                <div className="border-t px-3 py-2.5 space-y-2 bg-muted/30">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <div>
                      <span className="text-muted-foreground text-xs">{t("contractors.workers.company", "Company")}</span>
                      <p className="font-medium truncate">{worker.company?.company_name || "-"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">{t("contractors.workers.nationalId", "National ID")}</span>
                      <p className="font-mono">{worker.national_id}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">{t("contractors.workers.nationality", "Nationality")}</span>
                      <p>{getNationalityLabel(worker.nationality, isRTL ? 'ar' : 'en') || "-"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">{t("contractors.workers.induction", "Induction")}</span>
                      <div className="mt-0.5">{getInductionBadge(inductionStatus, daysRemaining)}</div>
                    </div>
                  </div>
                  {isBlacklisted && blacklistReasons[worker.national_id] && (
                    <div className="text-xs text-destructive bg-destructive/10 rounded px-2 py-1">
                      {t("contractors.workers.blacklistReason", "Blacklist reason")}: {blacklistReasons[worker.national_id]}
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        );
      })}
    </div>
  );

  // ─── Desktop Table Layout ───
  const renderDesktopTable = () => (
    <div className="hidden md:block">
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
            const { isBlacklisted, inductionStatus, daysRemaining, needsPhoto } = getWorkerWarnings(worker);
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
                    {needsPhoto && (
                      <Tooltip>
                        <TooltipTrigger>
                          <Camera className="h-4 w-4 text-amber-500" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="font-medium">{t("contractors.workers.photoMissing", "Photo Required")}</p>
                          <p className="text-xs">{t("contractors.workers.photoMissingDesc", "Worker needs a photo before induction")}</p>
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
                <TableCell>
                  <div className="flex items-center gap-1">
                    {getStatusBadge(worker.approval_status, isBlacklisted)}
                    {worker.edit_pending_approval && worker.approval_status === 'approved' && (
                      <Tooltip>
                        <TooltipTrigger>
                          <Badge variant="outline" className="border-amber-500 text-amber-600 dark:text-amber-400 gap-1 text-xs">
                            <Clock className="h-3 w-3" />
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          {t("contractors.workers.editsPending", "Edits pending review")}
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-end">
                  <WorkerActionsDropdown
                    worker={worker}
                    onView={() => setSelectedWorker(worker)}
                    onEdit={() => onEdit(worker)}
                    onStatusChange={(status) => onStatusChange(worker, status)}
                    onAddToBlacklist={() => onAddToBlacklist(worker)}
                    onDelete={() => onDelete(worker)}
                    onApproveEdits={onApproveEdits ? () => onApproveEdits(worker) : undefined}
                    permissions={permissions}
                  />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <>
      {renderMobileCards()}
      {renderDesktopTable()}

      <WorkerDetailDialog
        open={!!selectedWorker}
        onOpenChange={(open) => !open && setSelectedWorker(null)}
        worker={selectedWorker}
      />
    </>
  );
}
