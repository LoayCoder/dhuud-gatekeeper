import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Grid3X3 } from "lucide-react";
import {
  useCrossBranchAnalytics,
  CrossBranchMatrixItem,
} from "@/hooks/use-cross-branch-analytics";
import { cn } from "@/lib/utils";

interface CrossBranchHeatmapProps {
  startDate?: Date;
  endDate?: Date;
  className?: string;
}

export function CrossBranchHeatmap({
  startDate,
  endDate,
  className,
}: CrossBranchHeatmapProps) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar";

  const { data, isLoading } = useCrossBranchAnalytics({
    startDate,
    endDate,
  });

  // Build matrix structure
  const { matrix, branches, maxCount } = useMemo(() => {
    if (!data?.cross_branch_matrix || data.cross_branch_matrix.length === 0) {
      return { matrix: {}, branches: [], maxCount: 0 };
    }

    const branchMap = new Map<string, { id: string; name: string; nameAr: string | null }>();
    const matrixData: Record<string, Record<string, number>> = {};
    let max = 0;

    data.cross_branch_matrix.forEach((item: CrossBranchMatrixItem) => {
      // Track branches
      if (!branchMap.has(item.reporter_branch_id)) {
        branchMap.set(item.reporter_branch_id, {
          id: item.reporter_branch_id,
          name: item.reporter_branch_name,
          nameAr: item.reporter_branch_name_ar,
        });
      }
      if (!branchMap.has(item.location_branch_id)) {
        branchMap.set(item.location_branch_id, {
          id: item.location_branch_id,
          name: item.location_branch_name,
          nameAr: item.location_branch_name_ar,
        });
      }

      // Build matrix
      if (!matrixData[item.reporter_branch_id]) {
        matrixData[item.reporter_branch_id] = {};
      }
      matrixData[item.reporter_branch_id][item.location_branch_id] = item.count;
      max = Math.max(max, item.count);
    });

    return {
      matrix: matrixData,
      branches: Array.from(branchMap.values()),
      maxCount: max,
    };
  }, [data?.cross_branch_matrix]);

  // Get intensity color based on count
  const getIntensity = (count: number, isSameBranch: boolean): string => {
    if (count === 0) return "bg-muted/30";
    
    const intensity = maxCount > 0 ? count / maxCount : 0;
    
    if (isSameBranch) {
      // Diagonal (same branch) - use secondary color
      if (intensity > 0.7) return "bg-secondary/80";
      if (intensity > 0.4) return "bg-secondary/60";
      if (intensity > 0.2) return "bg-secondary/40";
      return "bg-secondary/20";
    } else {
      // Off-diagonal (cross-branch) - use primary color
      if (intensity > 0.7) return "bg-primary/80";
      if (intensity > 0.4) return "bg-primary/60";
      if (intensity > 0.2) return "bg-primary/40";
      return "bg-primary/20";
    }
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (branches.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Grid3X3 className="h-5 w-5 text-primary" />
            {t("hsseDashboard.crossBranchMatrix", "Cross-Branch Matrix")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[200px] text-muted-foreground">
            {t("common.noData", "No data available")}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Grid3X3 className="h-5 w-5 text-primary" />
          {t("hsseDashboard.crossBranchMatrix", "Cross-Branch Matrix")}
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          {t(
            "hsseDashboard.crossBranchMatrixDesc",
            "Rows: Reporter's home branch → Columns: Location where reported"
          )}
        </p>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <TooltipProvider>
          <div className="min-w-fit">
            {/* Header Row */}
            <div className="flex">
              <div className="w-24 shrink-0" /> {/* Empty corner */}
              {branches.map((branch) => (
                <div
                  key={`header-${branch.id}`}
                  className="w-20 shrink-0 px-1 py-2 text-center"
                >
                  <span className="text-xs font-medium text-muted-foreground truncate block" title={isRTL ? branch.nameAr || branch.name : branch.name}>
                    {isRTL ? branch.nameAr || branch.name : branch.name}
                  </span>
                </div>
              ))}
            </div>

            {/* Data Rows */}
            {branches.map((reporterBranch) => (
              <div key={`row-${reporterBranch.id}`} className="flex">
                {/* Row Label */}
                <div className="w-24 shrink-0 px-2 py-2 flex items-center">
                  <span className="text-xs font-medium text-muted-foreground truncate" title={isRTL ? reporterBranch.nameAr || reporterBranch.name : reporterBranch.name}>
                    {isRTL ? reporterBranch.nameAr || reporterBranch.name : reporterBranch.name}
                  </span>
                </div>

                {/* Cells */}
                {branches.map((locationBranch) => {
                  const count = matrix[reporterBranch.id]?.[locationBranch.id] || 0;
                  const isSameBranch = reporterBranch.id === locationBranch.id;

                  return (
                    <Tooltip key={`cell-${reporterBranch.id}-${locationBranch.id}`}>
                      <TooltipTrigger asChild>
                        <div
                          className={cn(
                            "w-20 h-14 shrink-0 m-0.5 rounded flex items-center justify-center cursor-default transition-colors",
                            getIntensity(count, isSameBranch),
                            isSameBranch && "ring-1 ring-inset ring-border"
                          )}
                        >
                          <span className={cn(
                            "text-sm font-semibold",
                            count > 0 ? "text-foreground" : "text-muted-foreground/50"
                          )}>
                            {count}
                          </span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        <div className="text-xs space-y-1">
                          <div>
                            <span className="font-medium">
                              {t("hsseDashboard.reporterBranch", "Reporter")}:
                            </span>{" "}
                            {isRTL ? reporterBranch.nameAr || reporterBranch.name : reporterBranch.name}
                          </div>
                          <div>
                            <span className="font-medium">
                              {t("hsseDashboard.locationBranch", "Location")}:
                            </span>{" "}
                            {isRTL ? locationBranch.nameAr || locationBranch.name : locationBranch.name}
                          </div>
                          <div>
                            <span className="font-medium">
                              {t("common.count", "Count")}:
                            </span>{" "}
                            {count}
                          </div>
                          {isSameBranch && (
                            <div className="text-muted-foreground italic">
                              {t("hsseDashboard.sameBranchReporting", "Same-branch reporting")}
                            </div>
                          )}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            ))}
          </div>
        </TooltipProvider>

        {/* Legend */}
        <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-secondary/60" />
            <span className="text-xs text-muted-foreground">
              {t("hsseDashboard.sameBranch", "Same Branch")}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-primary/60" />
            <span className="text-xs text-muted-foreground">
              {t("hsseDashboard.crossBranch", "Cross-Branch")}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
