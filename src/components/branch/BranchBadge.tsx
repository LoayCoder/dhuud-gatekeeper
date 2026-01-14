import { useBranch } from "@/contexts/BranchContext";
import { Badge } from "@/components/ui/badge";
import { Building2 } from "lucide-react";

interface BranchBadgeProps {
  branchId?: string | null;
  showIcon?: boolean;
  className?: string;
}

export function BranchBadge({ 
  branchId, 
  showIcon = true,
  className = "" 
}: BranchBadgeProps) {
  const { accessibleBranches, activeBranch } = useBranch();

  // Use provided branchId or fall back to active branch
  const targetBranchId = branchId ?? activeBranch?.id;
  
  if (!targetBranchId) {
    return null;
  }

  const branch = accessibleBranches.find(b => b.id === targetBranchId);
  
  if (!branch) {
    return null;
  }

  return (
    <Badge variant="outline" className={`gap-1 ${className}`}>
      {showIcon && <Building2 className="h-3 w-3" />}
      {branch.name}
    </Badge>
  );
}
