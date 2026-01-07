import { useTranslation } from "react-i18next";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { 
  MoreHorizontal, 
  Eye, 
  Pencil, 
  ShieldBan, 
  Trash2, 
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  Ban,
  ShieldOff
} from "lucide-react";
import { ContractorWorker } from "@/hooks/contractor-management/use-contractor-workers";

export interface WorkerActionsPermissions {
  canEdit?: boolean;
  canChangeStatus?: boolean;
  canBlacklist?: boolean;
  canDelete?: boolean;
}

interface WorkerActionsDropdownProps {
  worker: ContractorWorker;
  onView: () => void;
  onEdit: () => void;
  onStatusChange: (status: string) => void;
  onAddToBlacklist: () => void;
  onDelete: () => void;
  permissions?: WorkerActionsPermissions;
}

const STATUS_OPTIONS = [
  { value: "pending", icon: Clock, labelKey: "contractors.workerStatus.pending" },
  { value: "approved", icon: CheckCircle, labelKey: "contractors.workerStatus.approved" },
  { value: "rejected", icon: XCircle, labelKey: "contractors.workerStatus.rejected" },
  { value: "suspended", icon: Ban, labelKey: "contractors.workerStatus.suspended" },
  { value: "revoked", icon: ShieldOff, labelKey: "contractors.workerStatus.revoked" },
];

export function WorkerActionsDropdown({
  worker,
  onView,
  onEdit,
  onStatusChange,
  onAddToBlacklist,
  onDelete,
  permissions = {
    canEdit: true,
    canChangeStatus: true,
    canBlacklist: true,
    canDelete: true,
  },
}: WorkerActionsDropdownProps) {
  const { t } = useTranslation();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">{t("common.actions", "Actions")}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={onView}>
          <Eye className="h-4 w-4 me-2" />
          {t("common.view", "View Details")}
        </DropdownMenuItem>
        
        {permissions.canEdit && (
          <DropdownMenuItem onClick={onEdit}>
            <Pencil className="h-4 w-4 me-2" />
            {t("common.edit", "Edit")}
          </DropdownMenuItem>
        )}
        
        {permissions.canChangeStatus && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <RefreshCw className="h-4 w-4 me-2" />
                {t("contractors.workers.changeStatus", "Change Status")}
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {STATUS_OPTIONS.map((option) => {
                  const Icon = option.icon;
                  const isCurrentStatus = worker.approval_status === option.value;
                  return (
                    <DropdownMenuItem
                      key={option.value}
                      onClick={() => onStatusChange(option.value)}
                      disabled={isCurrentStatus}
                      className={isCurrentStatus ? "opacity-50" : ""}
                    >
                      <Icon className="h-4 w-4 me-2" />
                      {t(option.labelKey, option.value)}
                      {isCurrentStatus && (
                        <span className="ms-auto text-xs text-muted-foreground">
                          {t("common.current", "(current)")}
                        </span>
                      )}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </>
        )}
        
        {permissions.canBlacklist && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onAddToBlacklist}>
              <ShieldBan className="h-4 w-4 me-2" />
              {t("contractors.workers.addToBlacklist", "Add to Blacklist")}
            </DropdownMenuItem>
          </>
        )}
        
        {permissions.canDelete && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={onDelete}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4 me-2" />
              {t("common.delete", "Delete")}
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
