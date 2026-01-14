import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { GitBranch, ArrowRightLeft, Building2, TrendingUp } from "lucide-react";
import { useCrossBranchAnalytics, CrossBranchMatrixItem } from "@/hooks/use-cross-branch-analytics";
import { useMemo } from "react";
import { cn } from "@/lib/utils";

interface CrossBranchSummaryCardProps {
  startDate?: Date;
  endDate?: Date;
  className?: string;
}

export function CrossBranchSummaryCard({
  startDate,
  endDate,
  className,
}: CrossBranchSummaryCardProps) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar";

  const { data, isLoading } = useCrossBranchAnalytics({
    startDate,
    endDate,
  });

  // Get top 3 cross-branch corridors
  const topCorridors = useMemo(() => {
    if (!data?.cross_branch_matrix) return [];
    
    return data.cross_branch_matrix
      .filter((item: CrossBranchMatrixItem) => item.is_cross_branch)
      .sort((a: CrossBranchMatrixItem, b: CrossBranchMatrixItem) => b.count - a.count)
      .slice(0, 3);
  }, [data?.cross_branch_matrix]);

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  const { summary } = data || {};
  const crossBranchPct = summary?.cross_branch_percentage ?? 0;

  return (
    <Card className={cn("h-full", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <GitBranch className="h-5 w-5 text-primary" />
          {t("hsseDashboard.crossBranchSummary", "Cross-Branch Summary")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-muted/50 p-3 text-center">
            <div className="text-2xl font-bold text-foreground">
              {summary?.total_observations ?? 0}
            </div>
            <div className="text-xs text-muted-foreground">
              {t("hsseDashboard.totalObservations", "Total Observations")}
            </div>
          </div>
          <div className="rounded-lg bg-primary/10 p-3 text-center">
            <div className="text-2xl font-bold text-primary">
              {crossBranchPct}%
            </div>
            <div className="text-xs text-muted-foreground">
              {t("hsseDashboard.crossBranchPercentage", "Cross-Branch %")}
            </div>
          </div>
        </div>

        {/* Cross vs Same Branch */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <span>{t("hsseDashboard.sameBranch", "Same Branch")}</span>
          </div>
          <Badge variant="secondary">
            {summary?.same_branch_count ?? 0}
          </Badge>
        </div>
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="h-4 w-4 text-primary" />
            <span>{t("hsseDashboard.crossBranch", "Cross-Branch")}</span>
          </div>
          <Badge variant="default">
            {summary?.cross_branch_count ?? 0}
          </Badge>
        </div>

        {/* Top Corridors */}
        {topCorridors.length > 0 && (
          <div className="pt-2 border-t">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">
                {t("hsseDashboard.topCorridors", "Top Cross-Branch Corridors")}
              </span>
            </div>
            <div className="space-y-1.5">
              {topCorridors.map((corridor: CrossBranchMatrixItem, idx: number) => (
                <div
                  key={`${corridor.reporter_branch_id}-${corridor.location_branch_id}`}
                  className="flex items-center justify-between text-xs"
                >
                  <span className="truncate flex-1">
                    {isRTL
                      ? `${corridor.location_branch_name_ar || corridor.location_branch_name} ← ${corridor.reporter_branch_name_ar || corridor.reporter_branch_name}`
                      : `${corridor.reporter_branch_name} → ${corridor.location_branch_name}`}
                  </span>
                  <Badge variant="outline" className="ms-2 text-xs">
                    {corridor.count}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
