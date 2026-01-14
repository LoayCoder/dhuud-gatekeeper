import { useBranch } from "@/contexts/BranchContext";
import { useTranslation } from "react-i18next";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Building2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

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
    isLoading 
  } = useBranch();

  // Don't render if user only has access to one branch
  if (!isMultiBranchUser && !isLoading) {
    return null;
  }

  if (isLoading) {
    return <Skeleton className={`h-10 ${compact ? 'w-32' : 'w-48'}`} />;
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {showLabel && (
        <span className="text-sm text-muted-foreground whitespace-nowrap">
          {t("common.branch", "Branch")}:
        </span>
      )}
      <Select
        value={activeBranch?.id || ""}
        onValueChange={(value) => {
          const branch = accessibleBranches.find(b => b.id === value);
          if (branch) {
            setActiveBranch(branch);
          }
        }}
      >
        <SelectTrigger className={compact ? "w-32" : "w-48"}>
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <SelectValue placeholder={t("common.selectBranch", "Select Branch")}>
              {activeBranch?.name || t("common.selectBranch", "Select Branch")}
            </SelectValue>
          </div>
        </SelectTrigger>
        <SelectContent>
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
