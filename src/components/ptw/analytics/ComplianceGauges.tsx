import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import { ComplianceMetrics } from "@/hooks/ptw/use-ptw-analytics";
import { CheckCircle2, Clock, RefreshCw, AlertTriangle } from "lucide-react";

interface ComplianceGaugesProps {
  data: ComplianceMetrics;
  isLoading?: boolean;
}

export function ComplianceGauges({ data, isLoading }: ComplianceGaugesProps) {
  const { t } = useTranslation();

  const gauges = [
    {
      label: t("ptw.analytics.completionRate", "Completion Rate"),
      value: data.completionRate,
      icon: CheckCircle2,
      description: t("ptw.analytics.completionDesc", "Closed permits vs total"),
      color: data.completionRate >= 70 ? "bg-green-500" : data.completionRate >= 40 ? "bg-yellow-500" : "bg-red-500",
    },
    {
      label: t("ptw.analytics.onTimeRate", "On-Time Closure"),
      value: data.onTimeRate,
      icon: Clock,
      description: t("ptw.analytics.onTimeDesc", "Closed before planned end"),
      color: data.onTimeRate >= 80 ? "bg-green-500" : data.onTimeRate >= 50 ? "bg-yellow-500" : "bg-red-500",
    },
    {
      label: t("ptw.analytics.extensionRate", "Extension Rate"),
      value: data.extensionRate,
      icon: RefreshCw,
      description: t("ptw.analytics.extensionDesc", "Permits requiring extension"),
      color: data.extensionRate <= 10 ? "bg-green-500" : data.extensionRate <= 25 ? "bg-yellow-500" : "bg-red-500",
    },
    {
      label: t("ptw.analytics.simopsRate", "SIMOPS Conflicts"),
      value: data.simopsConflictRate,
      icon: AlertTriangle,
      description: t("ptw.analytics.simopsDesc", "Permits with SIMOPS issues"),
      color: data.simopsConflictRate <= 5 ? "bg-green-500" : data.simopsConflictRate <= 15 ? "bg-yellow-500" : "bg-red-500",
    },
  ];

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-60" />
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("ptw.analytics.complianceMetrics", "Compliance Metrics")}</CardTitle>
        <CardDescription>
          {t("ptw.analytics.complianceDesc", "Key performance indicators for permit compliance")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {gauges.map((gauge) => (
            <div key={gauge.label} className="space-y-3">
              <div className="flex items-center gap-2">
                <gauge.icon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{gauge.label}</span>
              </div>
              <div className="space-y-1">
                <div className="flex items-end justify-between">
                  <span className="text-3xl font-bold">{gauge.value}%</span>
                </div>
                <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
                  <div
                    className={`h-full transition-all ${gauge.color}`}
                    style={{ width: `${gauge.value}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">{gauge.description}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
