import { useTranslation } from "react-i18next";
import { Shield, AlertTriangle, CheckCircle, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface SafetyOfficerCoverageCardProps {
  total: number;
  ratio: number;
  ratioDisplay: string;
  coveragePercent: number;
  status: "good" | "warning" | "critical";
  workerCount: number;
}

export function SafetyOfficerCoverageCard({
  total,
  ratioDisplay,
  coveragePercent,
  status,
  workerCount,
}: SafetyOfficerCoverageCardProps) {
  const { t } = useTranslation();

  const statusConfig = {
    good: {
      color: "text-success",
      bgColor: "bg-success/10",
      borderColor: "border-success/30",
      progressColor: "bg-success",
      icon: CheckCircle,
      label: t("contractors.dashboard.excellentCoverage", "Excellent Coverage"),
    },
    warning: {
      color: "text-warning",
      bgColor: "bg-warning/10",
      borderColor: "border-warning/30",
      progressColor: "bg-warning",
      icon: TrendingUp,
      label: t("contractors.dashboard.adequateCoverage", "Adequate - Improvement Needed"),
    },
    critical: {
      color: "text-destructive",
      bgColor: "bg-destructive/10",
      borderColor: "border-destructive/30",
      progressColor: "bg-destructive",
      icon: AlertTriangle,
      label: t("contractors.dashboard.criticalCoverage", "Critical - Below Minimum"),
    },
  };

  const config = statusConfig[status];
  const StatusIcon = config.icon;

  const hasNoOfficers = total === 0 && workerCount > 0;

  return (
    <Card className={cn("border-2", config.borderColor)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <div className={cn("p-2 rounded-full", config.bgColor)}>
            <Shield className={cn("h-5 w-5", config.color)} />
          </div>
          {t("contractors.dashboard.safetyOfficerCoverage", "Safety Officer Coverage")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasNoOfficers ? (
          <div className="flex items-center gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/30">
            <AlertTriangle className="h-8 w-8 text-destructive flex-shrink-0" />
            <div>
              <p className="font-semibold text-destructive">
                {t("contractors.dashboard.noSafetyOfficers", "No Safety Officer Assigned")}
              </p>
              <p className="text-sm text-muted-foreground">
                {t("contractors.dashboard.assignOfficerWarning", "{{count}} workers without safety officer coverage", { count: workerCount })}
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Ratio Display */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  {t("contractors.dashboard.safetyOfficerRate", "Safety Officer Rate")}
                </p>
                <p className="text-3xl font-bold">{ratioDisplay}</p>
              </div>
              <div className="text-end">
                <p className="text-sm text-muted-foreground">
                  {t("contractors.dashboard.officers", "Officers")}
                </p>
                <p className="text-2xl font-semibold">{total}</p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {t("contractors.dashboard.coverage", "Coverage")}
                </span>
                <span className={cn("font-medium", config.color)}>
                  {coveragePercent}%
                </span>
              </div>
              <Progress 
                value={coveragePercent} 
                className="h-3"
              />
            </div>

            {/* Status Badge */}
            <div className={cn("flex items-center gap-2 p-3 rounded-lg", config.bgColor)}>
              <StatusIcon className={cn("h-5 w-5", config.color)} />
              <span className={cn("font-medium", config.color)}>
                {config.label}
              </span>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 gap-4 pt-2 border-t">
              <div className="text-center">
                <p className="text-2xl font-bold">{total}</p>
                <p className="text-xs text-muted-foreground">
                  {t("contractors.dashboard.totalOfficers", "Safety Officers")}
                </p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{workerCount}</p>
                <p className="text-xs text-muted-foreground">
                  {t("contractors.dashboard.totalWorkers", "Total Workers")}
                </p>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
