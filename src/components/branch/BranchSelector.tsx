import { useBranch } from "@/contexts/BranchContext";
import { useTranslation } from "react-i18next";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Building2, Globe } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

interface BranchSelectorProps {
  showLabel?: boolean;
  className?: string;
  compact?: boolean;
}

export function BranchSelector({ 
  showLabel = true, 
  className = "",
  compact = false 
}: BranchSelectorProps) {
  const { t } = useTranslation();
  const { 
    activeBranch, 
    setActiveBranch, 
    accessibleBranches, 
    isMultiBranchUser,
    hasFullBranchAccess,
    isLoading 
  } = useBranch();

  // Don't render if user only has access to one branch
  if (!isMultiBranchUser && !isLoading) {
    return null;
  }

  if (isLoading) {
    return <Skeleton className={`h-10 ${compact ? 'w-32' : 'w-48'}`} />;
  }

  // Special value for "All Branches" option
  const ALL_BRANCHES_VALUE = "__all_branches__";
  
  // Determine current value: null activeBranch = all branches
  const currentValue = activeBranch?.id || (hasFullBranchAccess ? ALL_BRANCHES_VALUE : "");

  const handleValueChange = (value: string) => {
    if (value === ALL_BRANCHES_VALUE) {
      setActiveBranch(null);
    } else {
      const branch = accessibleBranches.find(b => b.id === value);
      if (branch) {
        setActiveBranch(branch);
      }
    }
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {showLabel && (
        <span className="text-sm text-muted-foreground whitespace-nowrap">
          {t("common.branch", "Branch")}:
        </span>
      )}
      <Select
        value={currentValue}
        onValueChange={handleValueChange}
      >
        <SelectTrigger className={compact ? "w-32" : "w-48"}>
          <div className="flex items-center gap-2">
            {activeBranch === null ? (
              <Globe className="h-4 w-4 text-primary" />
            ) : (
              <Building2 className="h-4 w-4 text-muted-foreground" />
            )}
            <SelectValue placeholder={t("common.selectBranch", "Select Branch")}>
              {activeBranch?.name || (hasFullBranchAccess ? t("common.allBranches", "All Branches") : t("common.selectBranch", "Select Branch"))}
            </SelectValue>
          </div>
        </SelectTrigger>
        <SelectContent>
          {/* All Branches option - only for users with full branch access */}
          {hasFullBranchAccess && (
            <>
              <SelectItem value={ALL_BRANCHES_VALUE}>
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-primary" />
                  <span>{t("common.allBranches", "All Branches")}</span>
                </div>
              </SelectItem>
              <Separator className="my-1" />
            </>
          )}
          
          {/* Individual branches */}
          {accessibleBranches.map((branch) => (
            <SelectItem key={branch.id} value={branch.id}>
              {branch.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
