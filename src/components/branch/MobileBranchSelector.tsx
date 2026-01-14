import { useBranch } from "@/contexts/BranchContext";
import { useTranslation } from "react-i18next";
import { Building2, ChevronDown, Check, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface MobileBranchSelectorProps {
  className?: string;
}

export function MobileBranchSelector({ className = "" }: MobileBranchSelectorProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
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
    return <Skeleton className={cn("h-9 w-9 rounded-md", className)} />;
  }

  const handleSelectBranch = (branch: typeof activeBranch) => {
    setActiveBranch(branch);
    setOpen(false);
  };

  const handleSelectAllBranches = () => {
    setActiveBranch(null);
    setOpen(false);
  };

  // Check if "All Branches" is selected (activeBranch is null)
  const isAllBranchesSelected = activeBranch === null;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-9 w-9 shrink-0 relative",
            isAllBranchesSelected && "text-primary",
            className
          )}
          aria-label={t("common.selectBranch", "Select Branch")}
        >
          {isAllBranchesSelected ? (
            <Globe className="h-5 w-5" />
          ) : (
            <Building2 className="h-5 w-5" />
          )}
          <ChevronDown className="h-3 w-3 absolute -bottom-0.5 -end-0.5 text-muted-foreground" />
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[60vh] rounded-t-xl">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-2 text-start">
            <Building2 className="h-5 w-5 text-muted-foreground" />
            {t("common.selectBranch", "Select Branch")}
          </SheetTitle>
        </SheetHeader>
        
        <ScrollArea className="h-[calc(60vh-6rem)] pe-4">
          <div className="space-y-1">
            {/* All Branches option - only for users with full branch access */}
            {hasFullBranchAccess && (
              <>
                <button
                  onClick={handleSelectAllBranches}
                  className={cn(
                    "w-full flex items-center justify-between gap-3 p-3 rounded-lg text-start transition-colors",
                    isAllBranchesSelected
                      ? "bg-primary/10 text-primary border border-primary/20"
                      : "hover:bg-muted/50 border border-transparent"
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={cn(
                      "h-10 w-10 rounded-full flex items-center justify-center shrink-0",
                      isAllBranchesSelected ? "bg-primary/20" : "bg-muted"
                    )}>
                      <Globe className={cn(
                        "h-5 w-5",
                        isAllBranchesSelected ? "text-primary" : "text-muted-foreground"
                      )} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate">
                        {t("common.allBranches", "All Branches")}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">
                        {t("common.viewAllBranchesData", "View data from all branches")}
                      </p>
                    </div>
                  </div>
                  {isAllBranchesSelected && (
                    <Check className="h-5 w-5 text-primary shrink-0" />
                  )}
                </button>
                
                {/* Divider */}
                <div className="h-px bg-border my-2" />
              </>
            )}
            
            {/* Individual branches */}
            {accessibleBranches.map((branch) => {
              const isSelected = activeBranch?.id === branch.id;
              return (
                <button
                  key={branch.id}
                  onClick={() => handleSelectBranch(branch)}
                  className={cn(
                    "w-full flex items-center justify-between gap-3 p-3 rounded-lg text-start transition-colors",
                    isSelected
                      ? "bg-primary/10 text-primary border border-primary/20"
                      : "hover:bg-muted/50 border border-transparent"
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={cn(
                      "h-10 w-10 rounded-full flex items-center justify-center shrink-0",
                      isSelected ? "bg-primary/20" : "bg-muted"
                    )}>
                      <Building2 className={cn(
                        "h-5 w-5",
                        isSelected ? "text-primary" : "text-muted-foreground"
                      )} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{branch.name}</p>
                      {branch.location && (
                        <p className="text-sm text-muted-foreground truncate">
                          {branch.location}
                        </p>
                      )}
                    </div>
                  </div>
                  {isSelected && (
                    <Check className="h-5 w-5 text-primary shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
